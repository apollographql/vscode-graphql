import { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  getCompletionItems,
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
  expect(
    (await getCompletionItems(editor, getPosition("dro|id")))[0],
  ).toStrictEqual({
    label: "droid",
    detail: "Droid",
  });
  expect(
    (await getCompletionItems(editor, getPosition("na|me")))[0],
  ).toStrictEqual({
    label: "name",
    detail: "String!",
  });
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
