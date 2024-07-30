import { TextEditor } from "vscode";
import { closeAllEditors, openEditor, testCompletion, getHover } from "./utils";

let editor: TextEditor;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("clientSchema/src/test.js");
});

test("completion", async () => {
  await testCompletion(editor, [3, 7], [["droid", "Droid"]]);
  await testCompletion(editor, [4, 8], [["name", "String!"]]);
  await testCompletion(editor, [5, 8], [["model", "String"]]);
});

test("hover", async () => {
  expect(await getHover(editor, [5, 8])).toMatchInlineSnapshot(`
"\`\`\`graphql
Droid.model: String
\`\`\`

---

\`Client-Only Field\`

---

A client-side addition"
`);
});
