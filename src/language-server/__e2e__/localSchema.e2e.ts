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
  editor = await openEditor("localSchema/src/test.js");
  getPosition = getPositionForEditor(editor);
});

test("completion", async () => {
  await testCompletion(editor, getPosition("dro|id"), [["droid", "Droid"]]);
  await testCompletion(editor, getPosition("na|me"), [["name", "String!"]]);
});

test("hover", async () => {
  expect(await getHover(editor, getPosition("na|me"))).toMatchInlineSnapshot(`
"\`\`\`graphql
Droid.name: String!
\`\`\`

---

What others call this droid"
`);
});
