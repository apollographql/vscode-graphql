import { testCompletion } from "./utils";
describe("local schema", () => {
  test("property", async () => {
    testCompletion(
      "localSchema/src/test.js",
      [4, 8],
      [["name", " String!"]],
      true,
    );
  });
});

describe("local schema with extensions", () => {
  test("property", async () => {
    testCompletion(
      "clientSchema/src/test.js",
      [4, 8],
      [["name", " String!"]],
      true,
    );
    testCompletion(
      "clientSchema/src/test.js",
      [5, 8],
      [["model", " String!"]],
      true,
    );
  });
});
