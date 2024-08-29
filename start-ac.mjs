import { registerClient } from "./devtool-build/vscode-client.js";
import WebSocket from "ws";
import { ApolloClient, InMemoryCache } from "@apollo/client/core/index.js";
import { MockLink } from "@apollo/client/testing/core/index.js";
import gql from "graphql-tag";

globalThis.WebSocket ||= WebSocket;

const helloWorld = gql`
  query {
    hello
  }
`;

const link = new MockLink([
  {
    request: { query: helloWorld },
    result: { data: { hello: "world" } },
  },
]);
const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
client.watchQuery({ query: helloWorld }).subscribe({ next() {} });

registerClient(client, "ws://localhost:8090");
