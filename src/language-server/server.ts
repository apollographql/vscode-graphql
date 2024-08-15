import "../env";
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  FileChangeType,
  ServerCapabilities,
  TextDocumentSyncKind,
  SymbolInformation,
  FileEvent,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { QuickPickItem } from "vscode";
import { GraphQLWorkspace } from "./workspace";
import { LanguageServerLoadingHandler } from "./loadingHandler";
import { debounceHandler, Debug } from "./utilities";
import { URI } from "vscode-uri";
import {
  LanguageServerNotifications as Notifications,
  LanguageServerCommands as Commands,
  LanguageServerRequests as Requests,
} from "../messages";
import { isValidationError } from "zod-validation-error";
import { Trie } from "@wry/trie";
import { GraphQLProject } from "./project/base";

const connection = createConnection(ProposedFeatures.all);

Debug.SetConnection(connection);
const { sendNotification: originalSendNotification } = connection;
connection.sendNotification = async (...args: [any, ...any[]]) => {
  await whenConnectionInitialized;
  connection.sendNotification = originalSendNotification;
  connection.sendNotification(...args);
};

let hasWorkspaceFolderCapability = false;

// Awaitable promise for sending messages before the connection is initialized
let initializeConnection: () => void;
const whenConnectionInitialized: Promise<void> = new Promise(
  (resolve) => (initializeConnection = resolve),
);

const workspace = new GraphQLWorkspace(
  new LanguageServerLoadingHandler(connection),
  {
    clientIdentity: {
      name: process.env["APOLLO_CLIENT_NAME"] || "Apollo Language Server",
      version:
        process.env["APOLLO_CLIENT_VERSION"] ||
        "146d29c0-912c-46d3-b686-920e52586be6",
      referenceID:
        process.env["APOLLO_CLIENT_REFERENCE_ID"] ||
        require("../../package.json").version,
    },
  },
);

workspace.onDiagnostics((params) => {
  connection.sendDiagnostics(params);
});

workspace.onDecorations((params) => {
  connection.sendNotification(Notifications.EngineDecorations, {
    decorations: params,
  });
});

workspace.onSchemaTags((params) => {
  connection.sendNotification(Notifications.TagsLoaded, JSON.stringify(params));
});

workspace.onConfigFilesFound(async (params) => {
  connection.sendNotification(
    Notifications.ConfigFilesFound,
    JSON.stringify(params, (_key, value) =>
      !value
        ? value
        : value instanceof Error || isValidationError(value)
        ? { message: value.message, stack: value.stack }
        : value,
    ),
  );
});

connection.onInitialize(async ({ capabilities, workspaceFolders }) => {
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && capabilities.workspace.workspaceFolders
  );
  workspace.capabilities = capabilities;

  if (workspaceFolders) {
    // We wait until all projects are added, because after `initialize` returns we can get additional requests
    // like `textDocument/codeLens`, and that way these can await `GraphQLProject#whenReady` to make sure
    // we provide them eventually.
    await Promise.all(
      workspaceFolders.map((folder) => workspace.addProjectsInFolder(folder)),
    );
  }

  return {
    capabilities: {
      hoverProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ["...", "@"],
      },
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeLensProvider: {
        resolveProvider: false,
      },
      codeActionProvider: true,
      executeCommandProvider: {
        commands: [],
      },
      textDocumentSync: TextDocumentSyncKind.Full,
    } as ServerCapabilities,
  };
});

connection.onInitialized(async () => {
  initializeConnection();
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(async (event) => {
      await Promise.all([
        ...event.removed.map((folder) =>
          workspace.removeProjectsInFolder(folder),
        ),
        ...event.added.map((folder) => workspace.addProjectsInFolder(folder)),
      ]);
    });
  }
});

const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

function isFile(uri: string) {
  return URI.parse(uri).scheme === "file";
}

documents.onDidChangeContent(
  debounceHandler((params) => {
    const project = workspace.projectForFile(params.document.uri);
    if (!project) return;

    // Only watch changes to files
    if (!isFile(params.document.uri)) {
      return;
    }

    project.documentDidChange(params.document);
  }),
);

documents.onDidOpen(
  (params) =>
    workspace.projectForFile(params.document.uri)?.onDidOpen?.(params),
);

documents.onDidClose(
  (params) =>
    workspace.projectForFile(params.document.uri)?.onDidClose?.(params),
);

connection.onDidChangeWatchedFiles((params) => {
  const handledByProject = new Map<GraphQLProject, FileEvent[]>();
  for (const { uri, type } of params.changes) {
    if (
      uri.endsWith("apollo.config.js") ||
      uri.endsWith("apollo.config.cjs") ||
      uri.endsWith("apollo.config.mjs") ||
      uri.endsWith("apollo.config.ts") ||
      uri.endsWith(".env")
    ) {
      workspace.reloadProjectForConfig(uri);
    }

    // Don't respond to changes in files that are currently open,
    // because we'll get content change notifications instead
    if (type === FileChangeType.Changed) {
      continue;
    }

    // Only watch changes to files
    if (!isFile(uri)) {
      continue;
    }

    const project = workspace.projectForFile(uri);
    if (!project) continue;

    handledByProject.set(project, handledByProject.get(project) || []);
    handledByProject.get(project)!.push({ uri, type });
  }
  for (const [project, changes] of handledByProject) {
    project.onDidChangeWatchedFiles({ changes });
  }
});

connection.onHover(
  (params, token, workDoneProgress, resultProgress) =>
    workspace
      .projectForFile(params.textDocument.uri)
      ?.onHover?.(params, token, workDoneProgress, resultProgress) ?? null,
);

connection.onDefinition(
  (params, token, workDoneProgress, resultProgress) =>
    workspace
      .projectForFile(params.textDocument.uri)
      ?.onDefinition?.(params, token, workDoneProgress, resultProgress) ?? null,
);

connection.onReferences(
  (params, token, workDoneProgress, resultProgress) =>
    workspace
      .projectForFile(params.textDocument.uri)
      ?.onReferences?.(params, token, workDoneProgress, resultProgress) ?? null,
);

connection.onDocumentSymbol(
  (params, token, workDoneProgress, resultProgress) =>
    workspace
      .projectForFile(params.textDocument.uri)
      ?.onDocumentSymbol?.(params, token, workDoneProgress, resultProgress) ??
    [],
);

connection.onWorkspaceSymbol(async (params, token) => {
  const symbols: SymbolInformation[] = [];
  const symbolPromises = workspace.projects.map(
    (project) =>
      project.provideSymbol?.(params.query, token) || Promise.resolve([]),
  );
  for (const projectSymbols of await Promise.all(symbolPromises)) {
    symbols.push(...projectSymbols);
  }
  return symbols;
});

connection.onCompletion(
  debounceHandler(
    (params, token, workDoneProgress, resultProgress) =>
      workspace
        .projectForFile(params.textDocument.uri)
        ?.onCompletion?.(params, token, workDoneProgress, resultProgress) ?? [],
  ),
);

connection.onCodeLens(
  debounceHandler(
    (params, token, workDoneProgress, resultProgress) =>
      workspace
        .projectForFile(params.textDocument.uri)
        ?.onCodeLens?.(params, token, workDoneProgress, resultProgress) ?? [],
  ),
);

connection.onCodeAction(
  debounceHandler(
    (params, token, workDoneProgress, resultProgress) =>
      workspace
        .projectForFile(params.textDocument.uri)
        ?.onCodeAction?.(params, token, workDoneProgress, resultProgress) ?? [],
  ),
);

connection.onNotification(Commands.ReloadService, () =>
  workspace.reloadService(),
);

connection.onNotification(Commands.TagSelected, (selection: QuickPickItem) =>
  workspace.updateSchemaTag(selection),
);

connection.onNotification(Commands.GetStats, async ({ uri }) => {
  const status = await workspace.projectForFile(uri)?.getProjectStats();
  connection.sendNotification(
    Notifications.StatsLoaded,
    status ?? {
      loaded: false,
    },
  );
});
connection.onRequest(Requests.FileStats, async ({ uri }) => {
  return workspace.projectForFile(uri)?.getProjectStats() ?? { loaded: false };
});

// Listen on the connection
connection.listen();
