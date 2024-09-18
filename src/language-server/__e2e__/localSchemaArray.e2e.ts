import { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  testCompletion,
  getHover,
  GetPositionFn,
  getPositionForEditor,
} from "./utils";

let editor: TextEditor;
let getPosition: GetPositionFn;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("localSchemaArray/src/test.js");
  getPosition = getPositionForEditor(editor);
});

test("completion", async () => {
  await testCompletion(editor, getPosition("dro|id"), [["droid", "Droid"]]);
  await testCompletion(editor, getPosition("dName: na|me"), [
    ["name", "String!"],
  ]);
  await testCompletion(editor, getPosition("pl|anet"), [
    ["planets", "[Planet]"],
  ]);
});

test("hover", async () => {
  expect(await getHover(editor, getPosition("d|Name: name")))
    .toMatchInlineSnapshot(`
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
