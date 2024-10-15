import { cosmiconfig, defaultLoaders, Loader } from "cosmiconfig";
import { dirname, resolve } from "path";
import { readFileSync, existsSync, lstatSync } from "fs";
import {
  ApolloConfig,
  RawApolloConfigFormat,
  parseApolloConfig,
} from "./config";
import { getServiceFromKey } from "./utils";
import { URI } from "vscode-uri";
import { Debug } from "../utilities";
import { ParseError, parse as parseJsonC } from "jsonc-parser";
import { loadJs, loadTs } from "./loadTsConfig";

// config settings
const MODULE_NAME = "apollo";
export const supportedConfigFileNames = [
  "package.json",
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.ts`,
  `${MODULE_NAME}.config.mjs`,
  `${MODULE_NAME}.config.cjs`,
  `${MODULE_NAME}.config.yaml`,
  `${MODULE_NAME}.config.yml`,
  `${MODULE_NAME}.config.json`,
];
export const envFileNames = [".env", ".env.local"];

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

const loadJsonc: Loader = (filename, contents) => {
  const errors: ParseError[] = [];
  try {
    return parseJsonC(contents, errors);
  } finally {
    if (errors.length) {
      Debug.error(
        `Error parsing JSONC file ${filename}, file might not be valid JSONC`,
      );
    }
  }
};

export async function loadConfig({
  configPath,
}: LoadConfigSettings): Promise<ApolloConfig | null> {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: supportedConfigFileNames,
    loaders: {
      ...defaultLoaders,
      ".ts": loadTs,
      ".mjs": loadJs,
      ".cjs": loadJs,
      ".js": loadJs,
      ".json": loadJsonc,
    },
  });

  // search can fail if a file can't be parsed (ex: a nonsense js file) so we wrap in a try/catch
  let loadedConfig: ConfigResult<RawApolloConfigFormat>;
  loadedConfig = (await explorer.search(
    configPath,
  )) as ConfigResult<RawApolloConfigFormat>;


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

  const finalConfig = parseApolloConfig(config, URI.file(resolve(filepath)), {
    apiKey,
    serviceName: nameFromKey,
    configPath: dirname(filepath),
  });
  await finalConfig.verify();
  return finalConfig;
}
