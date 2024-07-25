import { TextEditor } from "vscode";
import { closeAllEditors, openEditor, testCompletion, getHover } from "./utils";

let editor: TextEditor;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("localSchema/src/test.js");
});

test("completion", async () => {
  await testCompletion(editor, [3, 7], [["droid", "Droid"]]);
  await testCompletion(editor, [4, 8], [["name", "String!"]]);
});

test("hover", async () => {
  expect(await getHover(editor, [4, 8])).toMatchInlineSnapshot(`
"\`\`\`graphql
Droid.name: String!
\`\`\`

---

What others call this droid"
`);
});
