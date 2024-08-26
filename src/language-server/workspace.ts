import {
  WorkspaceFolder,
  NotificationHandler,
  PublishDiagnosticsParams,
  ClientCapabilities,
} from "vscode-languageserver/node";
import { QuickPickItem } from "vscode";
import { GraphQLProject, DocumentUri } from "./project/base";
import { dirname } from "path";
import { globSync } from "glob";
import { loadConfig, ApolloConfig, isClientConfig } from "./config";
import { LanguageServerLoadingHandler } from "./loadingHandler";
import { ServiceID, SchemaTag, ClientIdentity } from "./engine";
import { GraphQLClientProject, isClientProject } from "./project/client";
import { URI } from "vscode-uri";
import { Debug } from "./utilities";
import type { EngineDecoration } from "../messages";
import { equal } from "@wry/equality";
import { isRoverConfig, RoverProject } from "./project/rover/project";
import { VSCodeConnection } from "./server";

export interface WorkspaceConfig {
  clientIdentity: ClientIdentity;
}

export class GraphQLWorkspace {
  private _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;
  private _onDecorations?: NotificationHandler<EngineDecoration[]>;
  private _onSchemaTags?: NotificationHandler<[ServiceID, SchemaTag[]]>;
  private _onConfigFilesFound?: NotificationHandler<(ApolloConfig | Error)[]>;
  private _projectForFileCache: Map<string, GraphQLProject> = new Map();
  public capabilities?: ClientCapabilities;

  private projectsByFolderUri: Map<string, GraphQLProject[]> = new Map();

  constructor(
    private LanguageServerLoadingHandler: LanguageServerLoadingHandler,
    private config: WorkspaceConfig,
    private whenConnectionInitialized: Promise<VSCodeConnection>,
  ) {}

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
  }

  onDecorations(handler: NotificationHandler<EngineDecoration[]>) {
    this._onDecorations = handler;
  }

  onSchemaTags(handler: NotificationHandler<[ServiceID, SchemaTag[]]>) {
    this._onSchemaTags = handler;
  }

  onConfigFilesFound(handler: NotificationHandler<(ApolloConfig | Error)[]>) {
    this._onConfigFilesFound = handler;
  }

  private createProject({
    config,
    folder,
  }: {
    config: ApolloConfig;
    folder: WorkspaceFolder;
  }) {
    const { clientIdentity } = this.config;
    const project = isClientConfig(config)
      ? new GraphQLClientProject({
          config,
          loadingHandler: this.LanguageServerLoadingHandler,
          configFolderURI: URI.parse(folder.uri),
          clientIdentity,
        })
      : isRoverConfig(config)
      ? new RoverProject({
          config,
          loadingHandler: this.LanguageServerLoadingHandler,
          configFolderURI: URI.parse(folder.uri),
          capabilities: this.capabilities!, // TODO?
        })
      : (() => {
          throw new Error("Impossible config!");
        })();

    project.onDiagnostics((params) => {
      this._onDiagnostics && this._onDiagnostics(params);
    });

    if (isClientProject(project)) {
      project.onDecorations((params) => {
        this._onDecorations && this._onDecorations(params);
      });

      project.onSchemaTags((tags) => {
        this._onSchemaTags && this._onSchemaTags(tags);
      });
    }

    // after a project has loaded, we do an initial validation to surface errors
    // on the start of the language server. Instead of doing this in the
    // base class which is used by codegen and other tools
    project.whenReady.then(() => project.validate?.());

    if (project.onVSCodeConnectionInitialized) {
      this.whenConnectionInitialized.then(
        project.onVSCodeConnectionInitialized.bind(project),
      );
    }
    return project;
  }

  async addProjectsInFolder(folder: WorkspaceFolder) {
    // load all possible workspace projects (contains possible config)
    // see if we can move this detection to cosmiconfig
    /*

      - monorepo (GraphQLWorkspace) as WorkspaceFolder
        -- engine-api (GraphQLProject)
        -- engine-frontend (GraphQLProject)

      OR

      - vscode workspace (fullstack)
        -- ~/:user/client (GraphQLProject) as WorkspaceFolder
        -- ~/:user/server (GraphQLProject) as WorkspaceFolder

    */
    const apolloConfigFiles: string[] = globSync(
      "**/apollo.config.@(js|ts|cjs|mjs)",
      {
        cwd: URI.parse(folder.uri).fsPath,
        absolute: true,
        ignore: "**/node_modules/**",
      },
    );

    // only have unique possible folders
    const apolloConfigFolders = new Set<string>(apolloConfigFiles.map(dirname));

    // go from possible folders to known array of configs
    let foundConfigs: (ApolloConfig | Error)[] = [];

    const projectConfigs = Array.from(apolloConfigFolders).map((configFolder) =>
      loadConfig({ configPath: configFolder })
        .then((config) => {
          if (config) {
            foundConfigs.push(config);
            const projectForConfig = this.createProject({ config, folder });

            const existingProjects =
              this.projectsByFolderUri.get(folder.uri) || [];

            this.projectsByFolderUri.set(folder.uri, [
              ...existingProjects,
              projectForConfig,
            ]);
          } else {
            Debug.error(
              `Workspace failed to load config from: ${configFolder}/`,
            );
          }
        })
        .catch((error) => foundConfigs.push(error)),
    );

    await Promise.all(projectConfigs);

    if (this._onConfigFilesFound) {
      this._onConfigFilesFound(foundConfigs);
    }
  }

  reloadService() {
    this._projectForFileCache.clear();
    this.projectsByFolderUri.forEach((projects, uri) => {
      this.projectsByFolderUri.set(
        uri,
        projects.map((oldProject) => {
          oldProject.clearAllDiagnostics();

          try {
            const newProject = this.createProject({
              config: oldProject.config,
              folder: { uri } as WorkspaceFolder,
            });
            if (
              oldProject instanceof RoverProject &&
              newProject instanceof RoverProject
            ) {
              newProject.restoreFromPreviousProject(oldProject);
            }
            return newProject;
          } finally {
            oldProject.dispose?.();
          }
        }),
      );
    });
  }

  async reloadProjectForConfig(configUri: DocumentUri) {
    const configPath = dirname(URI.parse(configUri).fsPath);
    let config: ApolloConfig | null;
    let error;
    try {
      config = await loadConfig({ configPath });
    } catch (e: any) {
      config = null;
      error = e;
    }

    const project = this.projectForFile(configUri);

    if (this._onConfigFilesFound) {
      this._onConfigFilesFound([config || error]);
    }
    // If project exists, update the config
    if (project && config) {
      if (equal(project.config.rawConfig, config.rawConfig)) {
        return;
      }
      await Promise.all(project.updateConfig(config));
      this.reloadService();
    }

    // If project doesn't exist (new config file), create the project and add to workspace
    if (!project && config) {
      const folderUri = URI.file(configPath).toString();

      const newProject = this.createProject({
        config,
        folder: { uri: folderUri } as WorkspaceFolder,
      });

      const existingProjects = this.projectsByFolderUri.get(folderUri) || [];
      this.projectsByFolderUri.set(folderUri, [
        ...existingProjects,
        newProject,
      ]);
      this.reloadService();
    }
  }

  updateSchemaTag(selection: QuickPickItem) {
    const serviceID = selection.detail;
    if (!serviceID) return;

    this.projectsByFolderUri.forEach((projects) => {
      projects.forEach((project) => {
        if (isClientProject(project) && project.serviceID === serviceID) {
          project.updateSchemaTag(selection.label);
        }
      });
    });
  }

  removeProjectsInFolder(folder: WorkspaceFolder) {
    const projects = this.projectsByFolderUri.get(folder.uri);
    if (projects) {
      projects.forEach((project) => {
        project.clearAllDiagnostics();
        project.dispose?.();
      });
      this.projectsByFolderUri.delete(folder.uri);
    }
  }

  get projects(): GraphQLProject[] {
    return Array.from(this.projectsByFolderUri.values()).flat();
  }

  projectForFile(uri: DocumentUri): GraphQLProject | undefined {
    const cachedResult = this._projectForFileCache.get(uri);
    if (cachedResult) {
      return cachedResult;
    }

    for (const projects of this.projectsByFolderUri.values()) {
      const project = projects.find((project) => project.includesFile(uri));
      if (project) {
        this._projectForFileCache.set(uri, project);
        return project;
      }
    }
    return undefined;
  }
}
