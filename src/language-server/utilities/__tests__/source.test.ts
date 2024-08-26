import { extractGraphQLSources } from "../../document";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  findContainedSourceAndPosition,
  positionFromPositionInContainingDocument,
  positionInContainingDocument,
} from "../source";
import { handleFilePartUpdates } from "../../project/rover/DocumentSynchronization";

const testText = `import gql from "graphql-tag";

const foo = 1

gql\`
  query Test {
    droid(id: "2000") {
      name
    }

}\`;

const verylonglala = gql\`type Foo { baaaaaar: String }\`
`;
describe("positionFromPositionInContainingDocument", () => {
  const sources = extractGraphQLSources(
    TextDocument.create("uri", "javascript", 1, testText),
    "gql",
  )!;

  test("should return the correct position inside a document", () => {
    expect(
      positionFromPositionInContainingDocument(sources[0], {
        line: 5,
        character: 3,
      }),
    ).toEqual({ line: 1, character: 3 });
  });

  test("should return the correct position on the first line of a document", () => {
    expect(
      positionFromPositionInContainingDocument(sources[0], {
        line: 4,
        character: 4,
      }),
    ).toEqual({ line: 0, character: 0 });
  });

  test("should return the correct position on a single line document", () => {
    expect(
      positionFromPositionInContainingDocument(sources[1], {
        line: 12,
        character: 46,
      }),
    ).toEqual({ line: 0, character: 21 });
  });
});

describe("findContainedSourceAndPosition", () => {
  const parts = handleFilePartUpdates(
    extractGraphQLSources(
      TextDocument.create("uri", "javascript", 1, testText),
      "gql",
    )!,
    [],
  );

  test("should return the correct position inside a document", () => {
    expect(
      findContainedSourceAndPosition(parts, {
        line: 5,
        character: 3,
      }),
    ).toEqual({ ...parts[0], position: { line: 1, character: 3 } });
  });

  test("should return the correct position on the first line of a document", () => {
    expect(
      findContainedSourceAndPosition(parts, {
        line: 4,
        character: 4,
      }),
    ).toEqual({ ...parts[0], position: { line: 0, character: 0 } });
  });

  test("should return the correct position on the last line of a document", () => {
    expect(
      findContainedSourceAndPosition(parts, {
        line: 10,
        character: 0,
      }),
    ).toEqual({ ...parts[0], position: { line: 6, character: 0 } });
  });

  test("should return null if the position is outside of the document", () => {
    expect(
      findContainedSourceAndPosition(parts, {
        line: 4,
        character: 3,
      }),
    ).toBeNull();
    expect(
      findContainedSourceAndPosition(parts, {
        line: 10,
        character: 1,
      }),
    ).toBeNull();
  });

  test("should return the correct position on a single line document", () => {
    expect(
      findContainedSourceAndPosition(parts, {
        line: 12,
        character: 46,
      }),
    ).toEqual({ ...parts[1], position: { line: 0, character: 21 } });
  });
});
describe("positionInContainingDocument", () => {
  const parts = handleFilePartUpdates(
    extractGraphQLSources(
      TextDocument.create("uri", "javascript", 1, testText),
      "gql",
    )!,
    [],
  );

  test("should return the correct position inside a document", () => {
    expect(
      positionInContainingDocument(parts[0].source, {
        line: 1,
        character: 3,
      }),
    ).toEqual({ line: 5, character: 3 });
  });

  test("should return the correct position on the first line of a document", () => {
    expect(
      positionInContainingDocument(parts[0].source, {
        line: 0,
        character: 0,
      }),
    ).toEqual({ line: 4, character: 4 });
  });

  test("should return the correct position on the last line of a document", () => {
    expect(
      positionInContainingDocument(parts[0].source, {
        line: 6,
        character: 0,
      }),
    ).toEqual({ line: 10, character: 0 });
  });

  test("should return the correct position on a single line document", () => {
    expect(
      positionInContainingDocument(parts[1].source, {
        line: 0,
        character: 21,
      }),
    ).toEqual({ line: 12, character: 46 });
  });
});
