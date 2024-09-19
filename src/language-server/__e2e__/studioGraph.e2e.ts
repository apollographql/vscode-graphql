import { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  getCompletionItems,
  getHover,
  getExtension,
  getOutputChannelDocument,
  reloadService,
  getPositionForEditor,
} from "./utils";
import mocks from "../../__e2e__/mocks.js";

const mockPort = Number(process.env.MOCK_SERVER_PORT);
beforeAll(async () => {
  closeAllEditors();
});

test("completion", async () => {
  const editor = await openEditor("spotifyGraph/src/test.js");
  const getPosition = getPositionForEditor(editor);
  expect(
    (await getCompletionItems(editor, getPosition("pr|ofile")))[0],
  ).toStrictEqual({
    label: "profile",
    detail: "CurrentUserProfile!",
  });
  expect(
    (await getCompletionItems(editor, getPosition("dis|playName")))[0],
  ).toStrictEqual({
    label: "displayName",
    detail: "String",
  });
});

test("hover", async () => {
  const editor = await openEditor("spotifyGraph/src/test.js");
  const getPosition = getPositionForEditor(editor);
  expect(await getHover(editor, getPosition("pr|ofile")))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
CurrentUser.profile: CurrentUserProfile!
\`\`\`

---

Get detailed profile information about the current user (including the current user's username)."
`);
});

test("wrong token", async () => {
  const baseUri = `http://localhost:${mockPort}`;
  try {
    await mocks.sendMock(baseUri, mocks.GetSchemaByTag_WRONG_TOKEN);
    await mocks.sendMock(baseUri, mocks.SchemaTagsAndFieldStats_WRONG_TOKEN);

    const ext = getExtension();
    ext.outputChannel.clear();
    const outputDoc = await getOutputChannelDocument();

    await reloadService();
    const output = outputDoc.getText();

    // currently, this logs twice, along with a full stracktrace, but no indication of where it came from
    // this should be improved on.
    expect(output).toContain(
      `
[GraphQL error]: HTTP fetch failed from 'kotlin': 406: Not Acceptable
[GraphQL error]: Invalid credentials provided
ApolloError: HTTP fetch failed from 'kotlin': 406: Not Acceptable
Invalid credentials provided
    at new ApolloError`.trim(),
    );
  } finally {
    await mocks.loadDefaultMocks(baseUri);
    await reloadService();
  }
});
