import { basename } from "path";
import { vol } from "memfs";
import { URI } from "vscode-uri";
import { TextDocument, Position } from "vscode-languageserver";

import { NoMissingClientDirectives } from "../errors/validation";
import { GraphQLClientProject } from "../project/client";
import { LoadingHandler } from "../loadingHandler";
import { ApolloConfig, ClientConfig } from "../config";
import { extractGraphQLDocuments } from "../document";

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
      expect(documents?.[0].syntaxErrors.length).toBe(0);
      expect(documents?.[0].ast?.definitions.length).toBe(2);
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

// failing test for https://github.com/apollographql/vscode-graphql/issues/118

const serviceSchema = /* GraphQL */ `
  type Query {
    me: User
  }

  type User {
    name: String
    friends: [User]
  }
`;
const a = `
  const x = gql(\`
    query SomeQuery {
      currentUser {
        foo
      }
    }
  \`);
`;
const b = `
  /**
   * const query = gql(\`query SomeOtherQuery { hello }\`)
   */
`;

const rootURI = URI.file(process.cwd());

const config = new ApolloConfig({
  client: {
    service: {
      name: "server",
      localSchemaFile: "./schema.graphql",
    },
    includes: ["./src/**.graphql", "./src/**.js"],
    excludes: ["./__tests__"],
  },
  engine: {},
}) as ClientConfig;

class MockLoadingHandler implements LoadingHandler {
  handle<T>(_message: string, value: Promise<T>): Promise<T> {
    return value;
  }
  handleSync<T>(_message: string, value: () => T): T {
    return value();
  }
  showError(_message: string): void {}
}

jest.mock("fs");

describe("document validation", () => {
  beforeEach(() => {
    vol.fromJSON({
      "apollo.config.js": `module.exports = {
            client: {
                service: {
                    localSchemaFile: './schema.graphql'
                }
            }
        }`,
      "schema.graphql": serviceSchema,
      "src/someFile.js": a,
      "src/someFile2.js": b,
    });
  });
  afterEach(jest.restoreAllMocks);

  it("should not report validation errors inside JavaScript comments", async () => {
    const project = new GraphQLClientProject({
      config,
      loadingHandler: new MockLoadingHandler(),
      configFolderURI: rootURI,
    });

    const errors = Object.create(null);
    project.onDiagnostics(({ diagnostics, uri }) => {
      const path = basename(URI.parse(uri).path);
      diagnostics.forEach(({ error }: any) => {
        if (!errors[path]) errors[path] = [];
        errors[path].push(error);
      });
    });

    await project.whenReady;
    await project.validate();

    expect(errors).toMatchInlineSnapshot(`
      Object {
        "someFile.js": Array [
          [GraphQLError: Cannot query field "currentUser" on type "Query".],
        ],
      }
    `);
  });
});
