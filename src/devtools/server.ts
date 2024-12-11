import { WebSocketServer } from "ws";
import { Disposable } from "vscode";
import { runServer } from "@apollo/client-devtools-vscode/vscode-server";
import { Debug } from "../debug";
import { EventEmitter } from "node:events";

export const devtoolsEvents = new EventEmitter<{
  toDevTools: [unknown];
  fromDevTools: [unknown];
}>();
devtoolsEvents.addListener("toDevTools", (msg) => {
  Debug.traceMessage(
    `WS > DevTools: ${
      msg && typeof msg === "object" && "type" in msg ? msg.type : "unknown"
    }`,
    "WS > DevTools: %o",
    msg,
  );
});
devtoolsEvents.addListener("fromDevTools", (msg) => {
  Debug.traceMessage(
    `DevTools > WS: ${
      msg && typeof msg === "object" && "type" in msg ? msg.type : "unknown"
    }`,
    "DevTools > WS: %o",
    msg,
  );
});

let id = 1;

export function sendToDevTools(message: unknown) {
  devtoolsEvents.emit("toDevTools", {
    id: `vscode-${id++}`,
    source: "apollo-client-devtools",
    type: "actor",
    message,
  });
}

export let serverState:
  | { port: false | number; disposable: Disposable }
  | undefined = undefined;

export function startServer(port: number) {
  const state = {
    port: false as false | number,
    disposable: new Disposable(() => {
      if (wss) {
        wss.close();
        wss = null;
      }
      if (serverState === state) {
        serverState = undefined;
      }
      sendToDevTools({ type: "port.changed", port, listening: false });
    }),
  };

  if (serverState?.port === port) {
    // nothing to do
    return;
  }
  // changing port, stop the old server
  serverState?.disposable.dispose();
  serverState = state;
  let wss: WebSocketServer | null = new WebSocketServer({ port });
  wss.on("listening", () => {
    state.port = port;
    sendToDevTools({ type: "port.changed", port, listening: true });
  });
  wss.on("close", () => {
    state.disposable.dispose();
  });
  runServer(wss, {
    addListener: (listener) => {
      devtoolsEvents.addListener("fromDevTools", listener);
      return () => {
        devtoolsEvents.removeListener("fromDevTools", listener);
      };
    },
    postMessage: (message) => {
      devtoolsEvents.emit("toDevTools", message);
    },
  });
}
