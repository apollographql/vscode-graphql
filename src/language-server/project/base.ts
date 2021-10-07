import path, { extname } from "path";
import { lstatSync, readFileSync } from "fs";
import URI from "vscode-uri";

import {
  TypeSystemDefinitionNode,
  isTypeSystemDefinitionNode,
  TypeSystemExtensionNode,
  isTypeSystemExtensionNode,
  DefinitionNode,
  GraphQLSchema,
  Kind,
} from "graphql";

import {
  TextDocument,
  NotificationHandler,
  PublishDiagnosticsParams,
  Position,
} from "vscode-languageserver";

import { GraphQLDocument, extractGraphQLDocuments } from "../document";

import type { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import {
  ApolloConfig,
  ClientConfig,
  isClientConfig,
  isLocalServiceConfig,
  isServiceConfig,
  keyEnvVar,
  ServiceConfig,
} from "../config";
import {
  schemaProviderFromConfig,
  GraphQLSchemaProvider,
  SchemaResolveConfig,
} from "../providers/schema";
import { ApolloEngineClient, ClientIdentity } from "../engine";
import type { ProjectStats } from "src/messages";

export type DocumentUri = string;

const fileAssociations: { [extension: string]: string } = {
  ".graphql": "graphql",
  ".gql": "graphql",
  ".js": "javascript",
  ".ts": "typescript",
  ".jsx": "javascriptreact",
  ".tsx": "typescriptreact",
  ".vue": "vue",
  ".svelte": "svelte",
  ".py": "python",
  ".rb": "ruby",
  ".dart": "dart",
  ".re": "reason",
  ".ex": "elixir",
  ".exs": "elixir",
};

interface GraphQLProjectConfig {
  clientIdentity?: ClientIdentity;
  config: ClientConfig | ServiceConfig;
  configFolderURI: URI;
  loadingHandler: LoadingHandler;
}

export abstract class GraphQLProject implements GraphQLSchemaProvider {
  public schemaProvider: GraphQLSchemaProvider;
  protected _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;

  private _isReady: boolean;
  private readyPromise: Promise<void>;
  protected engineClient?: ApolloEngineClient;

  private needsValidation = false;

  protected documentsByFile: Map<DocumentUri, GraphQLDocument[]> = new Map();

  public config: ApolloConfig;
  public schema?: GraphQLSchema;
  private fileSet: FileSet;
  private rootURI: URI;
  protected loadingHandler: LoadingHandler;

  protected lastLoadDate?: number;

  constructor({
    config,
    configFolderURI,
    loadingHandler,
    clientIdentity,
  }: GraphQLProjectConfig) {
    this.config = config;
    this.loadingHandler = loadingHandler;
    // the URI of the folder _containing_ the apollo.config.js is the true project's root.
    // if a config doesn't have a uri associated, we can assume the `rootURI` is the project's root.
    this.rootURI = config.configDirURI || configFolderURI;

    const { includes, excludes } = config.isClient
      ? config.client
      : config.service;
    const fileSet = new FileSet({
      rootURI: this.rootURI,
      includes: [...includes, ".env", "apollo.config.js", "apollo.config.cjs"],
      // We do not want to include the local schema file in our list of documents
      excludes: [...excludes, ...this.getRelativeLocalSchemaFilePaths()],
      configURI: config.configURI,
    });

    this.fileSet = fileSet;
    this.schemaProvider = schemaProviderFromConfig(config, clientIdentity);
    const { engine } = config;
    if (engine.apiKey) {
      this.engineClient = new ApolloEngineClient(
        engine.apiKey!,
        engine.endpoint,
        clientIdentity
      );
    }

    this._isReady = false;
    // FIXME: Instead of `Promise.all`, we should catch individual promise rejections
    // so we can show multiple errors.
    this.readyPromise = Promise.all(this.initialize())
      .then(() => {
        this._isReady = true;
      })
      .catch((error) => {
        console.error(error);
        this.loadingHandler.showError(
          `Error initializing Apollo GraphQL project "${this.displayName}": ${error}`
        );
      });
  }

  abstract get displayName(): string;

  protected abstract initialize(): Promise<void>[];

  abstract getProjectStats(): ProjectStats;

  get isReady(): boolean {
    return this._isReady;
  }

  get engine(): ApolloEngineClient {
    // handle error states for missing engine config
    // all in the same place :tada:
    if (!this.engineClient) {
      throw new Error(`Unable to find ${keyEnvVar}`);
    }
    return this.engineClient!;
  }

  get whenReady(): Promise<void> {
    return this.readyPromise;
  }

  public updateConfig(config: ApolloConfig) {
    this.config = config;
    return this.initialize();
  }

  public resolveSchema(config: SchemaResolveConfig): Promise<GraphQLSchema> {
    this.lastLoadDate = +new Date();
    return this.schemaProvider.resolveSchema(config);
  }

  public resolveFederatedServiceSDL() {
    return this.schemaProvider.resolveFederatedServiceSDL();
  }

  public onSchemaChange(handler: NotificationHandler<GraphQLSchema>) {
    this.lastLoadDate = +new Date();
    return this.schemaProvider.onSchemaChange(handler);
  }

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
  }

  includesFile(uri: DocumentUri) {
    return this.fileSet.includesFile(uri);
  }

  allIncludedFiles() {
    return this.fileSet.allFiles();
  }

  async scanAllIncludedFiles() {
    await this.loadingHandler.handle(
      `Loading queries for ${this.displayName}`,
      (async () => {
        for (const filePath of this.allIncludedFiles()) {
          const uri = URI.file(filePath).toString();

          // If we already have query documents for this file, that means it was either
          // opened or changed before we got a chance to read it.
          if (this.documentsByFile.has(uri)) continue;

          this.fileDidChange(uri);
        }
      })()
    );
  }

  fileDidChange(uri: DocumentUri) {
    const filePath = URI.parse(uri).fsPath;
    const extension = extname(filePath);
    const languageId = fileAssociations[extension];

    // Don't process files of an unsupported filetype
    if (!languageId) return;

    // Don't process directories. Directories might be named like files so
    // we have to explicitly check.
    if (!lstatSync(filePath).isFile()) return;

    const contents = readFileSync(filePath, "utf8");
    const document = TextDocument.create(uri, languageId, -1, contents);
    this.documentDidChange(document);
  }

  fileWasDeleted(uri: DocumentUri) {
    this.removeGraphQLDocumentsFor(uri);
    this.checkForDuplicateOperations();
  }

  documentDidChange(document: TextDocument) {
    const documents = extractGraphQLDocuments(
      document,
      this.config.client && this.config.client.tagName
    );
    if (documents) {
      this.documentsByFile.set(document.uri, documents);
      this.invalidate();
    } else {
      this.removeGraphQLDocumentsFor(document.uri);
    }
    this.checkForDuplicateOperations();
  }

  checkForDuplicateOperations(): void {
    const filePathForOperationName: Record<string, string> = {};
    for (const [fileUri, documentsForFile] of this.documentsByFile.entries()) {
      const filePath = URI.parse(fileUri).fsPath;
      for (const document of documentsForFile) {
        if (!document.ast) continue;
        for (const definition of document.ast.definitions) {
          if (
            definition.kind === Kind.OPERATION_DEFINITION &&
            definition.name
          ) {
            const operationName = definition.name.value;
            if (operationName in filePathForOperationName) {
              const conflictingFilePath =
                filePathForOperationName[operationName];
              throw new Error(
                `️️There are multiple definitions for the \`${definition.name.value}\` operation. Please fix all naming conflicts before continuing.\nConflicting definitions found at ${filePath} and ${conflictingFilePath}.`
              );
            }
            filePathForOperationName[operationName] = filePath;
          }
        }
      }
    }
  }

  private removeGraphQLDocumentsFor(uri: DocumentUri) {
    if (this.documentsByFile.has(uri)) {
      this.documentsByFile.delete(uri);

      if (this._onDiagnostics) {
        this._onDiagnostics({ uri: uri, diagnostics: [] });
      }

      this.invalidate();
    }
  }

  protected invalidate() {
    if (!this.needsValidation && this.isReady) {
      setTimeout(() => {
        this.validateIfNeeded();
      }, 0);
      this.needsValidation = true;
    }
  }

  private validateIfNeeded() {
    if (!this.needsValidation || !this.isReady) return;

    this.validate();

    this.needsValidation = false;
  }

  private getRelativeLocalSchemaFilePaths(): string[] {
    const serviceConfig = isServiceConfig(this.config)
      ? this.config.service
      : isClientConfig(this.config) &&
        typeof this.config.client.service === "object" &&
        isLocalServiceConfig(this.config.client.service)
      ? this.config.client.service
      : undefined;
    const localSchemaFile = serviceConfig?.localSchemaFile;
    return (
      localSchemaFile === undefined
        ? []
        : Array.isArray(localSchemaFile)
        ? localSchemaFile
        : [localSchemaFile]
    ).map((filePath) =>
      path.relative(this.rootURI.fsPath, path.join(process.cwd(), filePath))
    );
  }

  abstract validate(): void;

  clearAllDiagnostics() {
    if (!this._onDiagnostics) return;

    for (const uri of this.documentsByFile.keys()) {
      this._onDiagnostics({ uri, diagnostics: [] });
    }
  }

  documentsAt(uri: DocumentUri): GraphQLDocument[] | undefined {
    return this.documentsByFile.get(uri);
  }

  documentAt(
    uri: DocumentUri,
    position: Position
  ): GraphQLDocument | undefined {
    const queryDocuments = this.documentsByFile.get(uri);
    if (!queryDocuments) return undefined;

    return queryDocuments.find((document) =>
      document.containsPosition(position)
    );
  }

  get documents(): GraphQLDocument[] {
    const documents: GraphQLDocument[] = [];
    for (const documentsForFile of this.documentsByFile.values()) {
      documents.push(...documentsForFile);
    }
    return documents;
  }

  get definitions(): DefinitionNode[] {
    const definitions = [];

    for (const document of this.documents) {
      if (!document.ast) continue;

      definitions.push(...document.ast.definitions);
    }

    return definitions;
  }

  definitionsAt(uri: DocumentUri): DefinitionNode[] {
    const documents = this.documentsAt(uri);
    if (!documents) return [];

    const definitions = [];

    for (const document of documents) {
      if (!document.ast) continue;

      definitions.push(...document.ast.definitions);
    }

    return definitions;
  }

  get typeSystemDefinitionsAndExtensions(): (
    | TypeSystemDefinitionNode
    | TypeSystemExtensionNode
  )[] {
    const definitionsAndExtensions = [];
    for (const document of this.documents) {
      if (!document.ast) continue;
      for (const definition of document.ast.definitions) {
        if (
          isTypeSystemDefinitionNode(definition) ||
          isTypeSystemExtensionNode(definition)
        ) {
          definitionsAndExtensions.push(definition);
        }
      }
    }
    return definitionsAndExtensions;
  }
}
