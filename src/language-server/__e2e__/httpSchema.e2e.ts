import { TextEditor } from "vscode";
import { closeAllEditors, openEditor, testCompletion, getHover } from "./utils";

let editor: TextEditor;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("httpSchema/src/test.js");
});

test("completion", async () => {
  await testCompletion(editor, [3, 7], [["books", "[Book]"]]);
  await testCompletion(editor, [5, 9], [["author", "String"]]);
});

test("hover", async () => {
  expect(await getHover(editor, [5, 9])).toMatchInlineSnapshot(`
"\`\`\`graphql
Book.author: String
\`\`\`"
`);
});
