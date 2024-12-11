import { join } from "path";
import {
  window,
  workspace,
  ExtensionContext,
  Uri,
  ProgressLocation,
  DecorationOptions,
  commands,
  QuickPickItem,
  OutputChannel,
  MarkdownString,
  Range,
  env,
} from "vscode";
import StatusBar from "./statusBar";
import { getLanguageServerClient } from "./languageServerClient";
import { LanguageClient } from "vscode-languageclient/node";
import {
  type EngineDecoration,
  LanguageServerCommands as LSCommands,
  LanguageServerNotifications as LSNotifications,
  LanguageServerRequests as LSRequests,
} from "./messages";
import {
  printNoFileOpenMessage,
  printStatsToClientOutputChannel,
} from "./utils";
import { Debug } from "./debug";
import {
  DevToolsViewProvider,
  isActorMessage,
  isDevToolsExecuteCommandMessage,
  isDevToolsOpenExternalMessage,
} from "./devtools/DevToolsViewProvider";
import { devtoolsEvents, serverState, startServer } from "./devtools/server";

const { version } = require("../package.json");

let globalClient: LanguageClient | null = null;
let statusBar: StatusBar;
let outputChannel: OutputChannel;
let schemaTagItems: QuickPickItem[] = [];
interface ErrorShape {
  message: string;
  stack: string;
}

function isError(response: any): response is ErrorShape {
  return (
    typeof response === "object" &&
    response !== null &&
    "message" in response &&
    "stack" in response
  );
}

export interface VSCodeGraphQLExtension {
  outputChannel: OutputChannel;
  client: LanguageClient;
  LanguageServerCommands: typeof LSCommands;
  LanguageServerNotifications: typeof LSNotifications;
  LanguageServerRequests: typeof LSRequests;
}

export async function activate(
  context: ExtensionContext,
): Promise<VSCodeGraphQLExtension> {
  const serverModule = context.asAbsolutePath(
    join("lib/language-server", "server.js"),
  );
  outputChannel ||= window.createOutputChannel("Apollo GraphQL");
  const client = getLanguageServerClient(serverModule, outputChannel);
  globalClient = client;
  client.registerProposedFeatures();

  // Initialize disposables
  statusBar = new StatusBar({
    hasActiveTextEditor: Boolean(window.activeTextEditor),
  });
  Debug.SetOutputConsole(outputChannel);
  // Handoff disposables for cleanup
  context.subscriptions.push(statusBar, outputChannel);

  client.onNotification(LSNotifications.ServerDebugMessage, (message) => {
    switch (message.type) {
      case "info":
        Debug.info(message.message, message.stack);
        break;
      case "error":
        Debug.error(message.message, message.stack);
        break;
      case "warning":
        Debug.warning(message.message, message.stack);
        break;
      default:
        Debug.info(message.message, message.stack);
        break;
    }
  });

  commands.registerCommand("apollographql/showStats", () => {
    const fileUri = window.activeTextEditor
      ? window.activeTextEditor.document.uri.fsPath
      : null;

    // if no editor is open, but an output channel is, vscode returns something like
    // output:extension-output-%234. If an editor IS open, this is something like file://Users/...
    // This check is just for either a / or a \ anywhere in a fileUri
    // TODO: this should probably be `registerTextEditorCommand` instead of `registerCommand`
    const fileOpen = fileUri && /[\/\\]/.test(fileUri);

    if (fileOpen) {
      client.sendNotification(LSCommands.GetStats, {
        uri: fileUri,
      });
      return;
    }
    printNoFileOpenMessage(client, version);
    client.outputChannel.show();
  });

  client.onNotification(LSNotifications.StatsLoaded, (params) => {
    printStatsToClientOutputChannel(client, params, version);
    client.outputChannel.show();
  });

  commands.registerCommand("apollographql/fileStats", (uri: string) => {
    // this has been introduced to check the LSP loading status in tests right now
    // TODO: "apollographql/showStats" should use this request as well instead of notifications
    return client.sendRequest(LSRequests.FileStats, { uri });
  });

  // For some reason, non-strings can only be sent in one direction. For now, messages
  // coming from the language server just need to be stringified and parsed.
  client.onNotification(LSNotifications.ConfigFilesFound, (params: string) => {
    const response = JSON.parse(params) as Array<any> | ErrorShape;

    const hasActiveTextEditor = Boolean(window.activeTextEditor);
    if (Array.isArray(response)) {
      const errors = response.filter((item) => isError(item));
      if (errors.length) {
        errors.forEach((response) => {
          statusBar.showWarningState({
            hasActiveTextEditor,
            tooltip: "Configuration Error",
          });
          outputChannel.appendLine("---\n" + response.stack + "\n---");

          const infoButtonText = "More Info";
          window
            .showInformationMessage(response.message, infoButtonText)
            .then((clicked) => {
              if (clicked === infoButtonText) {
                outputChannel.show();
              }
            });
        });
      } else if (response.length === 0) {
        statusBar.showWarningState({
          hasActiveTextEditor,
          tooltip: "No apollo.config.js file found",
        });
      } else {
        statusBar.showLoadedState({ hasActiveTextEditor });
      }

      const containsClientConfig = response.some(
        (item) => item && !isError(item) && "client" in item,
      );
      if (containsClientConfig) {
        commands.executeCommand(
          "setContext",
          "vscode-apollo.hasClientProject",
          true,
        );
      }
    } else {
      Debug.error(
        `Invalid response type in message apollographql/configFilesFound:\n${JSON.stringify(
          response,
        )}`,
      );
    }
  });

  commands.registerCommand("apollographql/reloadService", () => {
    // wipe out tags when reloading
    // XXX we should clean up this handling
    schemaTagItems = [];
    client.sendNotification(LSCommands.ReloadService);
  });

  // For some reason, non-strings can only be sent in one direction. For now, messages
  // coming from the language server just need to be stringified and parsed.
  client.onNotification(LSNotifications.TagsLoaded, (params) => {
    const [serviceID, tags]: [string, string[]] = JSON.parse(params);
    const items = tags.map((tag) => ({
      label: tag,
      description: "",
      detail: serviceID,
    }));

    schemaTagItems = [...items, ...schemaTagItems];
  });

  commands.registerCommand("apollographql/selectSchemaTag", async () => {
    const selection = await window.showQuickPick(schemaTagItems);
    if (selection) {
      client.sendNotification(LSCommands.TagSelected, selection);
    }
  });

  let currentLoadingResolve: Map<number, () => void> = new Map();

  client.onNotification(LSNotifications.LoadingComplete, (token) => {
    statusBar.showLoadedState({
      hasActiveTextEditor: Boolean(window.activeTextEditor),
    });
    const inMap = currentLoadingResolve.get(token);
    if (inMap) {
      inMap();
      currentLoadingResolve.delete(token);
    }
  });

  client.onNotification(LSNotifications.Loading, ({ message, token }) => {
    window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: message,
        cancellable: false,
      },
      () => {
        return new Promise<void>((resolve) => {
          currentLoadingResolve.set(token, resolve);
        });
      },
    );
  });

  const runIconOnDiskPath = Uri.file(
    join(context.extensionPath, "images", "IconRun.svg"),
  );

  const textDecorationType = window.createTextEditorDecorationType({});
  const runGlyphDecorationType = window.createTextEditorDecorationType({});
  let latestDecorations: EngineDecoration[] | undefined = undefined;

  const updateDecorations = () => {
    if (window.activeTextEditor && latestDecorations) {
      const editor = window.activeTextEditor!;

      const decorationsForDocument = latestDecorations.filter(
        (decoration) =>
          decoration.document ===
          window.activeTextEditor!.document.uri.toString(),
      );

      const textDecorations = decorationsForDocument.flatMap(
        (decoration): DecorationOptions | DecorationOptions[] => {
          if (decoration.type !== "text") {
            return [];
          }

          return {
            range: editor.document.lineAt(decoration.range.start.line).range,
            renderOptions: {
              after: {
                contentText: decoration.message,
                textDecoration: "none; padding-left: 15px; opacity: .5",
              },
            },
          };
        },
      );

      const runGlyphDecorations = decorationsForDocument.flatMap(
        (decoration): DecorationOptions | DecorationOptions[] => {
          if (decoration.type !== "runGlyph") {
            return [];
          }

          const hoverMessage =
            decoration.hoverMessage === undefined
              ? undefined
              : new MarkdownString(decoration.hoverMessage);
          if (hoverMessage) {
            hoverMessage.isTrusted = true;
          }

          const endOfLinePosition = editor.document.lineAt(
            decoration.range.start.line,
          ).range.end;
          return {
            // Hover range of just the end of the line (and the icon) so the hover shows above the icon,
            // not over at the start of the line
            range: new Range(endOfLinePosition, endOfLinePosition),
            renderOptions: {
              after: {
                contentIconPath: runIconOnDiskPath,
                textDecoration:
                  "none; border-radius: .20rem; margin-left: 8px; text-align: center;",
                backgroundColor: "#2075D6",
                width: "18px",
                height: "18px",
              },
            },
            hoverMessage,
          };
        },
      );

      window.activeTextEditor!.setDecorations(
        textDecorationType,
        textDecorations,
      );
      if (
        workspace
          .getConfiguration("apollographql")
          .get("display.showRunInStudioButton")
      ) {
        window.activeTextEditor!.setDecorations(
          runGlyphDecorationType,
          runGlyphDecorations,
        );
      }
    }
  };

  client.onNotification(
    LSNotifications.EngineDecorations,
    ({ decorations }) => {
      latestDecorations = decorations;
      updateDecorations();
    },
  );

  window.onDidChangeActiveTextEditor(() => {
    updateDecorations();
  });

  workspace.registerTextDocumentContentProvider("graphql-schema", {
    provideTextDocumentContent(uri: Uri) {
      // the schema source is provided inside the URI, just return that here
      return uri.query;
    },
  });

  const provider = new DevToolsViewProvider(context.extensionUri);
  context.subscriptions.push(
    window.registerWebviewViewProvider(DevToolsViewProvider.viewType, provider),
  );

  function devToolsEventListener(event: unknown) {
    if (!isActorMessage(event)) return;
    const message = event.message;
    if (isDevToolsExecuteCommandMessage(message)) {
      commands.executeCommand(message.command, ...(message.arguments || []));
    }
    if (isDevToolsOpenExternalMessage(message)) {
      env.openExternal(
        // if we `Uri.parse` here, we end up with something that somehow double-encodes some things like `#`
        // interestingly enough, the implementation of `openExternal` also allows for strings to be passed in
        // directly, and that works - so we just pass in the string directly
        message.uri as any as Uri,
      );
    }
  }
  devtoolsEvents.addListener("fromDevTools", devToolsEventListener);
  context.subscriptions.push({
    dispose: () =>
      devtoolsEvents.removeListener("fromDevTools", devToolsEventListener),
  });

  context.subscriptions.push(
    commands.registerCommand("apollographql/startDevToolsServer", () => {
      const port = workspace
        .getConfiguration("apollographql")
        .get("devTools.serverPort", 0);
      startServer(port);
    }),
  );
  context.subscriptions.push({
    dispose() {
      if (serverState) {
        serverState.disposable.dispose();
      }
    },
  });
  context.subscriptions.push(
    commands.registerCommand("apollographql/stopDevToolsServer", () => {
      serverState?.disposable.dispose();
    }),
  );

  Debug.traceLevel = workspace
    .getConfiguration("apollographql")
    .get("trace.server");
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((event) => {
      const affected = event.affectsConfiguration("apollographql.trace.server");
      if (affected) {
        Debug.traceLevel = workspace
          .getConfiguration("apollographql")
          .get("trace.server");
      }
    }),
  );

  await client.start();
  return {
    outputChannel,
    client,
    LanguageServerCommands: LSCommands,
    LanguageServerNotifications: LSNotifications,
    LanguageServerRequests: LSRequests,
  };
}

export function deactivate(): Thenable<void> | void {
  if (globalClient) {
    try {
      return globalClient.stop();
    } finally {
      globalClient = null;
    }
  }
}
