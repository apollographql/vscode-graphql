import { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  getCompletionItems,
  getHover,
  getPositionForEditor,
  GetPositionFn,
} from "./utils";

let editor: TextEditor;
let getPosition: GetPositionFn;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("httpSchema/src/test.js");
  getPosition = getPositionForEditor(editor);
});

test("completion", async () => {
  expect(
    (await getCompletionItems(editor, getPosition("bo|oks")))[0],
  ).toStrictEqual({
    label: "books",
    detail: "[Book]",
  });
  expect(
    (await getCompletionItems(editor, getPosition("au|thor")))[0],
  ).toStrictEqual({
    label: "author",
    detail: "String",
  });
});

test("hover", async () => {
  expect(await getHover(editor, getPosition("au|thor"))).toMatchInlineSnapshot(`
"\`\`\`graphql
Book.author: String
\`\`\`"
`);
});
