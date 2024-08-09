import {
  GraphQLSchemaProvider,
  SchemaChangeUnsubscribeHandler,
  SchemaResolveConfig,
} from "./base";
import {
  ApolloConfig,
  isClientConfig,
  isLocalServiceConfig,
  ClientConfig,
} from "../../config";

import { EndpointSchemaProvider } from "./endpoint";
import { EngineSchemaProvider } from "./engine";
import { FileSchemaProvider } from "./file";
import { ClientIdentity } from "../../engine";

export {
  GraphQLSchemaProvider,
  SchemaChangeUnsubscribeHandler,
  SchemaResolveConfig,
};

export function schemaProviderFromConfig(
  config: ApolloConfig,
  clientIdentity: ClientIdentity, // engine provider needs this
): GraphQLSchemaProvider {
  if (isClientConfig(config)) {
    if (typeof config.client.service === "string") {
      return new EngineSchemaProvider(config, clientIdentity);
    }

    if (config.client.service) {
      if (isLocalServiceConfig(config.client.service)) {
        const isListOfSchemaFiles = Array.isArray(
          config.client.service.localSchemaFile,
        );
        return new FileSchemaProvider(
          isListOfSchemaFiles
            ? { paths: config.client.service.localSchemaFile as string[] }
            : {
                path: config.client.service.localSchemaFile as string,
              },
        );
      }

      return new EndpointSchemaProvider(config.client.service);
    }
  }

  if (config.graph && config.engine) {
    return new EngineSchemaProvider(config as ClientConfig, clientIdentity);
  }

  throw new Error(
    "No schema provider was created, because the project type was unable to be resolved from your config. Please add either a client or service config. For more information, please refer to https://go.apollo.dev/t/config",
  );
}
