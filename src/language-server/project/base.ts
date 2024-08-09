import path, { extname } from "path";
import { lstatSync, readFileSync } from "fs";
import { URI } from "vscode-uri";

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
  NotificationHandler,
  PublishDiagnosticsParams,
  Position,
  CancellationToken,
  CompletionItem,
  Hover,
  Definition,
  ReferenceContext,
  Location,
  DocumentSymbol,
  SymbolInformation,
  Range,
  CodeAction,
  CodeLens,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { GraphQLDocument, extractGraphQLDocuments } from "../document";

import type { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import {
  ApolloConfig,
  ClientConfig,
  isClientConfig,
  isLocalServiceConfig,
  keyEnvVar,
  RoverConfig,
} from "../config";
import {
  schemaProviderFromConfig,
  GraphQLSchemaProvider,
  SchemaResolveConfig,
} from "../providers/schema";
import { ApolloEngineClient, ClientIdentity } from "../engine";
import type { ProjectStats } from "../../messages";

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
  clientIdentity: ClientIdentity;
  config: ClientConfig | RoverConfig;
  configFolderURI: URI;
  loadingHandler: LoadingHandler;
}

export abstract class GraphQLInternalProject
  extends GraphQLProject
  implements GraphQLSchemaProvider
{
  public schemaProvider: GraphQLSchemaProvider;
  protected engineClient?: ApolloEngineClient;

  private needsValidation = false;

  protected documentsByFile: Map<DocumentUri, GraphQLDocument[]> = new Map();

  constructor({
    config,
    configFolderURI,
    loadingHandler,
    clientIdentity,
  }: GraphQLProjectConfig) {
    super({ config, configFolderURI, loadingHandler, clientIdentity });
    const { includes = [], excludes = [] } = isClientConfig(config)
      ? config.client
      : {};

    this.fileSet.pushIncludes(includes);
    // We do not want to include the local schema file in our list of documents
    this.fileSet.pushExcludes([
      ...excludes,
      ...this.getRelativeLocalSchemaFilePaths(),
    ]);

    this.schemaProvider = schemaProviderFromConfig(config, clientIdentity);
    const { engine } = config;
    if (engine.apiKey) {
      this.engineClient = new ApolloEngineClient(
        engine.apiKey!,
        engine.endpoint,
        clientIdentity,
      );
    }
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
      })(),
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
      this.config.client && this.config.client.tagName,
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
                `️️There are multiple definitions for the \`${definition.name.value}\` operation. Please fix all naming conflicts before continuing.\nConflicting definitions found at ${filePath} and ${conflictingFilePath}.`,
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
    const serviceConfig =
      isClientConfig(this.config) &&
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
      path.relative(this.rootURI.fsPath, path.join(process.cwd(), filePath)),
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
    position: Position,
  ): GraphQLDocument | undefined {
    const queryDocuments = this.documentsByFile.get(uri);
    if (!queryDocuments) return undefined;

    return queryDocuments.find((document) =>
      document.containsPosition(position),
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
    clientIdentity,
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
    // FIXME: Instead of `Promise.all`, we should catch individual promise rejections
    // so we can show multiple errors.
    this.readyPromise = Promise.all(this.initialize())
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

  abstract fileDidChange(uri: DocumentUri): void;
  abstract fileWasDeleted(uri: DocumentUri): void;
  abstract documentDidChange(document: TextDocument): void;
  abstract clearAllDiagnostics(): void;

  abstract provideCompletionItems?(
    uri: DocumentUri,
    position: Position,
    token: CancellationToken,
  ): Promise<CompletionItem[]>;

  abstract provideHover?(
    uri: DocumentUri,
    position: Position,
    token: CancellationToken,
  ): Promise<Hover | null>;

  abstract provideDefinition?(
    uri: DocumentUri,
    position: Position,
    token: CancellationToken,
  ): Promise<Definition | null>;

  abstract provideReferences?(
    uri: DocumentUri,
    position: Position,
    context: ReferenceContext,
    token: CancellationToken,
  ): Promise<Location[] | null>;

  abstract provideDocumentSymbol?(
    uri: DocumentUri,
    token: CancellationToken,
  ): Promise<DocumentSymbol[]>;

  abstract provideSymbol?(
    query: string,
    token: CancellationToken,
  ): Promise<SymbolInformation[]>;

  abstract provideCodeLenses?(
    uri: DocumentUri,
    token: CancellationToken,
  ): Promise<CodeLens[]>;

  abstract provideCodeAction?(
    uri: DocumentUri,
    range: Range,
    token: CancellationToken,
  ): Promise<CodeAction[]>;
}
