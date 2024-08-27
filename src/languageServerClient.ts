import {
  ServerOptions,
  TransportKind,
  LanguageClientOptions,
  LanguageClient,
  RevealOutputChannelOn,
} from "vscode-languageclient/node";
import { workspace, OutputChannel } from "vscode";
import { supportedLanguageIds } from "./tools/utilities/languageInformation";
import type { InitializationOptions } from "./language-server/server";
import { getLangugageInformation } from "./tools/utilities/getLanguageInformation";

const { version, referenceID } = require("../package.json");

const languageIdExtensionMap = getLangugageInformation();
const supportedExtensions = supportedLanguageIds.flatMap(
  (id) => languageIdExtensionMap[id],
);

export function getLanguageServerClient(
  serverModule: string,
  outputChannel: OutputChannel,
) {
  const env = {
    APOLLO_CLIENT_NAME: "Apollo VS Code",
    APOLLO_CLIENT_VERSION: version,
    APOLLO_CLIENT_REFERENCE_ID: referenceID,
    NODE_TLS_REJECT_UNAUTHORIZED: 0,
  };

  const debugOptions = {
    execArgv: ["--nolazy", "--inspect=6009"],
    env,
  };

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env,
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: supportedLanguageIds,
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher("**/.env?(.local)"),
        workspace.createFileSystemWatcher(
          "**/*{" + supportedExtensions.join(",") + "}",
        ),
      ],
    },
    outputChannel,
    revealOutputChannelOn: workspace
      .getConfiguration("apollographql")
      .get("debug.revealOutputOnLanguageServerError")
      ? RevealOutputChannelOn.Error
      : RevealOutputChannelOn.Never,
    initializationOptions: {
      languageIdExtensionMap,
    } satisfies InitializationOptions,
  };

  return new LanguageClient(
    "apollographql",
    "Apollo GraphQL",
    serverOptions,
    clientOptions,
  );
}
