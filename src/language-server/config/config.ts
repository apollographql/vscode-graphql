import { dirname } from "path";
import merge from "lodash.merge";
import { ClientID, ServiceID, ServiceSpecifier } from "../engine";
import { URI } from "vscode-uri";
import { WithRequired } from "../../env";
import { getGraphIdFromConfig, parseServiceSpecifier } from "./utils";
import { ValidationRule } from "graphql/validation/ValidationContext";
import { Debug } from "../utilities";

export interface EngineStatsWindow {
  to: number;
  from: number;
}

export const DefaultEngineStatsWindow = {
  to: -0,
  from: -86400, // one day
};

export interface HistoricalEngineStatsWindow extends EngineStatsWindow {}

export type EndpointURI = string;
export interface RemoteServiceConfig {
  name: ServiceID;
  url: EndpointURI;
  headers?: { [key: string]: string };
  skipSSLValidation?: boolean;
}

export interface LocalServiceConfig {
  name: ServiceID;
  localSchemaFile: string | string[];
}

export interface EngineConfig {
  endpoint?: EndpointURI;
  readonly apiKey?: string;
}

export const DefaultEngineConfig = {
  endpoint:
    process.env.APOLLO_ENGINE_ENDPOINT ||
    "https://graphql.api.apollographql.com/api/graphql",
};

export const DefaultConfigBase = {
  includes: ["src/**/*.{ts,tsx,js,jsx,graphql,gql}"],
  excludes: ["**/node_modules", "**/__tests__"],
};

export interface ConfigBase {
  includes: string[];
  excludes: string[];
}

export type ClientServiceConfig = RemoteServiceConfig | LocalServiceConfig;

export interface ClientConfigFormat extends ConfigBase {
  // service linking
  service?: ServiceSpecifier | ClientServiceConfig;
  // client identity
  name?: ClientID;
  referenceID?: string;
  version?: string;
  // client schemas
  tagName?: string;
  // stats window config
  statsWindow?: EngineStatsWindow;

  /**
   * Rules that will be applied when validating GraphQL documents.
   *
   * If you wish to modify the default list of validation rules, import them from the apollo package and
   * assign your custom list:
   *
   * ```js
   * const { defaultValidationRules } = require("apollo/lib/defaultValidationRules");
   *
   * module.exports = {
   *   // ...
   *   validationRules: [...defaultValidationRules, ...customRules]
   * }
   * ```
   *
   * Or, if you simply wish to filter out some rules from the default list, you can specify a filter function:
   *
   * ```js
   * module.exports = {
   *   // ...
   *   validationRules: rule => rule.name !== "NoAnonymousQueries"
   * }
   * ```
   */
  validationRules?: ValidationRule[] | ((rule: ValidationRule) => boolean);
}

export const DefaultClientConfig = {
  ...DefaultConfigBase,
  tagName: "gql",
  statsWindow: DefaultEngineStatsWindow,
};
export interface RoverConfigFormat {
  bin?: string;
  profile?: string;
}

export interface ConfigBaseFormat {
  client?: ClientConfigFormat;
  rover?: RoverConfigFormat;
  engine?: EngineConfig;
}

export type ApolloConfigFormat =
  | WithRequired<ConfigBaseFormat, "client">
  | WithRequired<ConfigBaseFormat, "rover">;

export function parseApolloConfig(
  rawConfig: ApolloConfigFormat,
  configURI?: URI,
) {
  if ("client" in rawConfig) {
    return new ClientConfig(rawConfig as any, configURI);
  } else if ("rover" in rawConfig) {
    return new RoverConfig(rawConfig as any, configURI);
  } else if ("service" in rawConfig) {
    Debug.warning(
      "Service-type projects are no longer supported, please use a 'client' or 'rover' type project instead.",
    );
    return null;
  } else {
    Debug.warning("Invalid config file format!");
    return null;
  }
}

export abstract class ApolloConfig {
  public engine: EngineConfig;
  public client?: ClientConfigFormat;
  public rover?: RoverConfigFormat;
  private _variant?: string;
  private _graphId?: string;

  /** @deprecated */
  public isClient = false;
  /** @deprecated */
  public isService = false;

  protected constructor(
    public rawConfig: ApolloConfigFormat,
    public configURI?: URI,
  ) {
    this.engine = rawConfig.engine!;
    this._graphId = getGraphIdFromConfig(rawConfig);
  }

  get configDirURI() {
    // if the filepath has a _file_ in it, then we get its dir
    return this.configURI &&
      this.configURI.fsPath.match(/\.(ts|js|cjs|mjs|json)$/i)
      ? URI.parse(dirname(this.configURI.fsPath))
      : this.configURI;
  }

  set variant(variant: string) {
    this._variant = variant;
  }

  get variant(): string {
    if (this._variant) return this._variant;
    let tag: string = "current";
    if (this.client && typeof this.client.service === "string") {
      const parsedVariant = parseServiceSpecifier(this.client.service)[1];
      if (parsedVariant) tag = parsedVariant;
    }
    return tag;
  }

  set graph(graphId: string | undefined) {
    this._graphId = graphId;
  }

  get graph(): string | undefined {
    if (this._graphId) return this._graphId;
    return getGraphIdFromConfig(this.rawConfig);
  }
}

export class ClientConfig extends ApolloConfig {
  public client!: ClientConfigFormat;
  /** @deprecated */
  public isClient = true as const;

  constructor(
    public rawConfig: WithRequired<ConfigBaseFormat, "client">,
    public configURI?: URI,
  ) {
    super(rawConfig, configURI);
    this.client = rawConfig.client;
  }
}

export class RoverConfig extends ApolloConfig {
  public rover!: RoverConfigFormat;

  constructor(
    public rawConfig: WithRequired<ConfigBaseFormat, "rover">,
    public configURI?: URI,
  ) {
    super(rawConfig, configURI);
    this.rover = rawConfig.rover;
  }
}
