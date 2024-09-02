import * as vscode from "vscode";
import { devtoolsEvents } from "./server";
export class DevToolsViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "vscode-apollo-client-devtools";

  constructor(private readonly _extensionUri: vscode.Uri) {}
  async resolveWebviewView(
    panel: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ): Promise<void> {
    vscode.commands.executeCommand("apollographql/startDevToolsServer");
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    panel.webview.html = DevToolsViewProvider._getHtmlForWebview(
      panel.webview,
      this._extensionUri,
    );

    panel.webview.onDidReceiveMessage((data) => {
      devtoolsEvents.emit("fromDevTools", data);
    });
    function forwardToDevTools(data: unknown) {
      panel.webview.postMessage(data);
    }
    devtoolsEvents.addListener("toDevTools", forwardToDevTools);
    panel.onDidDispose(() => {
      devtoolsEvents.removeListener("toDevTools", forwardToDevTools);
    });
  }

  private static _getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
  ) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "devtool-build", "panel.js"),
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />

    <!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
		-->
		<meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      style-src ${webview.cspSource} https://fonts.googleapis.com 'unsafe-inline';
      font-src ${webview.cspSource} https://fonts.gstatic.com;
      img-src ${webview.cspSource} https:;
      script-src 'nonce-${nonce}';
      frame-src https://*.apollographql.com/;
    ">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Apollo Client DevTools</title>
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
      window.originalPostMessage = window.postMessage;
      window.postMessage = function wrapPostMessage (...args) {
        if (args.length>1 && args[1].startsWith("vscode-webview://")) {
          return window.originalPostMessage(...args);
        }
        return vscode.postMessage(...args);
      };

      window.addEventListener("message", (event) => {  console.debug(event); });
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
    <script nonce="${nonce}">
      window.originalPostMessage({
        id: 123,
        source: "apollo-client-devtools",
        type: "actor",
        message: { type: "initializePanel" },
      });
    </script>
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
