import { cosmiconfig, defaultLoaders } from "cosmiconfig";
import { resolve } from "path";
import { readFileSync, existsSync, lstatSync } from "fs";
import {
  ApolloConfig,
  RawApolloConfigFormat,
  parseApolloConfig,
} from "./config";
import { getServiceFromKey } from "./utils";
import { URI } from "vscode-uri";
import { Debug } from "../utilities";
import { loadTs } from "./loadTsConfig";

// config settings
const MODULE_NAME = "apollo";
const defaultFileNames = [
  "package.json",
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.ts`,
  `${MODULE_NAME}.config.mjs`,
  `${MODULE_NAME}.config.cjs`,
];
const envFileNames = [".env", ".env.local"];

export const keyEnvVar = "APOLLO_KEY";

export interface LoadConfigSettings {
  // the current working directory to start looking for the config
  // config loading only works on node so we default to
  // process.cwd()
  configPath: string;
}

export type ConfigResult<T> = {
  config: T;
  filepath: string;
  isEmpty?: boolean;
} | null;

// XXX load .env files automatically

export async function loadConfig({
  configPath,
}: LoadConfigSettings): Promise<ApolloConfig | null> {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: defaultFileNames,
    loaders: {
      ...defaultLoaders,
      [".ts"]: loadTs,
    },
  });

  // search can fail if a file can't be parsed (ex: a nonsense js file) so we wrap in a try/catch
  let loadedConfig: ConfigResult<RawApolloConfigFormat>;
  try {
    loadedConfig = (await explorer.search(
      configPath,
    )) as ConfigResult<RawApolloConfigFormat>;
  } catch (error) {
    throw new Error(`A config file failed to load with options: ${JSON.stringify(
      arguments[0],
    )}.
    The error was: ${error}`);
  }

  if (!loadedConfig || loadedConfig.isEmpty) {
    Debug.error(
      `No Apollo config found for project or config file failed to load. For more information, please refer to: https://go.apollo.dev/t/config`,
    );
    // deliberately returning `null` here, but not throwing an error - the user may not have a config file and that's okay, it might just be a project without a graph
    return null;
  }

  if (loadedConfig.filepath.endsWith("package.json")) {
    Debug.warning(
      'The "apollo" package.json configuration key will no longer be supported in Apollo v3. Please use the apollo.config.js file for Apollo project configuration. For more information, see: https://go.apollo.dev/t/config',
    );
  }

  // add API key from the env
  let apiKey, nameFromKey;

  // loop over the list of possible .env files and try to parse for key
  // and service name. Files are scanned and found values are preferred
  // in order of appearance in `envFileNames`.
  envFileNames.forEach((envFile) => {
    const dotEnvPath = resolve(configPath, envFile);

    if (existsSync(dotEnvPath) && lstatSync(dotEnvPath).isFile()) {
      const env: { [key: string]: string } = require("dotenv").parse(
        readFileSync(dotEnvPath),
      );
      apiKey = env[keyEnvVar];
    }
  });

  if (apiKey) {
    nameFromKey = getServiceFromKey(apiKey);
  }

  let { config, filepath } = loadedConfig;

  return parseApolloConfig(config, URI.file(resolve(filepath)), {
    apiKey,
    serviceName: nameFromKey,
  });
}
