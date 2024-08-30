import { Debug } from "src/debug";
import * as vscode from "vscode";
import { devtoolsEvents } from "./server";

export class DevToolsViewProvider {
  public static readonly viewType = "apollo.client.devTools";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public static show(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const panel = vscode.window.createWebviewPanel(
      DevToolsViewProvider.viewType,
      "Apollo Client DevTools",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = this._getHtmlForWebview(panel.webview, extensionUri);

    panel.webview.onDidReceiveMessage((data) => {
      devtoolsEvents.emit("fromDevTools", data);
    });
    devtoolsEvents.addListener("toDevTools", (data) => {
      panel.webview.postMessage(data);
    });

    panel.webview
      .postMessage({
        id: 123,
        source: "apollo-client-devtools",
        type: "actor",
        message: { type: "initializePanel" },
      })
      .then((x) => Debug.info("delivered: " + x));
  }

  // public addColor() {
  //   if (this._view) {
  //     this._view.show?.(true); // `show` is not implemented in 1.49 but is for 1.50 insiders
  //     this._view.webview.postMessage({ type: "addColor" });
  //   }
  // }

  private static _getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "devtool-build", "panel.js"),
    );
    Debug.info(
      vscode.Uri.joinPath(
        extensionUri,
        "lib",
        "devtool-build",
        "panel.js",
      ).toString(),
    );
    Debug.info(scriptUri.toString());

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title></title>
    <style>
      html,
      body {
        overflow: hidden;
      }
      ::-webkit-scrollbar {
        display: none;
      }
      #devtools {
        width: 100vw;
        height: 100vh;
      }
    </style>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="text-primary dark:text-primary-dark">
    <div id="devtools"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const originalPostMessage = window.postMessage;
      window.postMessage = function wrapPostMessage (...args) {
        if (args.length>1 && args[1].startsWith("vscode-webview://")) {
          return originalPostMessage.apply(this, args);
        }
        return vscode.postMessage.apply(vscode, args);
      };
      window.addEventListener("message", (event) => { if (event.origin != "https://explorer.embed.apollographql.com") console.log(event); });
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>
`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
