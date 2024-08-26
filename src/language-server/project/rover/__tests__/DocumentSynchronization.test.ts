import { Source } from "graphql";
import { extractGraphQLSources } from "../../../document";
import { handleFilePartUpdates } from "../DocumentSynchronization";
import { TextDocument } from "vscode-languageserver-textdocument";

const initialFile = `
Test
gql\`
query Test1 {
  test
}
\`

More test

gql\`
query Test2 {
  test
}
\`
`;

const editedFile = `
Test edited
foo
bar
gql\`
query Test1 {
  test
}
\`

More test lalala

gql\`
query Test2 {
  test
}
\`
More stuff here
`;

const insertedFile = `
Test edited
foo
bar
gql\`
query Test1 {
  test
}
\`
More test lalala

gql\`
query Test3 {
  test
}
\`
More test lalala

gql\`
query Test2 {
  test
}
\`
More stuff here
`;

const pushedFile = `
Test edited
foo
bar
gql\`
query Test1 {
  test
}
\`
More test lalala

gql\`
query Test2 {
  test
}
\`
More test lalala

gql\`
query Test3 {
  test
}
\`
More stuff here
`;

const shiftedFile = `
Test
More test

gql\`
query Test2 {
  test
}
\`
`;

const poppedFile = `
Test
gql\`
query Test1 {
  test
}
\`

More test

`;

const query1 = `
query Test1 {
  test
}
`;
const query2 = `
query Test2 {
  test
}
`;
const query3 = `
query Test3 {
  test
}
`;

describe("handleFilePartUpdates", () => {
  const initialUpdates = handleFilePartUpdates(
    extractGraphQLSources(
      TextDocument.create("uri", "javascript", 1, initialFile),
    )!,
    [],
  );

  test("newly parsed file", () => {
    expect(initialUpdates).toEqual([
      {
        fractionalIndex: "a0",
        diagnostics: [],
        source: new Source(query1, "uri", {
          column: 5,
          line: 3,
        }),
      },
      {
        fractionalIndex: "a1",
        diagnostics: [],
        source: new Source(query2, "uri", {
          column: 5,
          line: 11,
        }),
      },
    ]);
  });

  test("edited file", () => {
    expect(
      handleFilePartUpdates(
        extractGraphQLSources(
          TextDocument.create("uri", "javascript", 2, editedFile),
        )!,
        initialUpdates,
      ),
    ).toEqual([
      {
        fractionalIndex: "a0",
        diagnostics: [],
        source: new Source(query1, "uri", {
          column: 5,
          line: 5,
        }),
      },
      {
        fractionalIndex: "a1",
        diagnostics: [],
        source: new Source(query2, "uri", {
          column: 5,
          line: 13,
        }),
      },
    ]);
  });

  test("inserted file", () => {
    expect(
      handleFilePartUpdates(
        extractGraphQLSources(
          TextDocument.create("uri", "javascript", 2, insertedFile),
        )!,
        initialUpdates,
      ),
    ).toEqual([
      {
        fractionalIndex: "a0",
        diagnostics: [],
        source: new Source(query1, "uri", {
          column: 5,
          line: 5,
        }),
      },
      {
        fractionalIndex: "a0V",
        diagnostics: [],
        source: new Source(query3, "uri", {
          column: 5,
          line: 12,
        }),
      },
      {
        fractionalIndex: "a1",
        diagnostics: [],
        source: new Source(query2, "uri", {
          column: 5,
          line: 19,
        }),
      },
    ]);
  });

  test("pushed file", () => {
    expect(
      handleFilePartUpdates(
        extractGraphQLSources(
          TextDocument.create("uri", "javascript", 2, pushedFile),
        )!,
        initialUpdates,
      ),
    ).toEqual([
      {
        fractionalIndex: "a0",
        diagnostics: [],
        source: new Source(query1, "uri", {
          column: 5,
          line: 5,
        }),
      },
      {
        fractionalIndex: "a1",
        diagnostics: [],
        source: new Source(query2, "uri", {
          column: 5,
          line: 12,
        }),
      },
      {
        fractionalIndex: "a2",
        diagnostics: [],
        source: new Source(query3, "uri", {
          column: 5,
          line: 19,
        }),
      },
    ]);
  });

  test("shifted file", () => {
    expect(
      handleFilePartUpdates(
        extractGraphQLSources(
          TextDocument.create("uri", "javascript", 2, shiftedFile),
        )!,
        initialUpdates,
      ),
    ).toEqual([
      {
        fractionalIndex: "a1",
        diagnostics: [],
        source: new Source(query2, "uri", {
          column: 5,
          line: 5,
        }),
      },
    ]);
  });

  test("popped file", () => {
    expect(
      handleFilePartUpdates(
        extractGraphQLSources(
          TextDocument.create("uri", "javascript", 2, poppedFile),
        )!,
        initialUpdates,
      ),
    ).toEqual([
      {
        fractionalIndex: "a0",
        diagnostics: [],
        source: new Source(query1, "uri", {
          column: 5,
          line: 3,
        }),
      },
    ]);
  });
});
