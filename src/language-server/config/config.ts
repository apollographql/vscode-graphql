import { dirname } from "path";
import { URI } from "vscode-uri";
import { getGraphIdFromConfig, parseServiceSpecifier } from "./utils";
import { Debug } from "../utilities";
import z from "zod";
import { ValidationRule } from "graphql/validation/ValidationContext";
import { Slot } from "@wry/context";

export interface Context {
  apiKey?: string;
  serviceName?: string;
}
const context = new Slot<Context>();

const clientIdentitySchema = z.object({
  name: z.string().default("Apollo Language Server"),
  referenceID: z.string().default("146d29c0-912c-46d3-b686-920e52586be6"),
  version: z.string().default(require("../../../package.json").version),
});

export const defaultClientIdentity = clientIdentitySchema.parse({});

const defaultConfigBase = clientIdentitySchema.merge(
  z.object({
    includes: z
      .array(z.string())
      .default(["src/**/*.{ts,tsx,js,jsx,graphql,gql}"]),
    excludes: z.array(z.string()).default(["**/node_modules", "**/__tests__"]),
    validationRules: z
      .union([
        z.array(z.custom<ValidationRule>()),
        z.function().args(z.custom<ValidationRule>()).returns(z.boolean()),
      ])
      .optional(),
    tagName: z.string().default("gql"),
  }),
);
const studioServiceConfig = z.string();

const remoteServiceConfig = z.object({
  name: z.string().optional(),
  url: z.string(),
  headers: z.record(z.string()).default({}),
  skipSSLValidation: z.boolean().default(false),
});
export type RemoteServiceConfig = z.infer<typeof remoteServiceConfig>;

const localServiceConfig = z.object({
  name: z.string().optional(),
  localSchemaFile: z.union([z.string(), z.array(z.string())]),
});
export type LocalServiceConfig = z.infer<typeof localServiceConfig>;

const clientServiceConfig = z.preprocess(
  (value) => value || context.getValue()?.serviceName,
  z.union([studioServiceConfig, remoteServiceConfig, localServiceConfig]),
);
export type ClientServiceConfig = z.infer<typeof clientServiceConfig>;

const clientConfig = defaultConfigBase.merge(
  z.object({
    service: clientServiceConfig,
  }),
);
export type ClientConfigFormat = z.infer<typeof clientConfig>;

const roverConfig = defaultConfigBase.merge(
  z.object({
    bin: z.string().optional(),
    profile: z.string().optional(),
  }),
);
type RoverConfigFormat = z.infer<typeof roverConfig>;

const engineConfig = z.object({
  endpoint: z
    .string()
    .default(
      process.env.APOLLO_ENGINE_ENDPOINT ||
        "https://graphql.api.apollographql.com/api/graphql",
    ),
  apiKey: z.preprocess(
    (val) => val || context.getValue()?.apiKey,
    z.string().optional(),
  ),
});
export type EngineConfig = z.infer<typeof engineConfig>;

const baseConfig = z.object({
  engine: engineConfig.default({}),
});

const fullClientConfig = baseConfig.merge(z.object({ client: clientConfig }));
export type FullClientConfigFormat = z.infer<typeof fullClientConfig>;

const roverDefaults = roverConfig.parse({});
const fullRoverConfig = baseConfig.merge(
  z.object({
    rover: z
      .union([
        z.boolean().refine((b) => b === true, {
          message: "Rover config must be an object or true to use defaults.",
        }),
        roverConfig,
      ])
      .transform((val) => (typeof val === "boolean" ? roverDefaults : val)),
  }),
);
export type FullRoverConfigFormat = z.infer<typeof fullRoverConfig>;

export const configSchema = z.union([fullClientConfig, fullRoverConfig]);
export type RawApolloConfigFormat = z.input<typeof configSchema>;
export type ParsedApolloConfigFormat = z.output<typeof configSchema>;

export function parseApolloConfig(
  rawConfig: RawApolloConfigFormat,
  configURI?: URI,
  ctx: Context = {},
) {
  const parsed = context.withValue(ctx, () =>
    configSchema.safeParse(rawConfig),
  );
  if (!parsed.success) {
    Debug.error("Error parsing config file:"); // TODO parsed.error
    return null;
  }
  if ("client" in parsed.data) {
    return new ClientConfig(parsed.data, configURI);
  } else if ("rover" in parsed.data) {
    return new RoverConfig(parsed.data, configURI);
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
    public rawConfig: ParsedApolloConfigFormat,
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
    public rawConfig: FullClientConfigFormat,
    public configURI?: URI,
  ) {
    super(rawConfig, configURI);
    this.client = rawConfig.client;
  }
}

export class RoverConfig extends ApolloConfig {
  public rover!: RoverConfigFormat;

  constructor(
    public rawConfig: FullRoverConfigFormat,
    public configURI?: URI,
  ) {
    super(rawConfig, configURI);
    this.rover = rawConfig.rover;
  }
}
