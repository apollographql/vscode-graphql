// @ts-check
const {
  parseRequestParams,
  createHandler,
} = require("graphql-http/lib/use/http");
const { buildSchema } = require("graphql");
const { Trie } = require("@wry/trie");
const { readFileSync } = require("fs");
const { join } = require("path");

async function runMockServer(
  /** @type {number}  */ port,
  useSelfSignedCert = false,
  onStart = (/** @type {string}  */ baseUri) => {},
) {
  const mocks = new Trie(false);

  /**
   *
   * @param {import('node:http').RequestListener} listener
   * @returns
   */
  function createServer(listener) {
    if (useSelfSignedCert) {
      return require("node:https").createServer(
        {
          key: readFileSync(
            join(__dirname, "../../sampleWorkspace/httpSchema/self-signed.key"),
          ),
          cert: readFileSync(
            join(__dirname, "../../sampleWorkspace/httpSchema/self-signed.crt"),
          ),
        },
        listener,
      );
    }
    return require("node:http").createServer(listener);
  }

  const server = createServer(async (req, res) => {
    if (req.url === "/apollo") {
      if (req.method === "POST") {
        await handleApolloPost(req, res);
      } else if (req.method === "PUT") {
        await handleApolloPut(req, res);
      }
    } else if (req.url === "/graphql") {
      schemaHandler(req, res);
    } else {
      res.writeHead(404).end();
    }
  });

  server.on("error", (err) => {
    console.log("Failed to start server", err);
  });

  console.log("Starting server...");
  server.listen(port);
  const baseUri = `${useSelfSignedCert ? "https" : "http"}://localhost:${port}`;
  await onStart(baseUri);
  console.log(`Server ready at: ${baseUri}`);
  return {
    [Symbol.dispose]() {
      console.log("Closing server...");
      server.close();
      console.log("Server closed");
    },
  };

  /**
   * Mock GraphQL Endpoint Handler
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async function handleApolloPost(req, res) {
    const { operationName, variables } =
      /** @type{import("graphql-http/lib/common").RequestParams} */ (
        await parseRequestParams(req, res)
      );

    const mock = mocks.peek(operationName, JSON.stringify(variables));
    if (mock) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(mock.response));
    } else {
      console.warn("No mock available for %o", {
        operationName,
        variables,
      });
      res.writeHead(200).end(
        JSON.stringify({
          data: null,
          errors: [
            {
              message: "No mock found.",
              extensions: { operationName, variables },
            },
          ],
        }),
      );
    }
  }

  /**
   * Handler to accept new GraphQL Mocks
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  async function handleApolloPut(req, res) {
    const body = await new Promise((resolve) => {
      let body = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => resolve(body));
    });
    const { operationName, variables, response } = JSON.parse(body);
    mocks.lookup(operationName, JSON.stringify(variables)).response = response;
    //console.info("mock loaded", { operationName, variables });
    res.end();
  }
}

const schema = buildSchema(`#graphql
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [Book]
  }
`);
const schemaHandler = createHandler({
  schema,
});

if (require.main === module) {
  runMockServer(7096, false, require("./mocks.js").loadDefaultMocks);
  runMockServer(7097, true, require("./mocks.js").loadDefaultMocks);
}

module.exports.runMockServer = runMockServer;
