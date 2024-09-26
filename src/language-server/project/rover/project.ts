import { ProjectStats } from "src/messages";
import { DocumentUri, GraphQLProject } from "../base";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  CancellationToken,
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
  PublishDiagnosticsNotification,
  ConnectionError,
  ConnectionErrors,
  SemanticTokensRequest,
  ProtocolRequestType0,
  ServerCapabilities,
  SemanticTokensRegistrationType,
  SemanticTokensOptions,
  SemanticTokensRegistrationOptions,
  DefinitionRequest,
} from "vscode-languageserver/node";
import cp from "node:child_process";
import { GraphQLProjectConfig } from "../base";
import { ApolloConfig, RoverConfig } from "../../config";
import { DocumentSynchronization } from "./DocumentSynchronization";
import { AsyncLocalStorage } from "node:async_hooks";
import internal from "node:stream";
import { VSCodeConnection } from "../../server";
import { getLanguageIdForExtension } from "../../utilities/languageIdForExtension";
import { extname } from "node:path";
import type { FileExtension } from "../../../tools/utilities/languageInformation";
import { Debug } from "../../utilities";
import { TraceLevel } from "src/language-server/utilities/debug";

export function isRoverConfig(config: ApolloConfig): config is RoverConfig {
  return config instanceof RoverConfig;
}

export interface RoverProjectConfig extends GraphQLProjectConfig {
  config: RoverConfig;
  capabilities: ClientCapabilities;
}

const supportedLanguageIds = (
  process.env.APOLLO_ROVER_LANGUAGE_IDS || "graphql"
).split(",");

export class RoverProject extends GraphQLProject {
  config: RoverConfig;
  /**
   * Allows overriding the connection for a certain async code path, so inside of initialization,
   * calls to `this.connection` can immediately resolve without having to wait for initialization
   * to complete (like every other call to `this.connection` would).
   */
  private connectionStorage = new AsyncLocalStorage<ProtocolConnection>();
  private _connection?: Promise<ProtocolConnection>;
  private child:
    | cp.ChildProcessByStdio<internal.Writable, internal.Readable, null>
    | undefined;
  private disposed = false;
  readonly capabilities: ClientCapabilities;
  roverCapabilities?: ServerCapabilities;
  get displayName(): string {
    return "Rover Project";
  }
  private documents = new DocumentSynchronization(
    this.sendNotification.bind(this),
    this.sendRequest.bind(this),
    (diagnostics) => this._onDiagnostics?.(diagnostics),
  );

  constructor(options: RoverProjectConfig) {
    super(options);
    this.config = options.config;
    this.capabilities = options.capabilities;
  }

  initialize() {
    return [this.getConnection().then(() => {})];
  }

  /**
   * Since Rover projects do not scan all the folders in the workspace on start,
   * we need to restore the information about open documents from the previous session
   * in case or a project recreation (configuration reload).
   */
  restoreFromPreviousProject(previousProject: RoverProject) {
    for (const document of previousProject.documents.openDocuments) {
      this.documents.onDidOpenTextDocument({ document });
    }
  }

  getConnection(): Promise<ProtocolConnection> {
    const connectionFromStorage = this.connectionStorage.getStore();
    if (connectionFromStorage) {
      return Promise.resolve(connectionFromStorage);
    }

    if (!this._connection) {
      this._connection = this.initializeConnection();
    }

    return this._connection;
  }

  private async sendNotification<P, RO>(
    type: ProtocolNotificationType<P, RO>,
    params?: P,
  ): Promise<void> {
    const connection = await this.getConnection();
    Debug.traceMessage(
      "[Rover] Sending notification: " + type.method,
      "[Rover] Sending notification %o",
      {
        type: type.method,
        params,
      },
    );
    try {
      return await connection.sendNotification(type, params);
    } catch (error) {
      if (error instanceof Error) {
        (error as any).cause = { type: type.method, params };
      }
      throw error;
    }
  }

  private async sendRequest<P, R, PR, E, RO>(
    type: ProtocolRequestType<P, R, PR, E, RO>,
    params: P,
    token?: CancellationToken,
  ): Promise<R> {
    const connection = await this.getConnection();
    Debug.traceMessage(
      "[Rover] Sending request: " + type.method,
      "[Rover] Sending request %o",
      { type: type.method, params },
    );
    try {
      const result = await connection.sendRequest(type, params, token);
      Debug.traceMessage(
        "[Rover] Received response: " + type.method,
        "[Rover] Received response %s\nResult: %o",
        type.method,

        result,
      );
      return result;
    } catch (error) {
      if (error instanceof Error) {
        (error as any).cause = { type: type.method, params };
      }
      throw error;
    }
  }

  async initializeConnection() {
    if (this.child) {
      this.child.kill();
    }
    if (this.disposed) {
      throw new ConnectionError(
        ConnectionErrors.Closed,
        "Connection is closed.",
      );
    }
    const args = ["lsp", "--elv2-license", "accept"];
    if (this.config.rover.profile) {
      args.push("--profile", this.config.rover.profile);
    }
    if (this.config.rover.supergraphConfig) {
      args.push("--supergraph-config", this.config.rover.supergraphConfig);
    }
    if (Debug.traceLevel >= TraceLevel.verbose) {
      args.push("--log", "debug");
    }
    args.push(...this.config.rover.extraArgs);

    Debug.traceVerbose(
      `starting ${this.config.rover.bin} '${args.join("' '")}'`,
    );
    const child = cp.spawn(this.config.rover.bin, args, {
      env: { NO_COLOR: "1" },
      stdio: [
        "pipe",
        "pipe",
        Debug.traceLevel >= TraceLevel.verbose ? "inherit" : "ignore",
      ],
    });
    this.child = child;
    const reader = new StreamMessageReader(child.stdout);
    const writer = new StreamMessageWriter(child.stdin);
    const connection = createProtocolConnection(reader, writer);
    connection.onClose(() => {
      Debug.traceMessage("[Rover] Connection closed");
      child.kill();
      source.cancel();
      this._connection = undefined;
    });

    connection.onError((err) => {
      Debug.error("%o", { err });
    });

    connection.onNotification(
      PublishDiagnosticsNotification.type,
      this.documents.handlePartDiagnostics.bind(this.documents),
    );

    connection.onUnhandledNotification((notification) => {
      Debug.traceVerbose(
        "[Rover] unhandled notification from LSP",
        notification,
      );
    });

    connection.listen();
    Debug.traceMessage("[Rover] Initializing connection");

    const source = new CancellationTokenSource();
    try {
      const status = await connection.sendRequest(
        InitializeRequest.type,
        {
          capabilities: this.capabilities,
          processId: process.pid,
          rootUri: this.rootURI.toString(),
        },
        source.token,
      );
      this.roverCapabilities = status.capabilities;
      Debug.traceMessage(
        "[Rover] Connection initialized",
        "[Rover] Connection initialized %o",
        status,
      );

      await this.connectionStorage.run(
        connection,
        this.documents.resendAllDocuments.bind(this.documents),
      );

      return connection;
    } catch (error) {
      Debug.error("Connection with Rover failed to initialize", error);
      throw error;
    }
  }

  getProjectStats(): ProjectStats {
    return { type: "Rover", loaded: true };
  }

  includesFile(
    uri: DocumentUri,
    languageId = getLanguageIdForExtension(extname(uri) as FileExtension),
  ) {
    return (
      uri.startsWith(this.rootURI.toString()) &&
      supportedLanguageIds.includes(languageId)
    );
  }

  onDidChangeWatchedFiles: GraphQLProject["onDidChangeWatchedFiles"] = (
    params,
  ) => {
    return this.sendNotification(
      DidChangeWatchedFilesNotification.type,
      params,
    );
  };

  onDidOpen: GraphQLProject["onDidOpen"] = (params) =>
    this.documents.onDidOpenTextDocument(params);
  onDidClose: GraphQLProject["onDidClose"] = (params) =>
    this.documents.onDidCloseTextDocument(params);

  async documentDidChange(document: TextDocument) {
    return this.documents.documentDidChange(document);
  }

  clearAllDiagnostics() {
    this.documents.clearAllDiagnostics();
  }

  dispose() {
    this.disposed = true;
    if (this.child) {
      // this will immediately close the connection without a direct reference
      this.child.stdout.emit("close");
      this.child.kill();
    }
  }

  onCompletion: GraphQLProject["onCompletion"] = async (params, token) =>
    this.documents.insideVirtualDocument(params, (virtualParams) =>
      this.sendRequest(CompletionRequest.type, virtualParams, token),
    );

  onHover: GraphQLProject["onHover"] = async (params, token) =>
    this.documents.insideVirtualDocument(params, (virtualParams) =>
      this.sendRequest(HoverRequest.type, virtualParams, token),
    );

  onDefinition: GraphQLProject["onDefinition"] = async (params, token) =>
    this.documents.insideVirtualDocument(params, (virtualParams) =>
      this.sendRequest(DefinitionRequest.type, virtualParams, token),
    );

  onUnhandledRequest: GraphQLProject["onUnhandledRequest"] = async (
    type,
    params,
    token,
  ) => {
    if (isRequestType(SemanticTokensRequest.type, type, params)) {
      return this.documents.getFullSemanticTokens(params, token);
    } else {
      Debug.traceVerbose("unhandled request from VSCode", { type, params });
      return undefined;
    }
  };
  onUnhandledNotification: GraphQLProject["onUnhandledNotification"] = (
    _connection,
    type,
    params,
  ) => {
    Debug.traceVerbose("unhandled notification from VSCode", { type, params });
  };

  async onVSCodeConnectionInitialized(connection: VSCodeConnection) {
    // Report the actual capabilities of the upstream LSP to VSCode.
    // It is important to actually "ask" the LSP for this, because the capabilities
    // also define the semantic token legend, which is needed to interpret the tokens.
    await this.getConnection();
    const capabilities = this.roverCapabilities;
    if (capabilities?.semanticTokensProvider) {
      connection.client.register(SemanticTokensRegistrationType.type, {
        documentSelector: null,
        ...capabilities.semanticTokensProvider,
        full: {
          // the upstream LSP supports "true" here, but we don't yet
          delta: false,
        },
      });
    }
  }
}

function isRequestType<R, PR, E, RO>(
  type: ProtocolRequestType0<R, PR, E, RO>,
  method: string,
  params: any,
): params is PR;
function isRequestType<P, R, PR, E, RO>(
  type: ProtocolRequestType<P, R, PR, E, RO>,
  method: string,
  params: any,
): params is P;
function isRequestType(
  type:
    | ProtocolRequestType0<any, any, any, any>
    | ProtocolRequestType<any, any, any, any, any>,
  method: string,
) {
  return type.method === method;
}
