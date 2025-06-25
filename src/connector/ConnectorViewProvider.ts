import * as vscode from "vscode";

export class ConnectorViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "vscode-apollo-connector";

  private _view?: vscode.WebviewView;
  private _connectors: Array<{id: string; uri: string}> = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "executeConnector":
          this._executeConnector(data.connectorId, data.uri, data.inputJson);
          break;
        case "requestConnectors":
          this._sendConnectors();
          break;
      }
    });
  }

  public addConnector(connectorId: string, uri: string) {
    // Avoid duplicates
    if (!this._connectors.find(c => c.id === connectorId)) {
      this._connectors.push({ id: connectorId, uri });
      this._sendConnectors();
    }
  }

  private _sendConnectors() {
    if (!this._view) {
      return;
    }

    this._view.webview.postMessage({
      type: "updateConnectors",
      connectors: this._connectors,
    });
  }

  public populateConnector(connectorId?: string, uri?: string) {
    if (!this._view) {
      return;
    }

    // Add this connector to our registry if it's not already there
    if (connectorId && uri) {
      this.addConnector(connectorId, uri);
    }

    this._view.webview.postMessage({
      type: "populateConnector",
      connectorId: connectorId || "",
      uri: uri || "",
    });
  }

  private async _executeConnector(connectorId: string, uri: string, inputJson: string) {
    if (!this._view) {
      return;
    }

    // Show loading state
    this._view.webview.postMessage({
      type: "loading",
      message: "Executing connector...",
    });

    try {
      // Parse the input JSON
      let inputData: any = {};
      if (inputJson.trim()) {
        try {
          inputData = JSON.parse(inputJson);
        } catch (parseError) {
          this._view.webview.postMessage({
            type: "error",
            message: "Invalid JSON in input: " + (parseError instanceof Error ? parseError.message : String(parseError)),
          });
          return;
        }
      }

      // Replace placeholders in URI with input data
      let processedUri = uri;
      if (uri.includes("$args.")) {
        for (const [key, value] of Object.entries(inputData)) {
          processedUri = processedUri.replace(`{$args.${key}}`, String(value));
        }
      }
      let url = new URL(processedUri);
      if (inputData.hasOwnProperty("$batch")) {
        for (const id of inputData["$batch"].id || []) {
          url.searchParams.append("userId", String(id));
        }
      }

      // Make the API request
      const response = await fetch(url);
      const responseData = await response.json();

      // Send both request and response to the webview
      this._view.webview.postMessage({
        type: "results",
        connectorId,
        request: {
          method: "GET",
          url: url.toString(),
          originalUrl: uri,
          inputData,
          headers: {
            "Content-Type": "application/json",
          },
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        },
      });
    } catch (error) {
      this._view.webview.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public show() {
    if (this._view) {
      this._view.show?.(true);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apollo Connector</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 16px;
            margin: 0;
        }

        .container {
            max-width: 100%;
        }

        .input-section {
            margin-bottom: 20px;
            padding: 12px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }

        .input-group {
            margin-bottom: 12px;
        }

        label {
            display: block;
            margin-bottom: 4px;
            font-weight: bold;
            color: var(--vscode-input-foreground);
        }

        input[type="text"] {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: inherit;
            font-size: inherit;
            box-sizing: border-box;
        }

        textarea {
            width: 100%;
            min-height: 80px;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            box-sizing: border-box;
            resize: vertical;
        }

        input[type="text"]:read-only {
            background-color: var(--vscode-input-background);
            color: var(--vscode-descriptionForeground);
            cursor: not-allowed;
        }

        input[type="text"]:focus, textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 2px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .results-section {
            margin-top: 20px;
        }

        .results-header {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }

        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 12px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            overflow-x: auto;
        }

        .request-section {
            margin-bottom: 16px;
        }

        .response-section {
            margin-bottom: 16px;
        }

        .loading {
            color: var(--vscode-textPreformat-foreground);
            font-style: italic;
        }

        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            border-radius: 4px;
            padding: 8px;
        }

        .status-success {
            color: var(--vscode-testing-iconPassed);
        }

        .status-error {
            color: var(--vscode-errorForeground);
        }

        .connector-search {
            position: relative;
        }

        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background-color: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        }

        .search-result-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .search-result-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .search-result-item:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="input-section">
            <h3>Connector Configuration</h3>

            <div class="input-group">
                <label for="connectorSearch">Connector ID:</label>
                <div class="connector-search">
                    <input type="text" id="connectorSearch" placeholder="Search connectors or enter ID manually...">
                    <div id="searchResults" class="search-results"></div>
                </div>
            </div>

            <div class="input-group">
                <label for="uriInput">URI (read-only):</label>
                <input type="text" id="uriInput" placeholder="Select a connector to see URI" readonly>
            </div>

            <div class="input-group">
                <label for="inputJson">Inputs (JSON):</label>
                <textarea id="inputJson" placeholder='{"$args": "{"id" : 1}", "$batch": {"id": [1, 2]}}'></textarea>
            </div>

            <button id="executeBtn" onclick="executeConnector()">
                ▶️ Execute Connector
            </button>
        </div>

        <div id="resultsSection" class="results-section" style="display: none;">
            <div class="results-header">Results:</div>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Available connectors (populated dynamically from language server)
        let availableConnectors = [];
        let filteredConnectors = [];

        // Request connectors on load
        vscode.postMessage({ type: 'requestConnectors' });

        function updateConnectors(connectors) {
            availableConnectors = connectors;
        }

        function filterConnectors(searchTerm) {
            if (!searchTerm) {
                filteredConnectors = [];
                return;
            }

            filteredConnectors = availableConnectors.filter(connector =>
                connector.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        function showSearchResults() {
            const searchResults = document.getElementById('searchResults');
            const searchTerm = document.getElementById('connectorSearch').value;

            filterConnectors(searchTerm);

            if (filteredConnectors.length === 0) {
                searchResults.style.display = 'none';
                return;
            }

            searchResults.innerHTML = filteredConnectors.map(connector =>
                \`<div class="search-result-item" onclick="selectConnector('\${connector.id}', '\${connector.uri}')">
                    <strong>\${connector.id}</strong><br>
                    <small>\${connector.uri}</small>
                </div>\`
            ).join('');

            searchResults.style.display = 'block';
        }

        function hideSearchResults() {
            setTimeout(() => {
                document.getElementById('searchResults').style.display = 'none';
            }, 200);
        }

        function selectConnector(id, uri) {
            document.getElementById('connectorSearch').value = id;
            document.getElementById('uriInput').value = uri;
            document.getElementById('searchResults').style.display = 'none';
        }

        function executeConnector() {
            const connectorId = document.getElementById('connectorSearch').value;
            const uri = document.getElementById('uriInput').value;
            const inputJson = document.getElementById('inputJson').value;

            if (!connectorId.trim() || !uri.trim()) {
                return;
            }

            // Disable button and show loading
            const btn = document.getElementById('executeBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Executing...';

            // Send the request to the extension
            vscode.postMessage({
                type: 'executeConnector',
                connectorId: connectorId.trim(),
                uri: uri.trim(),
                inputJson: inputJson.trim()
            });
        }

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            const resultsSection = document.getElementById('resultsSection');
            const resultsContent = document.getElementById('resultsContent');
            const btn = document.getElementById('executeBtn');

            switch (message.type) {
                case 'updateConnectors':
                    updateConnectors(message.connectors);
                    break;

                case 'populateConnector':
                    document.getElementById('connectorSearch').value = message.connectorId || '';
                    document.getElementById('uriInput').value = message.uri || '';
                    break;

                case 'loading':
                    resultsSection.style.display = 'block';
                    resultsContent.innerHTML = '<div class="loading">' + message.message + '</div>';
                    break;

                case 'results':
                    btn.disabled = false;
                    btn.textContent = '▶️ Execute Connector';

                    resultsSection.style.display = 'block';
                    resultsContent.innerHTML = \`
                        <div class="request-section">
                            <h4>Request (\${message.connectorId}):</h4>
                            <div class="code-block">
                                <div><strong>GET</strong> \${message.request.url}</div>
                                <div style="margin-top: 8px; color: var(--vscode-descriptionForeground);">
                                    <strong>Headers:</strong>
                                    <pre>\${JSON.stringify(message.request.headers, null, 2)}</pre>
                                </div>
                            </div>
                        </div>

                        <div class="response-section">
                            <h4>Response:</h4>
                            <div class="code-block">
                                <div class="\${message.response.status >= 200 && message.response.status < 300 ? 'status-success' : 'status-error'}">
                                    <strong>Status:</strong> \${message.response.status} \${message.response.statusText}
                                </div>
                                <div style="margin-top: 8px; color: var(--vscode-descriptionForeground);">
                                    <strong>Headers:</strong>
                                    <pre>\${JSON.stringify(message.response.headers, null, 2)}</pre>
                                </div>
                                <div style="margin-top: 8px;">
                                    <strong>Body:</strong>
                                    <pre>\${JSON.stringify(message.response.data, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    \`;
                    break;

                case 'error':
                    btn.disabled = false;
                    btn.textContent = '▶️ Execute Connector';

                    resultsSection.style.display = 'block';
                    resultsContent.innerHTML = '<div class="error">Error: ' + message.message + '</div>';
                    break;
            }
        });

        // Event listeners
        document.getElementById('connectorSearch').addEventListener('input', showSearchResults);
        document.getElementById('connectorSearch').addEventListener('focus', showSearchResults);
        document.getElementById('connectorSearch').addEventListener('blur', hideSearchResults);

        // Allow Enter key to execute
        document.getElementById('inputJson').addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                executeConnector();
            }
        });
    </script>
</body>
</html>`;
  }
}
