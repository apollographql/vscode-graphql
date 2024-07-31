// @ts-check
const http = require("http");
const {
  parseRequestParams,
  createHandler,
} = require("graphql-http/lib/use/http");
const { buildSchema } = require("graphql");
const { Trie } = require("@wry/trie");

function runMockServer(port, onStart = (port) => {}) {
  const mocks = new Trie(false);

  const server = http.createServer(async (req, res) => {
    if (req.url === "/apollo") {
      if (req.method === "POST") {
        const { operationName, variables, extensions } =
          await parseRequestParams(req, res);

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
      } else if (req.method === "PUT") {
        const body = await new Promise((resolve) => {
          let body = "";
          req.setEncoding("utf-8");
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => resolve(body));
        });
        const { operationName, variables, response } = JSON.parse(body);
        mocks.lookup(operationName, JSON.stringify(variables)).response =
          response;
        //console.info("mock loaded", { operationName, variables });
        res.end();
      }
    } else if (req.url === "/graphql") {
      handler(req, res);
    } else {
      res.writeHead(404).end();
    }
  });

  server.on("error", (err) => {
    console.log("Failed to start server", err);
  });

  console.log("Starting server...");
  server.listen(port);
  onStart(port);
  console.log(`Server ready at: http://localhost:${port}`);
  return {
    [Symbol.dispose]() {
      console.log("Closing server...");
      server.close();
      console.log("Server closed");
    },
  };
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
const handler = createHandler({
  schema,
});

if (require.main === module) {
  runMockServer(7096, require("./mocks.js").loadDefaultMocks);
}

module.exports.runMockServer = runMockServer;
