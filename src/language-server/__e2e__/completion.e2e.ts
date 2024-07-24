import { closeAllEditors, testCompletion } from "./utils";

beforeEach(closeAllEditors);

describe("local schema", () => {
  test("property", async () => {
    await testCompletion(
      "localSchema/src/test.js",
      [4, 8],
      [["name", "String!"]],
    );
  });
});

describe("local schema with extensions", () => {
  test("property", async () => {
    await testCompletion(
      "clientSchema/src/test.js",
      [4, 8],
      [["name", "String!"]],
    );
    await testCompletion(
      "clientSchema/src/test.js",
      [5, 8],
      [["model", "String"]],
    );
  });
});

describe("studio graph", () => {
  test("property", async () => {
    await testCompletion(
      "spotifyGraph/src/test.js",
      [6, 15],
      [["displayName", "String"]],
    );
  });
});

describe("http schema", () => {
  test("property", async () => {
    await testCompletion(
      "httpSchema/src/test.js",
      [5, 9],
      [["author", "String"]],
    );
  });
});
