import { GraphQLProject } from "./base";
import {
  GraphQLSchema,
  GraphQLError,
  printSchema,
  buildSchema,
  Source,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  FragmentDefinitionNode,
  Kind,
  FragmentSpreadNode,
  OperationDefinitionNode,
  extendSchema,
  DocumentNode,
  FieldNode,
  ObjectTypeDefinitionNode,
  GraphQLObjectType,
  DefinitionNode,
  ExecutableDefinitionNode,
  print,
  GraphQLNamedType,
  GraphQLField,
  GraphQLNonNull,
  isAbstractType,
  TypeNameMetaFieldDef,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  typeFromAST,
  GraphQLType,
  isObjectType,
  isListType,
  GraphQLList,
  isNonNullType,
  ASTNode,
  FieldDefinitionNode,
  isExecutableDefinitionNode,
  isTypeSystemDefinitionNode,
  isTypeSystemExtensionNode,
  DirectiveLocation,
} from "graphql";
import { ValidationRule } from "graphql/validation/ValidationContext";
import {
  NotificationHandler,
  DiagnosticSeverity,
  CancellationToken,
  Position,
  Location,
  CodeLens,
  InsertTextFormat,
  DocumentSymbol,
  SymbolKind,
  SymbolInformation,
  CodeAction,
  CodeActionKind,
  MarkupKind,
  CompletionItemKind,
} from "vscode-languageserver/node";
import LZString from "lz-string";
import { URL } from "node:url";

import {
  positionFromPositionInContainingDocument,
  rangeForASTNode,
  getASTNodeAndTypeInfoAtPosition,
  positionToOffset,
} from "../utilities/source";
import { formatMS } from "../format";
import { LoadingHandler } from "../loadingHandler";
import { apolloClientSchemaDocument } from "./defaultClientSchema";

import {
  FieldLatenciesMS,
  SchemaTag,
  ServiceID,
  ClientIdentity,
} from "../engine";
import { ClientConfig } from "../config";
import {
  ClientSchemaInfo,
  isDirectiveDefinitionNode,
} from "../utilities/graphql";
import { defaultValidationRules } from "../errors/validation";

import {
  collectExecutableDefinitionDiagnositics,
  DiagnosticSet,
  diagnosticsFromError,
} from "../diagnostics";
import { URI } from "vscode-uri";
import type { EngineDecoration } from "../../messages";

// should eventually be moved into this package, since we're overriding a lot of the existing behavior here
import { getAutocompleteSuggestions } from "graphql-language-service";
import { Position as GraphQlPosition } from "graphql-language-service";
import { getTokenAtPosition, getTypeInfo } from "graphql-language-service";
import type { DocumentUri } from "../project/base";

import { highlightNodeForNode } from "../utilities/graphql";

import { isNotNullOrUndefined } from "../../tools";
import type { CodeActionInfo } from "../errors/validation";
import { GraphQLDiagnostic } from "../diagnostics";
import { isInterfaceType } from "graphql";
import { GraphQLInternalProject } from "./internal";
import { Debug } from "../utilities";

type Maybe<T> = null | undefined | T;

function schemaHasASTNodes(schema: GraphQLSchema): boolean {
  const queryType = schema && schema.getQueryType();
  return !!(queryType && queryType.astNode);
}

function augmentSchemaWithGeneratedSDLIfNeeded(
  schema: GraphQLSchema,
): GraphQLSchema {
  if (schemaHasASTNodes(schema)) return schema;

  const sdl = printSchema(schema);

  return buildSchema(
    // Rebuild the schema from a generated source file and attach the source to a `graphql-schema:/`
    // URI that can be loaded as an in-memory file by VS Code.
    new Source(
      sdl,
      `graphql-schema:/schema.graphql?${encodeURIComponent(sdl)}`,
    ),
  );
}

const DirectiveLocations = Object.keys(DirectiveLocation);

function hasFields(type: GraphQLType): boolean {
  return (
    isObjectType(type) ||
    (isListType(type) && hasFields((type as GraphQLList<any>).ofType)) ||
    (isNonNullType(type) && hasFields((type as GraphQLNonNull<any>).ofType))
  );
}

function uriForASTNode(node: ASTNode): DocumentUri | null {
  const uri = node.loc && node.loc.source && node.loc.source.name;
  if (!uri || uri === "GraphQL") {
    return null;
  }
  return uri;
}

function locationForASTNode(node: ASTNode): Location | null {
  const uri = uriForASTNode(node);
  if (!uri) return null;
  return Location.create(uri, rangeForASTNode(node));
}

function symbolForFieldDefinition(
  definition: FieldDefinitionNode,
): DocumentSymbol {
  return {
    name: definition.name.value,
    kind: SymbolKind.Field,
    range: rangeForASTNode(definition),
    selectionRange: rangeForASTNode(definition),
  };
}

export function isClientProject(
  project: GraphQLProject,
): project is GraphQLClientProject {
  return project instanceof GraphQLClientProject;
}

export interface GraphQLClientProjectConfig {
  clientIdentity: ClientIdentity;
  config: ClientConfig;
  configFolderURI: URI;
  loadingHandler: LoadingHandler;
}
export class GraphQLClientProject extends GraphQLInternalProject {
  public serviceID?: string;
  public config!: ClientConfig;

  private serviceSchema?: GraphQLSchema;

  private _onDecorations?: (any: any) => void;
  private _onSchemaTags?: NotificationHandler<[ServiceID, SchemaTag[]]>;

  private fieldLatenciesMS?: FieldLatenciesMS;
  private frontendUrlRoot?: string;

  private _validationRules?: ValidationRule[];

  public diagnosticSet?: DiagnosticSet;

  constructor({
    config,
    loadingHandler,
    configFolderURI,
    clientIdentity,
  }: GraphQLClientProjectConfig) {
    super({ config, configFolderURI, loadingHandler, clientIdentity });
    this.serviceID = config.graph;

    if (this.allIncludedFiles().length === 0) {
      console.warn(
        "⚠️  It looks like there are 0 files associated with this Apollo Project. " +
          "This may be because you don't have any files yet, or your includes/excludes " +
          "fields are configured incorrectly, and Apollo can't find your files. " +
          "For help configuring Apollo projects, see this guide: https://go.apollo.dev/t/config",
      );
    }

    const { validationRules } = this.config.client;
    if (typeof validationRules === "function") {
      this._validationRules = defaultValidationRules.filter(validationRules);
    } else {
      this._validationRules = validationRules;
    }

    this.loadEngineData();
  }

  get displayName(): string {
    return this.config.graph || "Unnamed Project";
  }

  initialize() {
    return [this.scanAllIncludedFiles(), this.loadServiceSchema()];
  }

  public getProjectStats() {
    // use this to remove primitives and internal fields for stats
    const filterTypes = (type: string) =>
      !/^__|Boolean|ID|Int|String|Float/.test(type);

    // filter out primitives and internal Types for type stats to match engine
    const serviceTypes = this.serviceSchema
      ? Object.keys(this.serviceSchema.getTypeMap()).filter(filterTypes).length
      : 0;
    const totalTypes = this.schema
      ? Object.keys(this.schema.getTypeMap()).filter(filterTypes).length
      : 0;

    return {
      type: "client",
      serviceId: this.serviceID,
      types: {
        service: serviceTypes,
        client: totalTypes - serviceTypes,
        total: totalTypes,
      },
      tag: this.config.variant,
      loaded: Boolean(this.schema || this.serviceSchema),
      lastFetch: this.lastLoadDate,
    };
  }

  onDecorations(handler: (any: any) => void) {
    this._onDecorations = handler;
  }

  onSchemaTags(handler: NotificationHandler<[ServiceID, SchemaTag[]]>) {
    this._onSchemaTags = handler;
  }

  async updateSchemaTag(tag: SchemaTag) {
    await this.loadServiceSchema(tag);
    this.invalidate();
  }

  private async loadServiceSchema(tag?: SchemaTag) {
    await this.loadingHandler.handle(
      `Loading schema for ${this.displayName}`,
      (async () => {
        Debug.info("Loading schema for client project" + this.displayName);
        try {
          this.serviceSchema = augmentSchemaWithGeneratedSDLIfNeeded(
            await this.schemaProvider.resolveSchema({
              tag: tag || this.config.variant,
              force: true,
            }),
          );
          Debug.info("Adding client metadata to schema nodes");
          this.schema = extendSchema(this.serviceSchema, this.clientSchema);
          Debug.info("Successfully handled schema");
        } catch (e) {
          Debug.error("Error loading schema:" + e);
        }
      })(),
    );
  }

  async resolveSchema(): Promise<GraphQLSchema> {
    if (!this.schema) throw new Error();
    return this.schema;
  }

  get clientSchema(): DocumentNode {
    return {
      kind: Kind.DOCUMENT,
      definitions: [
        ...this.typeSystemDefinitionsAndExtensions,
        ...this.missingApolloClientDirectives,
      ],
    };
  }

  get missingApolloClientDirectives(): readonly DefinitionNode[] {
    const { serviceSchema } = this;

    const serviceDirectives = serviceSchema
      ? serviceSchema.getDirectives().map((directive) => directive.name)
      : [];

    const clientDirectives = this.typeSystemDefinitionsAndExtensions
      .filter(isDirectiveDefinitionNode)
      .map((def) => def.name.value);

    const existingDirectives = serviceDirectives.concat(clientDirectives);

    const apolloAst = apolloClientSchemaDocument.ast;
    if (!apolloAst) return [];

    const apolloDirectives = apolloAst.definitions
      .filter(isDirectiveDefinitionNode)
      .map((def) => def.name.value);

    // If there is overlap between existingDirectives and apolloDirectives,
    // don't add apolloDirectives. This is in case someone is directly including
    // the apollo directives or another framework's conflicting directives
    for (const existingDirective of existingDirectives) {
      if (apolloDirectives.includes(existingDirective)) {
        return [];
      }
    }

    return apolloAst.definitions;
  }

  private addClientMetadataToSchemaNodes() {
    const { schema, serviceSchema } = this;
    if (!schema || !serviceSchema) return;

    visit(this.clientSchema, {
      ObjectTypeExtension(node) {
        const type = schema.getType(
          node.name.value,
        ) as Maybe<GraphQLObjectType>;
        const { fields } = node;
        if (!fields || !type) return;

        const localInfo: ClientSchemaInfo = type.clientSchema || {};

        localInfo.localFields = [
          ...(localInfo.localFields || []),
          ...fields.map((field) => field.name.value),
        ];

        type.clientSchema = localInfo;
      },
    });
  }

  async validate() {
    if (!this._onDiagnostics) return;
    if (!this.serviceSchema) return;

    const diagnosticSet = new DiagnosticSet();

    try {
      this.schema = extendSchema(this.serviceSchema, this.clientSchema);
      this.addClientMetadataToSchemaNodes();
    } catch (error) {
      if (error instanceof GraphQLError) {
        const uri = error.source && error.source.name;
        if (uri) {
          diagnosticSet.addDiagnostics(
            uri,
            diagnosticsFromError(error, DiagnosticSeverity.Error, "Validation"),
          );
        }
      } else {
        console.error(error);
      }
      this.schema = this.serviceSchema;
    }

    const fragments = this.fragments;

    for (const [uri, documentsForFile] of this.documentsByFile) {
      for (const document of documentsForFile) {
        diagnosticSet.addDiagnostics(
          uri,
          collectExecutableDefinitionDiagnositics(
            this.schema,
            document,
            fragments,
            this._validationRules,
          ),
        );
      }
    }
    for (const [uri, diagnostics] of diagnosticSet.entries()) {
      this._onDiagnostics({ uri, diagnostics });
    }

    this.diagnosticSet = diagnosticSet;

    this.generateDecorations();
  }

  async loadEngineData() {
    const engineClient = this.engineClient;
    if (!engineClient) return;

    const serviceID = this.serviceID;

    await this.loadingHandler.handle(
      `Loading Apollo data for ${this.displayName}`,
      (async () => {
        try {
          if (serviceID) {
            const { schemaTags, fieldLatenciesMS } =
              await engineClient.loadSchemaTagsAndFieldLatencies(serviceID);
            this._onSchemaTags && this._onSchemaTags([serviceID, schemaTags]);
            this.fieldLatenciesMS = fieldLatenciesMS;
          }
          const frontendUrlRoot = await engineClient.loadFrontendUrlRoot();
          this.frontendUrlRoot = frontendUrlRoot;
          this.lastLoadDate = +new Date();

          this.generateDecorations();
        } catch (e) {
          console.error(e);
        }
      })(),
    );
  }

  generateDecorations() {
    if (!this._onDecorations) return;
    if (!this.schema) return;

    const decorations: EngineDecoration[] = [];

    for (const [uri, queryDocumentsForFile] of this.documentsByFile) {
      for (const queryDocument of queryDocumentsForFile) {
        if (queryDocument.ast) {
          const fieldLatenciesMS = this.fieldLatenciesMS;
          const typeInfo = new TypeInfo(this.schema);
          visit(
            queryDocument.ast,
            visitWithTypeInfo(typeInfo, {
              enter: (node) => {
                if (
                  node.kind == "Field" &&
                  typeInfo.getParentType() &&
                  fieldLatenciesMS
                ) {
                  const parentName = typeInfo.getParentType()!.name;
                  const parentEngineStatMS = fieldLatenciesMS.get(parentName);
                  const engineStatMS = parentEngineStatMS
                    ? parentEngineStatMS.get(node.name.value)
                    : undefined;
                  if (engineStatMS && engineStatMS > 1) {
                    decorations.push({
                      type: "text",
                      document: uri,
                      message: `~${formatMS(engineStatMS, 0)}`,
                      range: rangeForASTNode(node),
                    });
                  }
                } else if (node.kind == "OperationDefinition") {
                  const operationWithFragments =
                    this.getOperationWithFragments(node);
                  const document = operationWithFragments
                    .map(print)
                    .join("\n\n");
                  const explorerURLState =
                    LZString.compressToEncodedURIComponent(
                      JSON.stringify({ document }),
                    );

                  const frontendUrlRoot =
                    this.frontendUrlRoot ?? "https://studio.apollographql.com";

                  const variant = this.config.variant;
                  const graphId = this.studioGraphId;

                  const { client } = this.config;
                  const remoteServiceConfig =
                    typeof client.service === "object" &&
                    "url" in client.service
                      ? client.service
                      : undefined;
                  const endpoint = remoteServiceConfig?.url;

                  const runInExplorerLink = buildExplorerURL({
                    frontendUrlRoot,
                    variant,
                    explorerURLState,
                    endpoint,
                    graphId,
                  });

                  if (runInExplorerLink) {
                    decorations.push({
                      type: "runGlyph",
                      document: uri,
                      range: rangeForASTNode(node),
                      hoverMessage: `[Run in Studio](${runInExplorerLink})`,
                    });
                  }
                }
              },
            }),
          );
        }
      }
    }

    this._onDecorations(decorations);
  }

  get fragments(): { [fragmentName: string]: FragmentDefinitionNode } {
    const fragments = Object.create(null);
    for (const document of this.documents) {
      if (!document.ast) continue;
      for (const definition of document.ast.definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          fragments[definition.name.value] = definition;
        }
      }
    }
    return fragments;
  }

  getOperationFieldsFromFieldDefinition(
    fieldName: string,
    parent: ObjectTypeDefinitionNode | null,
  ): FieldNode[] {
    if (!this.schema || !parent) return [];
    const fields: FieldNode[] = [];
    const typeInfo = new TypeInfo(this.schema);
    for (const document of this.documents) {
      if (!document.ast) continue;
      visit(
        document.ast,
        visitWithTypeInfo(typeInfo, {
          Field(node: FieldNode) {
            if (node.name.value !== fieldName) return;
            const parentType = typeInfo.getParentType();
            if (parentType && parentType.name === parent.name.value) {
              fields.push(node);
            }
            return;
          },
        }),
      );
    }
    return fields;
  }
  fragmentSpreadsForFragment(fragmentName: string): FragmentSpreadNode[] {
    const fragmentSpreads: FragmentSpreadNode[] = [];
    for (const document of this.documents) {
      if (!document.ast) continue;

      visit(document.ast, {
        FragmentSpread(node: FragmentSpreadNode) {
          if (node.name.value === fragmentName) {
            fragmentSpreads.push(node);
          }
        },
      });
    }
    return fragmentSpreads;
  }
  getOperationWithFragments(
    operationDefinition: OperationDefinitionNode,
  ): ExecutableDefinitionNode[] {
    const fragments = this.fragments;
    const seenFragmentNames = new Set<string>([]);
    const allDefinitions: ExecutableDefinitionNode[] = [operationDefinition];

    const defintionsToSearch: ExecutableDefinitionNode[] = [
      operationDefinition,
    ];
    let currentDefinition: ExecutableDefinitionNode | undefined;
    while ((currentDefinition = defintionsToSearch.shift())) {
      visit(currentDefinition, {
        FragmentSpread(node: FragmentSpreadNode) {
          const fragmentName = node.name.value;
          const fragment = fragments[fragmentName];
          if (!seenFragmentNames.has(fragmentName) && fragment) {
            defintionsToSearch.push(fragment);
            allDefinitions.push(fragment);
            seenFragmentNames.add(fragmentName);
          }
        },
      });
    }

    return allDefinitions;
  }

  private get studioGraphId() {
    // if we don't have an `engineClient`, we are not in a studio project and `this.config.graph` could be just about anything
    return this.engineClient ? this.config.graph : undefined;
  }

  onCompletion: GraphQLProject["onCompletion"] = async (
    { textDocument: { uri }, position },
    _token: CancellationToken,
  ) => {
    const document = this.documentAt(uri, position);
    if (!document) return [];

    if (!this.schema) return [];

    const rawPositionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position,
    );
    const positionInDocument = new GraphQlPosition(
      rawPositionInDocument.line,
      rawPositionInDocument.character,
    );

    const token = getTokenAtPosition(document.source.body, positionInDocument);
    const state =
      token.state.kind === "Invalid" ? token.state.prevState : token.state;
    const typeInfo = getTypeInfo(this.schema, token.state);

    if (state?.kind === "DirectiveDef") {
      return DirectiveLocations.map((location) => ({
        label: location,
        kind: CompletionItemKind.Constant,
      }));
    }

    const suggestions = getAutocompleteSuggestions(
      this.schema,
      document.source.body,
      positionInDocument,
    );

    if (
      state?.kind === "SelectionSet" ||
      state?.kind === "Field" ||
      state?.kind === "AliasedField"
    ) {
      const parentType = typeInfo.parentType;
      const parentFields =
        isInterfaceType(parentType) || isObjectType(parentType)
          ? parentType.getFields()
          : {};

      if (isAbstractType(parentType)) {
        parentFields[TypeNameMetaFieldDef.name] = TypeNameMetaFieldDef;
      }

      if (parentType === this.schema.getQueryType()) {
        parentFields[SchemaMetaFieldDef.name] = SchemaMetaFieldDef;
        parentFields[TypeMetaFieldDef.name] = TypeMetaFieldDef;
      }

      return suggestions.map((suggest) => {
        // when code completing fields, expand out required variables and open braces
        const suggestedField = parentFields[suggest.label] as GraphQLField<
          void,
          void
        >;
        if (!suggestedField) {
          return suggest;
        } else {
          const requiredArgs = suggestedField.args.filter((a) =>
            isNonNullType(a.type),
          );
          const paramsSection =
            requiredArgs.length > 0
              ? `(${requiredArgs
                  .map((a, i) => `${a.name}: $${i + 1}`)
                  .join(", ")})`
              : ``;

          const isClientType =
            parentType &&
            "clientSchema" in parentType &&
            parentType.clientSchema?.localFields?.includes(suggestedField.name);
          const directives = isClientType ? " @client" : "";

          const snippet = hasFields(suggestedField.type)
            ? `${suggest.label}${paramsSection}${directives} {\n\t$0\n}`
            : `${suggest.label}${paramsSection}${directives}`;

          return {
            ...suggest,
            insertText: snippet,
            insertTextFormat: InsertTextFormat.Snippet,
          };
        }
      });
    }

    if (state?.kind === "Directive") {
      return suggestions.map((suggest) => {
        const directive = this.schema!.getDirective(suggest.label);
        if (!directive) {
          return suggest;
        }

        const requiredArgs = directive.args.filter(isNonNullType);
        const paramsSection =
          requiredArgs.length > 0
            ? `(${requiredArgs
                .map((a, i) => `${a.name}: $${i + 1}`)
                .join(", ")})`
            : ``;

        const snippet = `${suggest.label}${paramsSection}`;

        const argsString =
          directive.args.length > 0
            ? `(${directive.args
                .map((a) => `${a.name}: ${a.type}`)
                .join(", ")})`
            : "";

        const content = [
          [`\`\`\`graphql`, `@${suggest.label}${argsString}`, `\`\`\``].join(
            "\n",
          ),
        ];

        if (suggest.documentation) {
          if (typeof suggest.documentation === "string") {
            content.push(suggest.documentation);
          } else {
            // TODO (jason) `(string | MarkupContent) & (string | null)` is a weird type,
            // leaving this for safety for now
            content.push((suggest.documentation as any).value);
          }
        }

        const doc = {
          kind: MarkupKind.Markdown,
          value: content.join("\n\n"),
        };

        return {
          ...suggest,
          documentation: doc,
          insertText: snippet,
          insertTextFormat: InsertTextFormat.Snippet,
        };
      });
    }

    return suggestions;
  };

  onHover: GraphQLProject["onHover"] = async (
    { textDocument: { uri }, position },
    _token,
  ) => {
    const document = this.documentAt(uri, position);
    if (!(document && document.ast)) return null;

    if (!this.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position,
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      document.source,
      positionInDocument,
      document.ast,
      this.schema,
    );

    if (nodeAndTypeInfo) {
      const [node, typeInfo] = nodeAndTypeInfo;

      switch (node.kind) {
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = node.name.value;
          const fragment = this.fragments[fragmentName];
          if (fragment) {
            return {
              contents: {
                language: "graphql",
                value: `fragment ${fragmentName} on ${fragment.typeCondition.name.value}`,
              },
            };
          }
          break;
        }

        case Kind.FIELD: {
          const parentType = typeInfo.getParentType();
          const fieldDef = typeInfo.getFieldDef();

          if (parentType && fieldDef) {
            const argsString =
              fieldDef.args.length > 0
                ? `(${fieldDef.args
                    .map((a) => `${a.name}: ${a.type}`)
                    .join(", ")})`
                : "";
            const isClientType =
              parentType.clientSchema &&
              parentType.clientSchema.localFields &&
              parentType.clientSchema.localFields.includes(fieldDef.name);

            const isResolvedLocally =
              node.directives &&
              node.directives.some(
                (directive) => directive.name.value === "client",
              );

            const content = [
              [
                `\`\`\`graphql`,
                `${parentType}.${fieldDef.name}${argsString}: ${fieldDef.type}`,
                `\`\`\``,
              ].join("\n"),
            ];

            const info: string[] = [];
            if (isClientType) {
              info.push("`Client-Only Field`");
            }
            if (isResolvedLocally) {
              info.push("`Resolved locally`");
            }

            if (info.length !== 0) {
              content.push(info.join(" "));
            }

            if (fieldDef.description) {
              content.push(fieldDef.description);
            }

            return {
              contents: content.join("\n\n---\n\n"),
              range: rangeForASTNode(highlightNodeForNode(node)),
            };
          }

          break;
        }

        case Kind.NAMED_TYPE: {
          const type = this.schema.getType(
            node.name.value,
          ) as GraphQLNamedType | void;
          if (!type) break;

          const content = [[`\`\`\`graphql`, `${type}`, `\`\`\``].join("\n")];

          if (type.description) {
            content.push(type.description);
          }

          return {
            contents: content.join("\n\n---\n\n"),
            range: rangeForASTNode(highlightNodeForNode(node)),
          };
        }

        case Kind.ARGUMENT: {
          const argumentNode = typeInfo.getArgument()!;
          const content = [
            [
              `\`\`\`graphql`,
              `${argumentNode.name}: ${argumentNode.type}`,
              `\`\`\``,
            ].join("\n"),
          ];
          if (argumentNode.description) {
            content.push(argumentNode.description);
          }
          return {
            contents: content.join("\n\n---\n\n"),
            range: rangeForASTNode(highlightNodeForNode(node)),
          };
        }

        case Kind.DIRECTIVE: {
          const directiveNode = typeInfo.getDirective();
          if (!directiveNode) break;
          const argsString =
            directiveNode.args.length > 0
              ? `(${directiveNode.args
                  .map((a) => `${a.name}: ${a.type}`)
                  .join(", ")})`
              : "";
          const content = [
            [
              `\`\`\`graphql`,
              `@${directiveNode.name}${argsString}`,
              `\`\`\``,
            ].join("\n"),
          ];
          if (directiveNode.description) {
            content.push(directiveNode.description);
          }
          return {
            contents: content.join("\n\n---\n\n"),
            range: rangeForASTNode(highlightNodeForNode(node)),
          };
        }
      }
    }
    return null;
  };

  onDefinition: GraphQLProject["onDefinition"] = async ({
    position,
    textDocument: { uri },
  }) => {
    const document = this.documentAt(uri, position);
    if (!(document && document.ast)) return null;

    if (!this.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position,
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      document.source,
      positionInDocument,
      document.ast,
      this.schema,
    );

    if (nodeAndTypeInfo) {
      const [node, typeInfo] = nodeAndTypeInfo;

      switch (node.kind) {
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = node.name.value;
          const fragment = this.fragments[fragmentName];
          if (fragment && fragment.loc) {
            return locationForASTNode(fragment);
          }
          break;
        }
        case Kind.FIELD: {
          const fieldDef = typeInfo.getFieldDef();

          if (!(fieldDef && fieldDef.astNode && fieldDef.astNode.loc)) break;

          return locationForASTNode(fieldDef.astNode);
        }
        case Kind.NAMED_TYPE: {
          const type = typeFromAST(this.schema, node);

          if (!(type && type.astNode && type.astNode.loc)) break;

          return locationForASTNode(type.astNode);
        }
        case Kind.DIRECTIVE: {
          const directive = this.schema.getDirective(node.name.value);

          if (!(directive && directive.astNode && directive.astNode.loc)) break;

          return locationForASTNode(directive.astNode);
        }
      }
    }
    return null;
  };

  onReferences: GraphQLProject["onReferences"] = async ({
    position,
    textDocument: { uri },
  }) => {
    const document = this.documentAt(uri, position);
    if (!(document && document.ast)) return null;

    if (!this.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position,
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      document.source,
      positionInDocument,
      document.ast,
      this.schema,
    );

    if (nodeAndTypeInfo) {
      const [node, typeInfo] = nodeAndTypeInfo;

      switch (node.kind) {
        case Kind.FRAGMENT_DEFINITION: {
          const fragmentName = node.name.value;
          return this.fragmentSpreadsForFragment(fragmentName)
            .map((fragmentSpread) => locationForASTNode(fragmentSpread))
            .filter(isNotNullOrUndefined);
        }
        // TODO(jbaxleyiii): manage no parent type references (unions + scalars)
        // TODO(jbaxleyiii): support more than fields
        case Kind.FIELD_DEFINITION: {
          // case Kind.ENUM_VALUE_DEFINITION:
          // case Kind.INPUT_OBJECT_TYPE_DEFINITION:
          // case Kind.INPUT_OBJECT_TYPE_EXTENSION: {
          const offset = positionToOffset(document.source, positionInDocument);
          // withWithTypeInfo doesn't suppport SDL so we instead
          // write our own visitor methods here to collect the fields that we
          // care about
          let parent: ASTNode | null = null;
          visit(document.ast, {
            enter(node: ASTNode) {
              // the parent types we care about
              if (
                node.loc &&
                node.loc.start <= offset &&
                offset <= node.loc.end &&
                (node.kind === Kind.OBJECT_TYPE_DEFINITION ||
                  node.kind === Kind.OBJECT_TYPE_EXTENSION ||
                  node.kind === Kind.INTERFACE_TYPE_DEFINITION ||
                  node.kind === Kind.INTERFACE_TYPE_EXTENSION ||
                  node.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION ||
                  node.kind === Kind.INPUT_OBJECT_TYPE_EXTENSION ||
                  node.kind === Kind.ENUM_TYPE_DEFINITION ||
                  node.kind === Kind.ENUM_TYPE_EXTENSION)
              ) {
                parent = node;
              }
              return;
            },
          });
          return this.getOperationFieldsFromFieldDefinition(
            node.name.value,
            parent,
          )
            .map((fieldNode) => locationForASTNode(fieldNode))
            .filter(isNotNullOrUndefined);
        }
      }
    }

    return null;
  };

  onDocumentSymbol: GraphQLProject["onDocumentSymbol"] = async ({
    textDocument: { uri },
  }) => {
    const definitions = this.definitionsAt(uri);

    const symbols: DocumentSymbol[] = [];

    for (const definition of definitions) {
      if (isExecutableDefinitionNode(definition)) {
        if (!definition.name) continue;
        const location = locationForASTNode(definition);
        if (!location) continue;
        symbols.push({
          name: definition.name.value,
          kind: SymbolKind.Function,
          range: rangeForASTNode(definition),
          selectionRange: rangeForASTNode(highlightNodeForNode(definition)),
        });
      } else if (
        isTypeSystemDefinitionNode(definition) ||
        isTypeSystemExtensionNode(definition)
      ) {
        if (
          definition.kind === Kind.SCHEMA_DEFINITION ||
          definition.kind === Kind.SCHEMA_EXTENSION
        ) {
          continue;
        }
        symbols.push({
          name: definition.name.value,
          kind: SymbolKind.Class,
          range: rangeForASTNode(definition),
          selectionRange: rangeForASTNode(highlightNodeForNode(definition)),
          children:
            definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
            definition.kind === Kind.OBJECT_TYPE_EXTENSION
              ? (definition.fields || []).map(symbolForFieldDefinition)
              : undefined,
        });
      }
    }

    return symbols;
  };

  async provideSymbol(
    _query: string,
    _token: CancellationToken,
  ): Promise<SymbolInformation[]> {
    const symbols: SymbolInformation[] = [];

    for (const definition of this.definitions) {
      if (isExecutableDefinitionNode(definition)) {
        if (!definition.name) continue;
        const location = locationForASTNode(definition);
        if (!location) continue;
        symbols.push({
          name: definition.name.value,
          kind: SymbolKind.Function,
          location,
        });
      }
    }
    return symbols;
  }

  onCodeLens: GraphQLProject["onCodeLens"] = async ({
    textDocument: { uri },
  }) => {
    // Wait for the project to be fully initialized, so we always provide code lenses for open files, even
    // if we receive the request before the project is ready.
    await this.whenReady;

    const documents = this.documentsAt(uri);
    if (!documents) return [];

    let codeLenses: CodeLens[] = [];

    for (const document of documents) {
      if (!document.ast) continue;

      for (const definition of document.ast.definitions) {
        if (definition.kind === Kind.OPERATION_DEFINITION) {
          /*
          if (set.endpoint) {
            const fragmentSpreads: Set<
              graphql.FragmentDefinitionNode
            > = new Set();
            const searchForReferencedFragments = (node: graphql.ASTNode) => {
              visit(node, {
                FragmentSpread(node: FragmentSpreadNode) {
                  const fragDefn = project.fragments[node.name.value];
                  if (!fragDefn) return;

                  if (!fragmentSpreads.has(fragDefn)) {
                    fragmentSpreads.add(fragDefn);
                    searchForReferencedFragments(fragDefn);
                  }
                }
              });
            };

            searchForReferencedFragments(definition);

            codeLenses.push({
              range: rangeForASTNode(definition),
              command: Command.create(
                `Run ${definition.operation}`,
                "apollographql.runQuery",
                graphql.parse(
                  [definition, ...fragmentSpreads]
                    .map(n => graphql.print(n))
                    .join("\n")
                ),
                definition.operation === "subscription"
                  ? set.endpoint.subscriptions
                  : set.endpoint.url,
                set.endpoint.headers,
                graphql.printSchema(set.schema!)
              )
            });
          }
          */
        } else if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          // remove project references for fragment now
          // const fragmentName = definition.name.value;
          // const locations = project
          //   .fragmentSpreadsForFragment(fragmentName)
          //   .map(fragmentSpread => locationForASTNode(fragmentSpread))
          //   .filter(isNotNullOrUndefined);
          // const command = Command.create(
          //   `${locations.length} references`,
          //   "editor.action.showReferences",
          //   uri,
          //   rangeForASTNode(definition).start,
          //   locations
          // );
          // codeLenses.push({
          //   range: rangeForASTNode(definition),
          //   command
          // });
        }
      }
    }
    return codeLenses;
  };

  onCodeAction: GraphQLProject["onCodeAction"] = async ({
    textDocument: { uri },
    range,
  }) => {
    function isPositionLessThanOrEqual(a: Position, b: Position) {
      return a.line !== b.line ? a.line < b.line : a.character <= b.character;
    }

    if (!this.diagnosticSet) return [];

    await this.whenReady;

    const documents = this.documentsAt(uri);
    if (!documents) return [];

    const errors: Set<GraphQLError> = new Set();

    for (const [diagnosticUri, diagnostics] of this.diagnosticSet.entries()) {
      if (diagnosticUri !== uri) continue;

      for (const diagnostic of diagnostics) {
        if (
          GraphQLDiagnostic.is(diagnostic) &&
          isPositionLessThanOrEqual(range.start, diagnostic.range.end) &&
          isPositionLessThanOrEqual(diagnostic.range.start, range.end)
        ) {
          errors.add(diagnostic.error);
        }
      }
    }

    const result: CodeAction[] = [];

    for (const error of errors) {
      const { extensions } = error;
      if (!extensions || !extensions.codeAction) continue;

      const { message, edits }: CodeActionInfo = extensions.codeAction as any;

      const codeAction = CodeAction.create(
        message,
        { changes: { [uri]: edits } },
        CodeActionKind.QuickFix,
      );

      result.push(codeAction);
    }

    return result;
  };
}

function buildExplorerURL({
  frontendUrlRoot,
  variant,
  explorerURLState,
  endpoint,
  graphId,
}: {
  frontendUrlRoot: string;
  variant: string;
  explorerURLState: string;
  endpoint: string | undefined;
  graphId: string | undefined;
}) {
  const url = new URL(
    graphId ? `/graph/${graphId}/explorer` : "/sandbox/explorer",
    frontendUrlRoot,
  );
  url.searchParams.set("explorerURLState", explorerURLState);
  url.searchParams.set("referrer", "vscode");
  if (graphId) {
    url.searchParams.set("variant", variant);
  } else if (endpoint) {
    url.searchParams.set("endpoint", endpoint);
  } else {
    // we don't know a graphId or endpoint, so we can't build a URL
    // in that case, we don't want to show a broken 'Run in explorer' gutter link
    return null;
  }
  return url.toString();
}
