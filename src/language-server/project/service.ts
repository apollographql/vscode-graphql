import { GraphQLProject } from "./base";
import { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import { ServiceConfig } from "../config";
import { ClientIdentity } from "../engine";
import URI from "vscode-uri";

export function isServiceProject(
  project: GraphQLProject
): project is GraphQLServiceProject {
  return project instanceof GraphQLServiceProject;
}

export interface GraphQLServiceProjectConfig {
  clientIdentity?: ClientIdentity;
  config: ServiceConfig;
  configFolderURI: URI;
  loadingHandler: LoadingHandler;
}
export class GraphQLServiceProject extends GraphQLProject {
  constructor({
    clientIdentity,
    config,
    configFolderURI,
    loadingHandler,
  }: GraphQLServiceProjectConfig) {
    super({ config, configFolderURI, loadingHandler, clientIdentity });
    this.config = config;
  }

  get displayName() {
    return this.config.graph || "Unnamed Project";
  }

  initialize() {
    return [];
  }

  validate() {}

  getProjectStats() {
    return { loaded: true, type: "service" };
  }

  resolveFederationInfo() {
    return this.schemaProvider.resolveFederatedServiceSDL();
  }
}
