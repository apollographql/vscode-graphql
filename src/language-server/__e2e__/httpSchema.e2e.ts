import { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  testCompletion,
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
  await testCompletion(editor, getPosition("bo|oks"), [["books", "[Book]"]]);
  await testCompletion(editor, getPosition("au|thor"), [["author", "String"]]);
});

test("hover", async () => {
  expect(await getHover(editor, getPosition("au|thor"))).toMatchInlineSnapshot(`
"\`\`\`graphql
Book.author: String
\`\`\`"
`);
});
