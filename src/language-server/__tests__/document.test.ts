import { readFileSync } from "fs";
import { extractGraphQLDocuments, GraphQLDocument } from "../document";
import { TextDocument, Position } from "vscode-languageserver";
import { join } from "path";
import { DocumentNode, OperationDefinitionNode } from "graphql";

describe("extractGraphQLDocuments", () => {
  describe("extracting documents from JavaScript template literals", () => {
    const mockTextDocument = (text: string): TextDocument => ({
      getText: jest.fn().mockReturnValue(text),
      offsetAt(): number {
        return 0;
      },
      positionAt(): Position {
        return {
          character: 0,
          line: 0,
        };
      },
      languageId: "javascript",
      lineCount: 0,
      uri: "",
      version: 1,
    });

    it("works with placeholders that span multiple rows", () => {
      const textDocument = mockTextDocument(`
      gql\`
        {
          hero {
            ...Hero_character
          }
        }

        \${Hero.fragments
          .character}
      \`
    `);
      const documents = extractGraphQLDocuments(textDocument);

      expect(documents?.length).toEqual(1);
      expect(documents?.[0].syntaxErrors.length).toBe(0);
      expect(documents?.[0].ast?.definitions.length).toBe(1);
      expect(replaceWhitespaceWithDots(documents![0].source.body))
        .toMatchInlineSnapshot(`
"
········{
··········hero·{
············...Hero_character
··········}
········}

·············································
······"
`);
    });

    it("works with multiple placeholders in a document", () => {
      const textDocument = mockTextDocument(`
      gql\`
        {
          hero {
            ...Hero_character
          }
        }

        \${Hero.fragments.character}

        {
          reviews(episode: NEWHOPE) {
            ...ReviewList_reviews
          }
        }

        \${ReviewList.fragments.reviews}
      \`
    `);
      const documents = extractGraphQLDocuments(textDocument);

      expect(documents?.length).toEqual(1);
      expect(documents?.[0].syntaxErrors.length).toBe(0);
      expect(documents?.[0].ast?.definitions.length).toBe(2);
      expect(replaceWhitespaceWithDots(documents![0].source.body))
        .toMatchInlineSnapshot(`
"
········{
··········hero·{
············...Hero_character
··········}
········}

··································

········{
··········reviews(episode:·NEWHOPE)·{
············...ReviewList_reviews
··········}
········}

······································
······"
`);
    });

    it("works with a custom tagname", () => {
      const textDocument = mockTextDocument(`
      gqltag\`
        {
          hero {
            ...Hero_character
          }
        }

        \${Hero.fragments.character}

        {
          reviews(episode: NEWHOPE) {
            ...ReviewList_reviews
          }
        }

        \${ReviewList.fragments.reviews}
      \`
    `);
      const documents = extractGraphQLDocuments(textDocument, "gqltag");

      expect(documents?.length).toEqual(1);
      expect(documents![0].syntaxErrors.length).toBe(0);
      expect(documents![0].ast?.definitions.length).toBe(2);
      expect(replaceWhitespaceWithDots(documents![0].source.body))
        .toMatchInlineSnapshot(`
"
········{
··········hero·{
············...Hero_character
··········}
········}

··································

········{
··········reviews(episode:·NEWHOPE)·{
············...ReviewList_reviews
··········}
········}

······································
······"
`);
    });

    it("works with parens", () => {
      const textDocument = mockTextDocument(`
      gql(\`
        {
          hero {
            ...Hero_character
          }
        }

        \${Hero.fragments.character}

        {
          reviews(episode: NEWHOPE) {
            ...ReviewList_reviews
          }
        }

      \${ReviewList.fragments.reviews}
    \`)
    `);
      const documents = extractGraphQLDocuments(textDocument);

      expect(documents?.length).toEqual(1);
      expect(documents?.[0].syntaxErrors.length).toBe(0);
      expect(documents?.[0].ast?.definitions.length).toBe(2);
      expect(replaceWhitespaceWithDots(documents![0].source.body))
        .toMatchInlineSnapshot(`
"
········{
··········hero·{
············...Hero_character
··········}
········}

··································

········{
··········reviews(episode:·NEWHOPE)·{
············...ReviewList_reviews
··········}
········}

····································
····"
`);
    });

    test("fixtures", () => {
      function loadFixture(name: string) {
        const path = join(__dirname, "fixtures", "documents", name);
        const body = readFileSync(path, "utf8");

        return extractGraphQLDocuments(
          TextDocument.create(`file://${path}.js`, "javascript", 1, body),
        )!;
      }
      function documentName(document: GraphQLDocument) {
        expect(document.syntaxErrors.length).toBe(0);
        let first = document.ast?.definitions[0];
        expect(first).toBeDefined();
        expect(first!.kind).toBe("OperationDefinition");
        first = first as OperationDefinitionNode;
        return (first.name && first.name.value) || "Unnamed";
      }

      expect(loadFixture("commentWithTemplate.ts").map(documentName))
        .toMatchInlineSnapshot(`
Array [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q6",
  "Q8",
  "Q9",
  "Q10",
]
`);
      expect(loadFixture("functionCall.ts").map(documentName))
        .toMatchInlineSnapshot(`
Array [
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q9",
  "Q10",
  "Q11",
]
`);
      expect(loadFixture("taggedTemplate.ts").map(documentName))
        .toMatchInlineSnapshot(`
Array [
  "Foo",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
  "Q7",
  "Q8",
  "Q9",
  "Q10",
  "Q11",
]
`);
      expect(loadFixture("templateWithComment.ts").map(documentName))
        .toMatchInlineSnapshot(`
Array [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q5",
  "Q6",
]
`);
    });
  });

  describe("extracting documents from ReasonML extension nodes", () => {
    const mockTextDocument = (text: string): TextDocument => ({
      getText: jest.fn().mockReturnValue(text),
      offsetAt(): number {
        return 0;
      },
      positionAt(): Position {
        return {
          character: 0,
          line: 0,
        };
      },
      languageId: "reason",
      lineCount: 0,
      uri: "",
      version: 1,
    });

    it("works with ReasonRelay nodes", () => {
      const textDocument = mockTextDocument(`
      module Query = [%relay.query
      {|
        query SomeQuery {
          id
        }
      |}
      ];

      module Fragment = [%relay.fragment
      {|
        fragment X on Hero {
          id
        }
      |}
      ];
    `);
      const documents = extractGraphQLDocuments(textDocument);

      expect(documents?.length).toEqual(2);
      expect(documents?.[0].syntaxErrors.length).toBe(0);
      expect(documents?.[1].syntaxErrors.length).toBe(0);
      expect(documents?.[0].ast?.definitions.length).toBe(1);
      expect(documents?.[1].ast?.definitions.length).toBe(1);
    });

    it("works with graphql_ppx style node", () => {
      const textDocument = mockTextDocument(`
      module Query = [%graphql
      {|
        query SomeQuery {
          id
        }
      |}
      ];
    `);
      const documents = extractGraphQLDocuments(textDocument);

      expect(documents?.length).toEqual(1);
      expect(documents?.[0].syntaxErrors.length).toBe(0);
      expect(documents?.[0].ast?.definitions.length).toBe(1);
    });
  });
});

/**
 * When editing this file manually, prettier will remove long bouts of whitespace in template strings on save,
 * which messes up inline snapshots. This function replaces spaces with dots to prevent that.
 */
function replaceWhitespaceWithDots(str: string) {
  return str.replace(/[ ]/g, "·");
}
