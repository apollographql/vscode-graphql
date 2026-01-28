import { GraphQLClientProject } from "../client";
import { basename } from "path";
import { DiagnosticSeverity } from "vscode-languageserver/node";

import { vol } from "memfs";
import { LoadingHandler } from "../../loadingHandler";
import { ClientConfig, parseApolloConfig } from "../../config";
import { URI } from "vscode-uri";

const serviceSchema = /* GraphQL */ `
  type Query {
    me: User
  }

  type User {
    name: String
    friends: [User]
  }
`;

// Operation with name "GetUser" in first file
const fileA = /* GraphQL */ `
  query GetUser {
    me {
      name
    }
  }
`;

// Operation with same name "GetUser" in second file
const fileB = /* GraphQL */ `
  query GetUser {
    me {
      friends {
        name
      }
    }
  }
`;

// File with two operations with duplicate names in the same file
const fileWithDuplicates = /* GraphQL */ `
  query DuplicateOp {
    me {
      name
    }
  }

  query DuplicateOp {
    me {
      friends {
        name
      }
    }
  }
`;

const rootURI = URI.file(process.cwd());

const config = parseApolloConfig({
  client: {
    service: {
      name: "server",
      localSchemaFile: "./schema.graphql",
    },
    includes: ["./src/**.graphql"],
    excludes: ["./__tests__"],
  },
  engine: {},
});

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

describe("Duplicate operation detection", () => {
  afterEach(jest.restoreAllMocks);

  it("should report error diagnostics for duplicate operations across multiple files", async () => {
    vol.fromJSON({
      "apollo.config.js": `module.exports = {
            client: {
                service: {
                    localSchemaFile: './schema.graphql'
                }
            }
        }`,
      "schema.graphql": serviceSchema,
      "src/a.graphql": fileA,
      "src/b.graphql": fileB,
    });

    const project = new GraphQLClientProject({
      config: config as ClientConfig,
      loadingHandler: new MockLoadingHandler(),
      configFolderURI: rootURI,
      clientIdentity: {
        name: "",
        version: "",
        referenceID: "",
      },
    });

    const diagnosticsByFile: Record<string, any[]> = Object.create(null);
    project.onDiagnostics(({ diagnostics, uri }) => {
      const path = basename(URI.parse(uri).path);
      if (!diagnosticsByFile[path]) diagnosticsByFile[path] = [];
      diagnosticsByFile[path].push(...diagnostics);
    });

    await project.whenReady;
    await project.validate();

    // Both files should have error diagnostics
    expect(diagnosticsByFile["a.graphql"]).toBeDefined();
    expect(diagnosticsByFile["b.graphql"]).toBeDefined();

    // Check that both files have diagnostics with Error severity
    const aGraphqlErrors = diagnosticsByFile["a.graphql"].filter(
      (d) => d.severity === DiagnosticSeverity.Error
    );
    const bGraphqlErrors = diagnosticsByFile["b.graphql"].filter(
      (d) => d.severity === DiagnosticSeverity.Error
    );

    expect(aGraphqlErrors.length).toBeGreaterThan(0);
    expect(bGraphqlErrors.length).toBeGreaterThan(0);

    // Check that the diagnostic messages mention duplicate operations
    const aMessage = aGraphqlErrors[0].message;
    const bMessage = bGraphqlErrors[0].message;

    expect(aMessage).toContain("multiple definitions");
    expect(aMessage).toContain("GetUser");
    expect(bMessage).toContain("multiple definitions");
    expect(bMessage).toContain("GetUser");

    // Check that the source is correct
    expect(aGraphqlErrors[0].source).toBe("GraphQL: Validation");
    expect(bGraphqlErrors[0].source).toBe("GraphQL: Validation");
  });

  it("should report error diagnostics for duplicate operations in the same file", async () => {
    vol.fromJSON({
      "apollo.config.js": `module.exports = {
            client: {
                service: {
                    localSchemaFile: './schema.graphql'
                }
            }
        }`,
      "schema.graphql": serviceSchema,
      "src/duplicates.graphql": fileWithDuplicates,
    });

    const project = new GraphQLClientProject({
      config: config as ClientConfig,
      loadingHandler: new MockLoadingHandler(),
      configFolderURI: rootURI,
      clientIdentity: {
        name: "",
        version: "",
        referenceID: "",
      },
    });

    const diagnosticsByFile: Record<string, any[]> = Object.create(null);
    project.onDiagnostics(({ diagnostics, uri }) => {
      const path = basename(URI.parse(uri).path);
      if (!diagnosticsByFile[path]) diagnosticsByFile[path] = [];
      diagnosticsByFile[path].push(...diagnostics);
    });

    await project.whenReady;
    await project.validate();

    // File should have error diagnostics
    expect(diagnosticsByFile["duplicates.graphql"]).toBeDefined();

    // Check that the file has diagnostics with Error severity
    const duplicatesErrors = diagnosticsByFile["duplicates.graphql"].filter(
      (d) => d.severity === DiagnosticSeverity.Error
    );

    // Should have at least 2 error diagnostics (one for each occurrence of DuplicateOp)
    // Note: GraphQL's native validation may also report these, so we might have more
    expect(duplicatesErrors.length).toBeGreaterThanOrEqual(2);

    // Find diagnostics specifically from our duplicate detection (not native GraphQL validation)
    const ourDuplicateErrors = duplicatesErrors.filter(
      (d) => d.message.includes("multiple definitions")
    );

    // We should have exactly 2 diagnostics from our duplicate detection
    expect(ourDuplicateErrors.length).toBe(2);

    // Check that both diagnostic messages mention duplicate operations
    expect(ourDuplicateErrors[0].message).toContain("multiple definitions");
    expect(ourDuplicateErrors[0].message).toContain("DuplicateOp");
    expect(ourDuplicateErrors[1].message).toContain("multiple definitions");
    expect(ourDuplicateErrors[1].message).toContain("DuplicateOp");

    // Check that the source is correct
    expect(ourDuplicateErrors[0].source).toBe("GraphQL: Validation");
    expect(ourDuplicateErrors[1].source).toBe("GraphQL: Validation");
  });

  it("should not throw errors when duplicate operations are detected", async () => {
    vol.fromJSON({
      "apollo.config.js": `module.exports = {
            client: {
                service: {
                    localSchemaFile: './schema.graphql'
                }
            }
        }`,
      "schema.graphql": serviceSchema,
      "src/a.graphql": fileA,
      "src/b.graphql": fileB,
    });

    const project = new GraphQLClientProject({
      config: config as ClientConfig,
      loadingHandler: new MockLoadingHandler(),
      configFolderURI: rootURI,
      clientIdentity: {
        name: "",
        version: "",
        referenceID: "",
      },
    });

    project.onDiagnostics(({ diagnostics, uri }) => {
      // Just collect diagnostics, don't do anything with them
    });

    await project.whenReady;

    // This should not throw
    await expect(async () => {
      await project.validate();
    }).not.toThrow();
  });
});
