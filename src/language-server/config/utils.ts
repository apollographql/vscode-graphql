import {
  ApolloConfig,
  ClientConfig,
  ClientServiceConfig,
  LocalServiceConfig,
  ParsedApolloConfigFormat,
} from "./config";
import { ServiceSpecifier, ServiceIDAndTag } from "../engine";

export function isClientConfig(config: ApolloConfig): config is ClientConfig {
  return config instanceof ClientConfig;
}

// checks the `config.client.service` object for a localSchemaFile
export function isLocalServiceConfig(
  config: ClientServiceConfig,
): config is LocalServiceConfig {
  return !!(config as LocalServiceConfig).localSchemaFile;
}

export function getServiceFromKey(key?: string) {
  if (key) {
    const [type, service] = key.split(":");
    if (type === "service") return service;
  }
  return;
}

export function getGraphIdFromConfig(config: ParsedApolloConfigFormat) {
  if ("client" in config) {
    if (typeof config.client.service === "string") {
      return parseServiceSpecifier(
        config.client.service as ServiceSpecifier,
      )[0];
    }
    return config.client.service && config.client.service.name;
  } else {
    return undefined;
  }
}

export function parseServiceSpecifier(specifier: ServiceSpecifier) {
  const [id, tag] = specifier.split("@").map((x) => x.trim());
  return [id, tag] as ServiceIDAndTag;
}
