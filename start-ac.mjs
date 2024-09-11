#!/usr/bin/env node

// for testing, start a few of these, e.g. with
// while true; do echo "foo\nbar\nbaz" | parallel ./start-ac.mjs; sleep 1; done

import { registerClient } from "@apollo/client-devtools-vscode";
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
    maxUsageCount: 1000,
  },
  {
    request: {
      query: gql`
        query {
          hi
        }
      `,
    },
    result: { data: { hi: "universe" } },
    maxUsageCount: 1000,
  },
]);
const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  devtools: { name: process.argv[2] },
});
client.watchQuery({ query: helloWorld }).subscribe({ next() {} });
const { connected, unregister, onCleanup } = registerClient(
  client,
  "ws://localhost:7095", // nosemgrep
);
console.log("connecting...");
onCleanup((reason) =>
  console.log(
    "disconnected",
    reason,
    /* referencing client here to prevent it from getting garbage connected */ client.version,
  ),
);
connected.then(() => {
  console.log("connected");
  //  setTimeout(unregister, 5000, "USERLAND_TIMEOUT");
});
