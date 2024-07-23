import * as vscode from "vscode";
import { join } from "node:path";

function resolve(file: string) {
  return join(__dirname, "..", "..", "sampleWorkspace", file);
}

export async function testCompletion(
  file: string,
  [line, character]: [number, number],
  expected: Array<[label: string, detail: string]>,
  visible = false,
) {
  const textDocument = await vscode.workspace.openTextDocument(resolve(file));
  if (visible) {
    const editor = await vscode.window.showTextDocument(textDocument);
    editor.selection = new vscode.Selection(line, character, line, character);
  }

  const completions =
    await vscode.commands.executeCommand<vscode.CompletionList>(
      "vscode.executeCompletionItemProvider",
      textDocument.uri,
      new vscode.Position(line, character),
    );
  for (const [index, [label, detail]] of Object.entries(expected)) {
    expect(completions.items[index as any].label).toStrictEqual({
      label,
      detail,
    });
  }
}
