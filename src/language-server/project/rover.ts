import { ProjectStats } from "src/messages";
import { DocumentUri, GraphQLProject } from "./base";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  CancellationToken,
  SymbolInformation,
  InitializeRequest,
  StreamMessageReader,
  StreamMessageWriter,
  createProtocolConnection,
  ProtocolConnection,
  ClientCapabilities,
  ProtocolRequestType,
  CompletionRequest,
  DidChangeTextDocumentNotification,
  ProtocolNotificationType,
  DidChangeWatchedFilesNotification,
  DidOpenTextDocumentNotification,
  DidCloseTextDocumentNotification,
  HoverRequest,
  CancellationTokenSource,
} from "vscode-languageserver/node";
import cp from "node:child_process";
import { GraphQLProjectConfig } from "./base";
import { ApolloConfig, RoverConfig } from "../config";

export function isRoverConfig(config: ApolloConfig): config is RoverConfig {
  return config instanceof RoverConfig;
}

class DocumentSynchronization {
  private pendingDocumentChanges = new Map<DocumentUri, TextDocument>();

  constructor(
    private sendNotification: <P, RO>(
      type: ProtocolNotificationType<P, RO>,
      params?: P,
    ) => Promise<void>,
  ) {}

  private documentSynchronizationScheduled = false;
  /**
   * Ensures that only one `syncNextDocumentChange` is queued with the connection at a time.
   * As a result, other, more important, changes can be processed with higher priority.
   */
  private scheduleDocumentSync = async () => {
    if (
      this.pendingDocumentChanges.size === 0 ||
      this.documentSynchronizationScheduled
    ) {
      return;
    }

    this.documentSynchronizationScheduled = true;
    try {
      const next = this.pendingDocumentChanges.values().next();
      if (next.done) return;
      await this.sendDocumentChanges(next.value);
    } finally {
      this.documentSynchronizationScheduled = false;
      setImmediate(this.scheduleDocumentSync);
    }
  };

  private sendDocumentChanges(document: TextDocument) {
    this.pendingDocumentChanges.delete(document.uri);
    return this.sendNotification(DidChangeTextDocumentNotification.type, {
      textDocument: {
        uri: document.uri,
        version: document.version,
      },
      contentChanges: [
        {
          text: document.getText(),
        },
      ],
    });
  }

  async documentDidChange(document: TextDocument) {
    if (this.pendingDocumentChanges.has(document.uri)) {
      // this will put the document at the end of the queue again
      // in hopes that we can skip a bit of unnecessary work sometimes
      // when many files change around a lot
      // we will always ensure that a document is synchronized via `synchronizedWithDocument`
      // before we do other operations on the document, so this is safe
      this.pendingDocumentChanges.delete(document.uri);
    }
    this.pendingDocumentChanges.set(document.uri, document);
    this.scheduleDocumentSync();
  }

  async synchronizedWithDocument(documentUri: DocumentUri): Promise<void> {
    const document = this.pendingDocumentChanges.get(documentUri);
    if (document) {
      await this.sendDocumentChanges(document);
    }
  }
}

export interface RoverProjectConfig extends GraphQLProjectConfig {
  config: RoverConfig;
  capabilities: ClientCapabilities;
}

export class RoverProject extends GraphQLProject {
  config: RoverConfig;
  _connection?: Promise<ProtocolConnection>;
  capabilities: ClientCapabilities;
  get displayName(): string {
    return "Rover Project";
  }
  private documents = new DocumentSynchronization(
    this.sendNotification.bind(this),
  );

  constructor(options: RoverProjectConfig) {
    super(options);
    this.config = options.config;
    this.capabilities = options.capabilities;
  }

  initialize() {
    return [this.connection.then(() => {})];
  }

  get connection(): Promise<ProtocolConnection> {
    if (this._connection instanceof Promise) {
      return this._connection;
    }
    return (this._connection = this.initializeConnection());
  }

  private async sendNotification<P, RO>(
    type: ProtocolNotificationType<P, RO>,
    params?: P,
  ): Promise<void> {
    const connection = await this.connection;
    console.log("sending notification", { type, params });
    return connection.sendNotification(type, params);
  }

  private async sendRequest<P, R, PR, E, RO>(
    type: ProtocolRequestType<P, R, PR, E, RO>,
    params: P,
    token?: CancellationToken,
  ): Promise<R> {
    const connection = await this.connection;
    console.log("sending request", { type, params });
    return connection
      .sendRequest(type, params, token)
      .then((result) => {
        console.log({ result });
        return result;
      })
      .catch((error) => {
        console.error({ error });
        throw error;
      });
  }

  initializeConnection() {
    const child = cp.spawn(this.config.rover.bin, ["lsp"], {
      env: { RUST_BACKTRACE: "1" },
    });
    const reader = new StreamMessageReader(child.stdout);
    const writer = new StreamMessageWriter(child.stdin);
    child.stderr.on("data", (data) => {
      console.info("stderr", data.toString());
    });
    const connection = createProtocolConnection(reader, writer);
    connection.onClose(() => {
      console.log("Connection closed");
      source.cancel();
      this._connection = undefined;
    });

    connection.onError((err) => {
      console.error({ err });
    });

    connection.listen();
    console.log("Initializing connection");

    const source = new CancellationTokenSource();
    return connection
      .sendRequest(
        InitializeRequest.type,
        {
          capabilities: this.capabilities,
          processId: process.pid,
          rootUri: this.rootURI.toString(),
        },
        source.token,
      )
      .then(
        (status) => {
          console.log("Connection initialized", status);
          return connection;
        },
        (error) => {
          console.error("Connection failed to initialize", error);
          throw error;
        },
      );
  }

  getProjectStats(): ProjectStats {
    return { type: "Rover", loaded: true };
  }

  includesFile(uri: DocumentUri) {
    return uri.startsWith(this.rootURI.toString());
  }

  validate?: () => void;

  onDidChangeWatchedFiles: GraphQLProject["onDidChangeWatchedFiles"] = (
    params,
  ) => {
    return this.sendNotification(
      DidChangeWatchedFilesNotification.type,
      params,
    );
  };

  onDidOpenTextDocument: GraphQLProject["onDidOpenTextDocument"] = (params) =>
    this.sendNotification(DidOpenTextDocumentNotification.type, params);
  onDidCloseTextDocument: GraphQLProject["onDidCloseTextDocument"] = (params) =>
    this.sendNotification(DidCloseTextDocumentNotification.type, params);
  async documentDidChange(document: TextDocument) {
    return this.documents.documentDidChange(document);
  }

  // TODO: diagnostics handling in general
  clearAllDiagnostics() {}

  onCompletion: GraphQLProject["onCompletion"] = async (params, token) =>
    this.documents
      .synchronizedWithDocument(params.textDocument.uri)
      .then(() => this.sendRequest(CompletionRequest.type, params, token));

  onHover: GraphQLProject["onHover"] = async (params, token) =>
    this.documents
      .synchronizedWithDocument(params.textDocument.uri)
      .then(() => this.sendRequest(HoverRequest.type, params, token));

  // these are not supported yet
  onDefinition: GraphQLProject["onDefinition"];
  onReferences: GraphQLProject["onReferences"];
  onDocumentSymbol: GraphQLProject["onDocumentSymbol"];
  onCodeLens: GraphQLProject["onCodeLens"];
  onCodeAction: GraphQLProject["onCodeAction"];

  provideSymbol?(
    query: string,
    token: CancellationToken,
  ): Promise<SymbolInformation[]>;
}

/*
Connection initialized {
  capabilities: {
    textDocumentSync: { openClose: true, change: 1 },
    hoverProvider: true,
    completionProvider: { triggerCharacters: [Array] },
    semanticTokensProvider: { legend: [Object], range: false, full: [Object] }
  }
}
 */
