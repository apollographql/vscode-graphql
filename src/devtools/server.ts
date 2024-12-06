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
  Debug.info("WS > DevTools: " + JSON.stringify(msg));
});
devtoolsEvents.addListener("fromDevTools", (msg) => {
  Debug.info("DevTools > WS: " + JSON.stringify(msg));
});

export function startServer(port: number): Disposable {
  let wss: WebSocketServer | null = new WebSocketServer({ port });
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

  return new Disposable(() => {
    wss?.close();
    wss = null;
  });
}
