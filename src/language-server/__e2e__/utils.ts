import * as vscode from "vscode";
import { join } from "node:path";
import { scheduler } from "node:timers/promises";
import { ProjectStats } from "src/messages";

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
