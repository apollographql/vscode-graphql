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
import { spawn } from "node:child_process";
import { text } from "node:stream/consumers";
import semver from "semver";

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
    .optional()
    .describe(
      `This option is no longer supported, please remove it from your configuration file.`,
    );
}
export interface Context {
  apiKey?: string;
  serviceName?: string;
  configPath?: string;
}
const contextStore = new AsyncLocalStorage<Context>();

const NAME_DESCRIPTION =
  "The name your project will be referred to by the Apollo GraphQL extension.";

const studioServiceConfig = z
  .string()
  .describe(
    "The name of the Apollo Studio graph to use. Alternatively pass in an object to configure a local schema.",
  );

const remoteServiceConfig = z
  .object({
    name: z.string().optional().describe(NAME_DESCRIPTION),
    url: z
      .string()
      .describe(
        "URL of a GraphQL to use for the GraphQL Schema for this project. Needs introspection enabled.",
      ),
    headers: z
      .record(z.string())
      .default({})
      .describe("Additional headers to send to the server."),
    skipSSLValidation: z
      .boolean()
      .default(false)
      .describe(
        "Skip SSL validation. May be required for self-signed certificates.",
      ),
  })
  .describe("Configuration for using a local schema from a URL.");
export type RemoteServiceConfig = z.infer<typeof remoteServiceConfig>;

const LOCAL_SCHEMA_FILE_DESCRIPTION =
  "Path to a local schema file to use as GraphQL Schema for this project. Can be a string or an array of strings to merge multiple partial schemas into one.";
const localServiceConfig = z
  .object({
    name: z.string().optional().describe(NAME_DESCRIPTION),
    localSchemaFile: z
      .union([
        z.string().describe(LOCAL_SCHEMA_FILE_DESCRIPTION),
        z.array(z.string()).describe(LOCAL_SCHEMA_FILE_DESCRIPTION),
      ])
      .describe(LOCAL_SCHEMA_FILE_DESCRIPTION),
  })
  .describe("Configuration for using a local schema from a file.");
export type LocalServiceConfig = z.infer<typeof localServiceConfig>;

const clientServiceConfig = z
  .preprocess(
    (value) => value || contextStore.getStore()?.serviceName,
    z.union([studioServiceConfig, remoteServiceConfig, localServiceConfig]),
  )
  .describe(
    "A string to refer to a graph in Apollo Studio, or an object for a local schema.",
  );
export type ClientServiceConfig = z.infer<typeof clientServiceConfig>;

const VALIDATION_RULES_DESCRIPTION =
  "Additional validation rules to check for. To use this feature, please use a configuration file format that allows passing JavaScript objects.";
export const clientConfig = z
  .object({
    service: clientServiceConfig,
    validationRules: z
      .union([
        z
          .array(z.custom<ValidationRule>())
          .describe(VALIDATION_RULES_DESCRIPTION),
        z
          .function()
          .args(z.custom<ValidationRule>())
          .returns(z.boolean())
          .describe(VALIDATION_RULES_DESCRIPTION),
      ])
      .optional()
      .describe(VALIDATION_RULES_DESCRIPTION),
    // maybe shared with rover?
    includes: z
      .array(z.string())
      .optional()
      .describe(
        "An array of glob patterns this project should be active on. The Apollo GraphQL extension will only support IntelliSense-like features in files listed here.",
      ),
    // maybe shared with rover?
    excludes: z
      .array(z.string())
      .default(["**/node_modules", "**/__tests__"])
      .describe(
        "Files to exclude from this project. The Apollo GraphQL extension will not provide IntelliSense-like features in these files.",
      ),
    // maybe shared with rover?
    tagName: z
      .string()
      .default("gql")
      .describe(
        "The name of the template literal tag or function used in JavaScript files to declare GraphQL Documents.",
      ),
    // removed:
    clientOnlyDirectives: ignoredFieldWarning(),
    clientSchemaDirectives: ignoredFieldWarning(),
    statsWindow: ignoredFieldWarning(),
    name: ignoredFieldWarning(),
    referenceId: ignoredFieldWarning(),
    version: ignoredFieldWarning(),
  })
  .describe("Configuration for a Client project.");
export type ClientConfigFormat = z.infer<typeof clientConfig>;

export const roverConfig = z
  .object({
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
      )
      .describe(
        "The path to your Rover binary. If omitted, will look in PATH.",
      ),
    profile: z.string().optional().describe("The name of the profile to use."),
    supergraphConfig: z
      .preprocess((value) => {
        if (value !== undefined) return value;
        const configPath = contextStore.getStore()?.configPath || ".";
        const supergraphConfig = join(configPath, "supergraph.yaml");
        return existsSync(supergraphConfig) ? supergraphConfig : undefined;
      }, z.string().nullable().optional())
      .describe(
        "The path to your `supergraph.yaml` file. \n" +
          "Defaults to a `supergraph.yaml` in the folder of your `apollo.config.json`, if there is one.",
      ),
    extraArgs: z
      .array(z.string())
      .default([])
      .describe("Extra arguments to pass to the Rover CLI."),
  })
  .describe("Configuration for a federated project.");
type RoverConfigFormat = z.infer<typeof roverConfig>;

export const engineConfig = z
  .object({
    endpoint: z
      .string()
      .default(
        process.env.APOLLO_ENGINE_ENDPOINT ||
          "https://graphql.api.apollographql.com/api/graphql",
      )
      .describe("The URL of the Apollo Studio API."),
    apiKey: z
      .preprocess(
        (val) => val || contextStore.getStore()?.apiKey,
        z.string().optional(),
      )
      .describe(
        "The API key to use for Apollo Studio. If possible, use a `.env` file or `.env.local` file instead to store secrets like this.",
      ),
  })
  .describe("Network configuration for Apollo Studio API.");
export type EngineConfig = z.infer<typeof engineConfig>;

export const baseConfig = z.object({
  engine: engineConfig.default({}),
  client: z.unknown().optional().describe(clientConfig.description!),
  rover: z.unknown().optional().describe(roverConfig.description!),
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
  })
  .and(
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
      this.configURI.fsPath.match(/\.(ts|js|cjs|mjs|yaml|yml|json)$/i)
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

  /**
   * execute some additional asynchronous verification steps that cannot be part of the sync parsing part
   */
  async verify() {}
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

  /**
   * execute some additional asynchronous verification steps that cannot be part of the sync parsing part
   */
  async verify() {
    try {
      const child = spawn(this.rover.bin, ["-V"], {
        stdio: ["pipe", "pipe", "ignore"],
      });
      const output = await text(child.stdout);
      const versionPrefix = "Rover ";
      if (output.startsWith(versionPrefix)) {
        const version = output.slice(versionPrefix.length).trim();
        if (!semver.valid(version)) {
          // not a valid version, we accept this and will try anyways
          return;
        }
        if (semver.gte(version, "0.27.0-alpha.0")) {
          // this is a supported version
          return;
        }
        const error = new Error(
          `Rover version ${version} is not supported by the extension. Please upgrade to at least 0.27.0.`,
        );
        // @ts-expect-error would require a target of ES2022 in tsconfig
        error.cause = "ROVER_TOO_OLD";
        throw error;
      }
      // we can't find out the version, but we'll try anyways
    } catch (error) {
      if (
        error &&
        error instanceof Error &&
        // @ts-expect-error would require a target of ES2022 in tsconfig
        error.cause === "ROVER_TOO_OLD"
      ) {
        throw error;
      }
      // we ignore all other errors and will handle that when we actually spawn the rover binary
    }
  }
}
