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
  FileChangeType,
  NotificationHandler,
  Position,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { GraphQLDocument, extractGraphQLDocuments } from "../document";

import { ClientConfig, isClientConfig, isLocalServiceConfig } from "../config";
import {
  schemaProviderFromConfig,
  GraphQLSchemaProvider,
  SchemaResolveConfig,
} from "../providers/schema";
import { ApolloEngineClient, ClientIdentity } from "../engine";
import { GraphQLProject, DocumentUri, GraphQLProjectConfig } from "./base";
import throttle from "lodash.throttle";
import { FileSet } from "../fileSet";
import { getSupportedExtensions } from "../utilities/languageIdForExtension";
import { Debug } from "../utilities";

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

export interface GraphQLInternalProjectConfig extends GraphQLProjectConfig {
  config: ClientConfig;
  clientIdentity: ClientIdentity;
}
export abstract class GraphQLInternalProject
  extends GraphQLProject
  implements GraphQLSchemaProvider
{
  public schemaProvider: GraphQLSchemaProvider;
  protected engineClient?: ApolloEngineClient;
  private fileSet: FileSet;

  private needsValidation = false;

  protected documentsByFile: Map<DocumentUri, GraphQLDocument[]>;

  constructor({
    config,
    configFolderURI,
    loadingHandler,
    clientIdentity,
  }: GraphQLInternalProjectConfig) {
    super({ config, configFolderURI, loadingHandler });
    const {
      // something like
      // 'src/**/*{.gql,.graphql,.graphqls,.js,.mjs,.cjs,.es6,.pac,.ts,.mts,.cts,.jsx,.tsx,.vue,.svelte,.py,.rpy,.pyw,.cpy,.gyp,.gypi,.pyi,.ipy,.pyt,.rb,.rbx,.rjs,.gemspec,.rake,.ru,.erb,.podspec,.rbi,.dart,.re,.ex,.exs}'
      includes = [`src/**/*{${getSupportedExtensions().join(",")}}`],
      excludes = [],
    } = config.client;

    this.documentsByFile = new Map();
    this.fileSet = new FileSet({
      rootURI: this.rootURI,
      includes,
      excludes: [
        ...excludes,
        // We do not want to include the local schema file in our list of documents
        ...this.getRelativeLocalSchemaFilePaths(),
      ],
    });

    Debug.info("intializing project with config file " + config.configURI);
    Debug.info("includes: [" + includes.join(", ") + "]");
    Debug.info("excludes: [" + excludes.join(", ") + "]");
    Debug.info("found files: '" + this.fileSet.allFiles().join("','") + "'");

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

  documentDidChange = (document: TextDocument) => {
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
  };

  checkForDuplicateOperations = throttle(
    () => {
      const filePathForOperationName: Record<string, string> = {};
      for (const [
        fileUri,
        documentsForFile,
      ] of this.documentsByFile.entries()) {
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
    },
    250,
    { leading: true, trailing: true },
  );

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
  onDidChangeWatchedFiles: GraphQLProject["onDidChangeWatchedFiles"] = (
    params,
  ) => {
    for (const { uri, type } of params.changes) {
      switch (type) {
        case FileChangeType.Created:
          this.fileDidChange(uri);
          break;
        case FileChangeType.Deleted:
          this.fileWasDeleted(uri);
          break;
      }
    }
  };
}
