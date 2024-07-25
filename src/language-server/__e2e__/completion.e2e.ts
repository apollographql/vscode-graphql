import { closeAllEditors, openEditor, testCompletion } from "./utils";

beforeEach(closeAllEditors);

describe("local schema", () => {
  test("property", async () => {
    const editor = await openEditor("localSchema/src/test.js");
    await testCompletion(editor, [4, 8], [["name", "String!"]]);
  });
});

describe("local schema with extensions", () => {
  test("property", async () => {
    const editor = await openEditor("clientSchema/src/test.js");
    await testCompletion(editor, [4, 8], [["name", "String!"]]);
    await testCompletion(editor, [5, 8], [["model", "String"]]);
  });
});

describe("studio graph", () => {
  test("property", async () => {
    const editor = await openEditor("spotifyGraph/src/test.js");
    await testCompletion(editor, [6, 15], [["displayName", "String"]]);
  });
});

describe("http schema", () => {
  test("property", async () => {
    const editor = await openEditor("httpSchema/src/test.js");
    await testCompletion(editor, [5, 9], [["author", "String"]]);
  });
});
