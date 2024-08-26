import { URI } from "vscode-uri";

import { GraphQLSchema } from "graphql";

import {
  NotificationHandler,
  PublishDiagnosticsParams,
  CancellationToken,
  SymbolInformation,
  Connection,
  ServerRequestHandler,
  TextDocumentChangeEvent,
  StarRequestHandler,
  StarNotificationHandler,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import type { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import { ApolloConfig, ClientConfig, RoverConfig } from "../config";
import type { ProjectStats } from "../../messages";

export type DocumentUri = string;

export interface GraphQLProjectConfig {
  config: ClientConfig | RoverConfig;
  configFolderURI: URI;
  loadingHandler: LoadingHandler;
}

type ConnectionHandler = {
  [K in keyof Connection as K extends `on${string}`
    ? K
    : never]: Connection[K] extends (
    params: ServerRequestHandler<any, any, any, any> & infer P,
    token: CancellationToken,
  ) => any
    ? P
    : never;
};

export abstract class GraphQLProject {
  protected _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;

  private _isReady: boolean;
  private readyPromise: Promise<void>;
  public config: ApolloConfig;
  protected schema?: GraphQLSchema;
  protected fileSet: FileSet;
  protected rootURI: URI;
  protected loadingHandler: LoadingHandler;

  protected lastLoadDate?: number;

  constructor({
    config,
    configFolderURI,
    loadingHandler,
  }: GraphQLProjectConfig) {
    this.config = config;
    this.loadingHandler = loadingHandler;
    // the URI of the folder _containing_ the apollo.config.js is the true project's root.
    // if a config doesn't have a uri associated, we can assume the `rootURI` is the project's root.
    this.rootURI = config.configDirURI || configFolderURI;

    this.fileSet = new FileSet({
      rootURI: this.rootURI,
      includes: [
        ".env",
        "apollo.config.js",
        "apollo.config.cjs",
        "apollo.config.mjs",
        "apollo.config.ts",
      ],
      excludes: [],
      configURI: config.configURI,
    });

    this._isReady = false;
    this.readyPromise = Promise.resolve()
      .then(
        // FIXME: Instead of `Promise.all`, we should catch individual promise rejections
        // so we can show multiple errors.
        () => Promise.all(this.initialize()),
      )
      .then(() => {
        this._isReady = true;
      })
      .catch((error) => {
        console.error(error);
        this.loadingHandler.showError(
          `Error initializing Apollo GraphQL project "${this.displayName}": ${error}`,
        );
      });
  }

  abstract get displayName(): string;

  abstract initialize(): Promise<void>[];

  abstract getProjectStats(): ProjectStats;

  get isReady(): boolean {
    return this._isReady;
  }

  get whenReady(): Promise<void> {
    return this.readyPromise;
  }

  public updateConfig(config: ApolloConfig) {
    this.config = config;
    return this.initialize();
  }

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
  }

  abstract includesFile(uri: DocumentUri): boolean;

  abstract onDidChangeWatchedFiles: ConnectionHandler["onDidChangeWatchedFiles"];
  onDidOpen?: (event: TextDocumentChangeEvent<TextDocument>) => void;
  onDidClose?: (event: TextDocumentChangeEvent<TextDocument>) => void;
  abstract documentDidChange(document: TextDocument): void;
  abstract clearAllDiagnostics(): void;

  onCompletion?: ConnectionHandler["onCompletion"];
  onHover?: ConnectionHandler["onHover"];
  onDefinition?: ConnectionHandler["onDefinition"];
  onReferences?: ConnectionHandler["onReferences"];
  onDocumentSymbol?: ConnectionHandler["onDocumentSymbol"];
  onCodeLens?: ConnectionHandler["onCodeLens"];
  onCodeAction?: ConnectionHandler["onCodeAction"];

  abstract onUnhandledRequest?: StarRequestHandler;
  abstract onUnhandledNotification?: (
  onUnhandledRequest?: StarRequestHandler;
  onUnhandledNotification?: (
    connection: Connection,
    ...rest: Parameters<StarNotificationHandler>
  ) => ReturnType<StarNotificationHandler>;

  dispose?(): void;

  provideSymbol?(
    query: string,
    token: CancellationToken,
  ): Promise<SymbolInformation[]>;
}
