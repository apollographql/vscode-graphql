import * as vscode from "vscode";
import { join } from "node:path";
import { scheduler } from "node:timers/promises";
import { ProjectStats } from "src/messages";
import { VSCodeGraphQLExtension } from "src/extension";

function resolve(file: string) {
  return join(__dirname, "..", "..", "..", "sampleWorkspace", file);
}

export type GetPositionFn = ReturnType<typeof getPositionForEditor>;
export function getPositionForEditor(editor: vscode.TextEditor) {
  return function getPosition(cursor: `${string}|${string}`) {
    if (cursor.indexOf("|") !== cursor.lastIndexOf("|")) {
      throw new Error(
        "`getPosition` cursor description can only contain one |",
      );
    }
    const text = editor.document.getText();
    const idx = text.indexOf(cursor.replace("|", ""));
    if (idx !== text.lastIndexOf(cursor.replace("|", ""))) {
      throw new Error("`getPosition` cursor description is not unique");
    }
    const cursorIndex = idx + cursor.indexOf("|");
    const position = editor.document.positionAt(cursorIndex);
    return position;
  };
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

export async function getCompletionItems(
  editor: vscode.TextEditor,
  position: vscode.Position,
) {
  let result: { label: string; detail: string | undefined }[] | undefined = [];
  await waitFor(async () => {
    editor.selection = new vscode.Selection(
      position.line,
      position.character,
      position.line,
      position.character,
    );
    // without this, the completion list is not updated
    await scheduler.wait(300);
    const completions =
      await vscode.commands.executeCommand<vscode.CompletionList>(
        "vscode.executeCompletionItemProvider",
        editor.document.uri,
        position,
      );
    expect(completions.items).not.toHaveLength(0);
    const labels = completions.items.map((item) =>
      typeof item.label === "string"
        ? { label: item.label, detail: "" }
        : {
            label: item.label.label,
            detail: item.detail,
          },
    );
    result = labels;
  });
  return result;
}

export async function getHover(
  editor: vscode.TextEditor,
  position: vscode.Position,
) {
  editor.selection = new vscode.Selection(
    position.line,
    position.character,
    position.line,
    position.character,
  );
  // without this, the completion list is not updated
  await scheduler.wait(300);
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
    "vscode.executeHoverProvider",
    editor.document.uri,
    position,
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

export async function getFullSemanticTokens(editor: vscode.TextEditor) {
  const legend = await vscode.commands.executeCommand<
    vscode.SemanticTokensLegend | undefined
  >(
    // https://github.com/microsoft/vscode/blob/d90ab31527203cdb15056df0dc84ab9ddcbbde40/src/vs/workbench/api/common/extHostApiCommands.ts#L220
    "vscode.provideDocumentSemanticTokensLegend",
    editor.document.uri,
  );
  expect(legend).toBeDefined();
  const tokens = await vscode.commands.executeCommand<
    vscode.SemanticTokens | undefined
  >(
    // https://github.com/microsoft/vscode/blob/d90ab31527203cdb15056df0dc84ab9ddcbbde40/src/vs/workbench/api/common/extHostApiCommands.ts#L229
    "vscode.provideDocumentSemanticTokens",
    editor.document.uri,
  );
  expect(tokens).toBeDefined();

  return decodeSemanticTokens(tokens!, legend!);
}

function decodeSemanticTokens(
  tokens: vscode.SemanticTokens,
  legend: vscode.SemanticTokensLegend,
) {
  const tokenArr = Array.from(tokens.data);
  const decodedTokens: {
    startPosition: vscode.Position;
    endPosition: vscode.Position;
    tokenType: string;
    tokenModifiers: string[];
  }[] = [];
  let line = 0,
    start = 0;
  for (let pos = 0; pos < tokenArr.length; pos += 5) {
    const [deltaLine, deltaStart, length, tokenType, tokenModifiers] =
      tokenArr.slice(pos, pos + 5);
    if (deltaLine) {
      line += deltaLine;
      start = 0;
    }
    start += deltaStart;
    const decodedModifiers: string[] = [];
    for (let modifiers = tokenModifiers; modifiers > 0; modifiers >>= 1) {
      decodedModifiers.push(legend.tokenModifiers[modifiers & 0xf]);
    }
    const startPosition = new vscode.Position(line, start);
    const endPosition = startPosition.translate(0, length);
    decodedTokens.push({
      startPosition,
      endPosition,
      tokenType: legend.tokenTypes[tokenType],
      tokenModifiers: decodedModifiers,
    });
  }
  return decodedTokens;
}
