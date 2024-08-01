import * as vscode from "vscode";
import { join } from "node:path";
import { scheduler } from "node:timers/promises";
import { ProjectStats } from "src/messages";
import { VSCodeGraphQLExtension } from "src/extension";

function resolve(file: string) {
  return join(__dirname, "..", "..", "..", "sampleWorkspace", file);
}

export async function closeAllEditors() {
  while (vscode.window.visibleTextEditors.length > 0) {
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }
}

async function waitFor<T>(
  fn: () => Promise<T>,
  { retries = 15, delay = 200 } = {},
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      await scheduler.wait(delay);
    }
  }
  throw "unreachable";
}

export async function openEditor(file: string) {
  const textDocument = await vscode.workspace.openTextDocument(resolve(file));
  const editor = await vscode.window.showTextDocument(textDocument);
  await waitForLSP(file);
  return editor;
}

export function waitForLSP(file: string) {
  return waitFor(async () => {
    const uri = vscode.Uri.file(resolve(file));
    const stats = await vscode.commands.executeCommand<ProjectStats>(
      "apollographql/fileStats",
      uri.toString(),
    );
    expect(stats.loaded).toBe(true);
    return stats;
  });
}

export async function testCompletion(
  editor: vscode.TextEditor,
  [line, character]: [number, number],
  expected: Array<[label: string, detail: string]>,
) {
  await waitFor(async () => {
    editor.selection = new vscode.Selection(line, character, line, character);
    // without this, the completion list is not updated
    await scheduler.wait(300);
    const completions =
      await vscode.commands.executeCommand<vscode.CompletionList>(
        "vscode.executeCompletionItemProvider",
        editor.document.uri,
        new vscode.Position(line, character),
      );

    const labels = completions.items.slice(0, expected.length).map((item) =>
      typeof item.label === "string"
        ? { label: item.label, detail: "" }
        : {
            label: item.label.label,
            detail: item.detail,
          },
    );
    expect(labels).toStrictEqual(
      expected.map(([label, detail]) => ({ label, detail })),
    );
  });
}

export async function getHover(
  editor: vscode.TextEditor,
  [line, character]: [number, number],
) {
  editor.selection = new vscode.Selection(line, character, line, character);
  // without this, the completion list is not updated
  await scheduler.wait(300);
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    "vscode.executeHoverProvider",
    editor.document.uri,
    new vscode.Position(line, character),
  );

  const item = hovers[0];
  const content = item.contents[0];
  const label = typeof content === "string" ? content : content.value;
  return label;
}

export function getExtension(): VSCodeGraphQLExtension {
  return vscode.extensions.getExtension("apollographql.vscode-apollo")!.exports;
}

export async function getOutputChannelDocument() {
  const ext = getExtension();
  ext.outputChannel.show();
  await scheduler.wait(300);
  const doc = vscode.workspace.textDocuments.find((d) =>
    d.uri.path.startsWith("extension-output-apollographql.vscode-apollo"),
  );
  if (!doc) {
    throw new Error("Output channel document not found");
  }
  return doc;
}

export function getReloadPromise() {
  const disposables: vscode.Disposable[] = [];
  const ext = getExtension();
  const waitingTokens = new Set<number>();
  disposables.push(
    ext.client.onNotification(
      ext.LanguageServerNotifications.Loading,
      ({ token }) => {
        waitingTokens.add(token);
      },
    ),
  );
  return new Promise<void>((resolve) => {
    disposables.push(
      ext.client.onNotification(
        ext.LanguageServerNotifications.LoadingComplete,
        (token) => {
          waitingTokens.delete(token);
          if (waitingTokens.size === 0) resolve();
        },
      ),
    );
  }).finally(() => disposables.forEach((d) => d.dispose()));
}

export async function reloadService() {
  const reloaded = getReloadPromise();

  vscode.commands.executeCommand("apollographql/reloadService");

  await reloaded;
  await scheduler.wait(100);
}
