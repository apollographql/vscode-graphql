import { ProjectStats } from "src/messages";
import { DocumentUri, GraphQLProject } from "../base";
import { TextDocument } from "vscode-languageserver-textdocument";
import { generateKeyBetween } from "fractional-indexing";
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
  ProtocolNotificationType,
  DidChangeWatchedFilesNotification,
  HoverRequest,
  CancellationTokenSource,
} from "vscode-languageserver/node";
import cp from "node:child_process";
import { GraphQLProjectConfig } from "../base";
import { ApolloConfig, RoverConfig } from "../../config";
import { DocumentSynchronization } from "./DocumentSynchronization";

export function isRoverConfig(config: ApolloConfig): config is RoverConfig {
  return config instanceof RoverConfig;
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
    console.log("onDidChangeWatchedFiles", params);
    return this.sendNotification(
      DidChangeWatchedFilesNotification.type,
      params,
    );
  };

  onDidOpenTextDocument: GraphQLProject["onDidOpenTextDocument"] = (params) =>
    this.documents.onDidOpenTextDocument(params);
  onDidCloseTextDocument: GraphQLProject["onDidCloseTextDocument"] = (params) =>
    this.documents.onDidCloseTextDocument(params);
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
