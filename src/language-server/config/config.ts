import { dirname, join } from "path";
import { URI } from "vscode-uri";
import { getGraphIdFromConfig, parseServiceSpecifier } from "./utils";
import { Debug } from "../utilities";
import z, { ZodError } from "zod";
import { ValidationRule } from "graphql/validation/ValidationContext";
import { fromZodError } from "zod-validation-error";
import which from "which";
import { accessSync, constants as fsConstants, statSync } from "node:fs";
import { AsyncLocalStorage } from "async_hooks";
import { existsSync } from "fs";

const ROVER_AVAILABLE = (process.env.APOLLO_FEATURE_FLAGS || "")
  .split(",")
  .includes("rover");

function ignoredFieldWarning(
  getMessage = (path: string) =>
    `The option ${path} is no longer supported, please remove it from your configuration file.`,
) {
  return z
    .custom<unknown>(() => true)
    .superRefine((val, ctx) => {
      if (val) {
        Debug.warning(getMessage(ctx.path.join(".")));
      }
    })
    .optional();
}
export interface Context {
  apiKey?: string;
  serviceName?: string;
  configPath?: string;
}
const contextStore = new AsyncLocalStorage<Context>();

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
  (value) => value || contextStore.getStore()?.serviceName,
  z.union([studioServiceConfig, remoteServiceConfig, localServiceConfig]),
);
export type ClientServiceConfig = z.infer<typeof clientServiceConfig>;

const clientConfig = z.object({
  service: clientServiceConfig,
  validationRules: z
    .union([
      z.array(z.custom<ValidationRule>()),
      z.function().args(z.custom<ValidationRule>()).returns(z.boolean()),
    ])
    .optional(),
  // maybe shared with rover?
  includes: z.array(z.string()).optional(),
  // maybe shared with rover?
  excludes: z.array(z.string()).default(["**/node_modules", "**/__tests__"]),
  // maybe shared with rover?
  tagName: z.string().default("gql"),
  // removed:
  clientOnlyDirectives: ignoredFieldWarning(),
  clientSchemaDirectives: ignoredFieldWarning(),
  statsWindow: ignoredFieldWarning(),
  name: ignoredFieldWarning(),
  referenceId: ignoredFieldWarning(),
  version: ignoredFieldWarning(),
});
export type ClientConfigFormat = z.infer<typeof clientConfig>;

const roverConfig = z.object({
  bin: z
    .preprocess(
      (val) => val || which.sync("rover", { nothrow: true }) || undefined,
      z.string({
        message:
          "Rover binary not found. Please either install it system-wide in PATH, or provide the `bin` option. Also ensure that the binary is executable.",
      }),
    )
    .refine(
      (bin) => {
        try {
          // is executable?
          accessSync(bin, fsConstants.X_OK);
          // is a file and not a directory?
          return statSync(bin).isFile();
        } catch {
          return false;
        }
      },
      {
        message:
          "Rover binary is not marked as an executable. If you are using OS X or Linux, ensure to set the executable bit.",
      },
    ),
  profile: z.string().optional(),
  supergraphConfig: z
    .preprocess((value) => {
      if (value !== undefined) return value;
      const configPath = contextStore.getStore()?.configPath!;
      const supergraphConfig = join(configPath, "supergraph.yml");
      return existsSync(supergraphConfig) ? supergraphConfig : undefined;
    }, z.string().nullable().optional())
    .describe(
      "The path to your `supergraph.yml` file. \n" +
        "Defaults to a `supergraph.yml` in the folder of your `apollo.config.js`, if there is one.",
    ),
  extraArgs: z
    .array(z.string())
    .default([])
    .describe("Extra arguments to pass to the Rover CLI."),
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
    (val) => val || contextStore.getStore()?.apiKey,
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

/** Helper function for TypeScript - we just want the first type to make it into the types, not the "no feature flag" fallback */
function ifRoverAvailable<T>(yes: T, no: any): T {
  return ROVER_AVAILABLE ? yes : no;
}

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
    ifRoverAvailable(
      z.union([
        z
          .object({
            client: clientConfig,
          })
          .transform((val): typeof val & { rover?: never } => val),
        z
          .object({
            rover: roverConfig,
          })
          .transform((val): typeof val & { client?: never } => val),
      ]),
      z.object({
        client: clientConfig,
      }),
    ),
  );
export type RawApolloConfigFormat = z.input<typeof configSchema>;
export type ParsedApolloConfigFormat = z.output<typeof configSchema>;

export function parseApolloConfig(
  rawConfig: RawApolloConfigFormat,
  configURI?: URI,
  ctx: Context = {},
) {
  const parsed = contextStore.run(ctx, () => configSchema.safeParse(rawConfig));
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
    throw fromZodError(parsed.error, {
      prefix: `Error parsing config file ${configURI?.fsPath}:`,
      prefixSeparator: "\n",
      issueSeparator: ";\n",
      unionSeparator: "\n  or\n",
    });
  }
  if (parsed.data.client) {
    return new ClientConfig(parsed.data, configURI);
  } else if (parsed.data.rover) {
    return new RoverConfig(parsed.data, configURI);
  } else {
    // should never happen
    throw new Error("Invalid config file format!");
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
