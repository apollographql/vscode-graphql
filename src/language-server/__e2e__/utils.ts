import * as vscode from "vscode";
import { join } from "node:path";
import { scheduler } from "node:timers/promises";

function resolve(file: string) {
  return join(__dirname, "..", "..", "..", "sampleWorkspace", file);
}

export async function closeAllEditors() {
  while (vscode.window.visibleTextEditors.length > 0) {
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  }
}

export async function testCompletion(
  file: string,
  [line, character]: [number, number],
  expected: Array<[label: string, detail: string]>,
) {
  const textDocument = await vscode.workspace.openTextDocument(resolve(file));

  const editor = await vscode.window.showTextDocument(textDocument);
  editor.selection = new vscode.Selection(line, character, line, character);

  await scheduler.wait(300);

  const completions =
    await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider",
      editor.document.uri,
      new vscode.Position(line, character),
      undefined,
      expected.length,
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
}
