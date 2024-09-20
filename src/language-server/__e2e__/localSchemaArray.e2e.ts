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
  editor = await openEditor("localSchemaArray/src/test.js");
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
    (await getCompletionItems(editor, getPosition("d|Name: name")))[0],
  ).toStrictEqual({
    label: "name",
    detail: "String!",
  });
  expect(
    (await getCompletionItems(editor, getPosition("pl|anet")))[0],
  ).toStrictEqual({
    label: "planets",
    detail: "[Planet]",
  });
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
  expect(await getHover(editor, getPosition("pl|anet"))).toMatchInlineSnapshot(`
"\`\`\`graphql
Query.planets: [Planet]
\`\`\`"
`);
});
