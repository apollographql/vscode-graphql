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
  Disposable,
  OutputChannel,
  MarkdownString,
  Range,
} from "vscode";
import StatusBar from "./statusBar";
import { getLanguageServerClient } from "./languageServerClient";
import { NotificationType } from "vscode-languageclient";
import type { EngineDecoration, LanguageClient } from "./messages";
import {
  printNoFileOpenMessage,
  printStatsToClientOutputChannel,
} from "./utils";
import { Debug } from "./debug";

const { version } = require("../package.json");

let client: LanguageClient;
let clientDisposable: Disposable;
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

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    join("lib/language-server", "server.js")
  );

  // Initialize language client
  client = getLanguageServerClient(serverModule, outputChannel);
  client.registerProposedFeatures();

  // Initialize disposables
  statusBar = new StatusBar({
    hasActiveTextEditor: Boolean(window.activeTextEditor),
  });
  outputChannel = window.createOutputChannel("Apollo GraphQL");
  Debug.SetOutputConsole(outputChannel);
  clientDisposable = client.start();

  // Handoff disposables for cleanup
  context.subscriptions.push(statusBar, outputChannel, clientDisposable);

  var serverDebugMessage: NotificationType<
    { type: string; message: string; stack?: string },
    any
  > = new NotificationType("serverDebugMessage");

  // Once client is ready, we can send messages and add listeners for various notifications
  client.onReady().then(() => {
    client.onNotification(serverDebugMessage, (message) => {
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
      const fileOpen = fileUri && /[\/\\]/.test(fileUri);

      if (fileOpen) {
        client.sendNotification("apollographql/getStats", { uri: fileUri });
        return;
      }
      printNoFileOpenMessage(client, version);
      client.outputChannel.show();
    });

    client.onNotification("apollographql/statsLoaded", (params) => {
      printStatsToClientOutputChannel(client, params, version);
      client.outputChannel.show();
    });
    // For some reason, non-strings can only be sent in one direction. For now, messages
    // coming from the language server just need to be stringified and parsed.
    client.onNotification(
      "apollographql/configFilesFound",
      (params: string) => {
        const response = JSON.parse(params) as Array<any> | ErrorShape;

        const hasActiveTextEditor = Boolean(window.activeTextEditor);
        if (isError(response)) {
          statusBar.showWarningState({
            hasActiveTextEditor,
            tooltip: "Configuration Error",
          });
          outputChannel.append(response.stack);

          const infoButtonText = "More Info";
          window
            .showInformationMessage(response.message, infoButtonText)
            .then((clicked) => {
              if (clicked === infoButtonText) {
                outputChannel.show();
              }
            });
        } else if (Array.isArray(response)) {
          if (response.length === 0) {
            statusBar.showWarningState({
              hasActiveTextEditor,
              tooltip: "No apollo.config.js file found",
            });
          } else {
            statusBar.showLoadedState({ hasActiveTextEditor });
          }
        } else {
          Debug.error(
            `Invalid response type in message apollographql/configFilesFound:\n${JSON.stringify(
              response
            )}`
          );
        }
      }
    );

    commands.registerCommand("apollographql/reloadService", () => {
      // wipe out tags when reloading
      // XXX we should clean up this handling
      schemaTagItems = [];
      client.sendNotification("apollographql/reloadService");
    });

    // For some reason, non-strings can only be sent in one direction. For now, messages
    // coming from the language server just need to be stringified and parsed.
    client.onNotification("apollographql/tagsLoaded", (params) => {
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
        client.sendNotification("apollographql/tagSelected", selection);
      }
    });

    let currentLoadingResolve: Map<number, () => void> = new Map();

    client.onNotification("apollographql/loadingComplete", (token) => {
      statusBar.showLoadedState({
        hasActiveTextEditor: Boolean(window.activeTextEditor),
      });
      const inMap = currentLoadingResolve.get(token);
      if (inMap) {
        inMap();
        currentLoadingResolve.delete(token);
      }
    });

    client.onNotification("apollographql/loading", ({ message, token }) => {
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
        }
      );
    });

    const runIconOnDiskPath = Uri.file(
      join(context.extensionPath, "images", "IconRun.svg")
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
            window.activeTextEditor!.document.uri.toString()
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
          }
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
              decoration.range.start.line
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
          }
        );

        window.activeTextEditor!.setDecorations(
          textDecorationType,
          textDecorations
        );
        if (
          workspace
            .getConfiguration("apollographql")
            .get("display.showRunInStudioButton")
        ) {
          window.activeTextEditor!.setDecorations(
            runGlyphDecorationType,
            runGlyphDecorations
          );
        }
      }
    };

    client.onNotification(
      "apollographql/engineDecorations",
      ({ decorations }) => {
        latestDecorations = decorations;
        updateDecorations();
      }
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
  });
}

export function deactivate(): Thenable<void> | void {
  if (client) {
    return client.stop();
  }
}
