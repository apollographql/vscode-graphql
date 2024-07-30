import { TextEditor } from "vscode";
import { closeAllEditors, openEditor, testCompletion, getHover } from "./utils";

let editor: TextEditor;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("localSchemaArray/src/test.js");
});

test("completion", async () => {
  await testCompletion(editor, [3, 7], [["droid", "Droid"]]);
  await testCompletion(editor, [4, 8], [["name", "String!"]]);
  await testCompletion(editor, [6, 7], [["planets", "[Planet]"]]);
});

test("hover", async () => {
  expect(await getHover(editor, [4, 8])).toMatchInlineSnapshot(`
"\`\`\`graphql
Droid.name: String!
\`\`\`

---

What others call this droid"
`);
  expect(await getHover(editor, [6, 7])).toMatchInlineSnapshot(`
"\`\`\`graphql
Query.planets: [Planet]
\`\`\`"
`);
});
