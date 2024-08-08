import { dirname } from "path";
import { URI } from "vscode-uri";
import { getGraphIdFromConfig, parseServiceSpecifier } from "./utils";
import { Debug } from "../utilities";
import z, { ZodError } from "zod";
import { ValidationRule } from "graphql/validation/ValidationContext";
import { Slot } from "@wry/context";
import { fromZodError } from "zod-validation-error";

const ROVER_AVAILABLE = (process.env.APOLLO_FEATURE_FLAGS || "")
  .split(",")
  .includes("rover");

function ignoredFieldWarning(
  getMessage = (path: string) =>
    `The option ${path} is no longer supported, please remove it from your configuration file.`,
) {
  return z
    .custom(() => true)
    .superRefine((val, ctx) => {
      if (val) {
        Debug.warning(getMessage(ctx.path.join(".")));
      }
    })
    .transform((val) => {
      return undefined;
    });
}
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

const clientConfig = clientIdentitySchema.merge(
  z.object({
    service: clientServiceConfig,
    validationRules: z
      .union([
        z.array(z.custom<ValidationRule>()),
        z.function().args(z.custom<ValidationRule>()).returns(z.boolean()),
      ])
      .optional(),
    // maybe shared with rover?
    includes: z
      .array(z.string())
      .default(["src/**/*.{ts,tsx,js,jsx,graphql,gql}"]),
    // maybe shared with rover?
    excludes: z.array(z.string()).default(["**/node_modules", "**/__tests__"]),
    // maybe shared with rover?
    tagName: z.string().default("gql"),
    // removed:
    clientOnlyDirectives: ignoredFieldWarning(),
    clientSchemaDirectives: ignoredFieldWarning(),
    statsWindow: ignoredFieldWarning(),
  }),
);
export type ClientConfigFormat = z.infer<typeof clientConfig>;

const roverConfig = z.object({
  bin: z.string().optional(),
  profile: z.string().optional(),
});
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
  client: z.unknown().optional(),
  rover: z.unknown().optional(),
  service: ignoredFieldWarning(
    (path) =>
      `Service-type projects are no longer supported. Please remove the "${path}" field from your configuration file.`,
  ),
});

export type FullClientConfigFormat = Extract<
  ParsedApolloConfigFormat,
  { client: {} }
>;

export type FullRoverConfigFormat = Extract<
  ParsedApolloConfigFormat,
  { rover: {} }
>;

export const configSchema = baseConfig
  .superRefine((val, ctx) => {
    if (ROVER_AVAILABLE) {
      if ("client" in val && "rover" in val) {
        ctx.addIssue({
          code: "custom",
          message: "Config cannot contain both 'client' and 'rover' fields",
          fatal: true,
        });
      }
      if (!("client" in val) && !("rover" in val)) {
        ctx.addIssue({
          code: "custom",
          message: "Config needs to contain either 'client' or 'rover' fields",
          fatal: true,
        });
      }
    } else {
      if (!("client" in val)) {
        ctx.addIssue({
          code: "custom",
          message: "Config needs to contain a 'client' field.",
          fatal: true,
        });
      }
    }
  })
  .and(
    z.union([
      z
        .object({
          client: clientConfig,
        })
        .transform((val): typeof val & { rover?: never } => val),
      ROVER_AVAILABLE
        ? z
            .object({
              rover: roverConfig,
            })
            .transform((val): typeof val & { client?: never } => val)
        : z.never(),
    ]),
  );
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
    // Remove "or Required at rover" errors when a client config is provided
    // Remove "or Required at client" errors when a rover config is provided
    for (const [index, error] of parsed.error.errors.entries()) {
      if (error.code === z.ZodIssueCode.invalid_union) {
        error.unionErrors = error.unionErrors.filter((e) => {
          return !(
            e instanceof ZodError &&
            e.errors.length === 1 &&
            e.errors[0].message === "Required" &&
            e.errors[0].path.length === 1
          );
        });
      }
    }
    Debug.error(
      fromZodError(parsed.error, {
        prefix: "Error parsing config file:",
        prefixSeparator: "\n",
        issueSeparator: ";\n",
        unionSeparator: "\n  or\n",
      }).toString(),
    );
    return null;
  }
  if (parsed.data.client) {
    return new ClientConfig(parsed.data, configURI);
  } else if (parsed.data.rover) {
    return new RoverConfig(parsed.data, configURI);
  } else {
    // should never happen
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
