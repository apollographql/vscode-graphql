import { TextEditor } from "vscode";
import { closeAllEditors, openEditor, testCompletion, getHover } from "./utils";

let editor: TextEditor;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("spotifyGraph/src/test.js");
});

test("completion", async () => {
  await testCompletion(editor, [4, 9], [["profile", "CurrentUserProfile!"]]);
  await testCompletion(editor, [6, 15], [["displayName", "String"]]);
});

test("hover", async () => {
  expect(await getHover(editor, [4, 9])).toMatchInlineSnapshot(`
"\`\`\`graphql
CurrentUser.profile: CurrentUserProfile!
\`\`\`

---

Get detailed profile information about the current user (including the current user's username)."
`);
});
