import { pathToFileURL } from "node:url";

export type ImportAttributes =
  | {
      as: "cachebust";
      contents: string;
      format?: Format;
    }
  | { as?: undefined };

type Format =
  | "builtin"
  | "commonjs"
  | "json"
  | "module"
  | "wasm"
  | null
  | undefined;

export interface ResolveContext {
  conditions: string[];
  importAttributes: ImportAttributes;
  parentURL?: string;
}

export interface ImportContext {
  conditions: string[];
  importAttributes: ImportAttributes;
  format: Format;
}

export interface ResolutionResult {
  format: Format;
  importAttributes?: ImportAttributes;
  shortCircuit?: boolean;
  url: string;
}

export interface LoadResult {
  format: Format;
  shortCircuit?: boolean;
  source: string;
}

function bustFileName(specifier: string) {
  const url = pathToFileURL(specifier);
  url.pathname = url.pathname + "." + Date.now() + ".js";
  return url.toString();
}

export async function resolve(
  specifier: string,
  context: ResolveContext,
  nextResolve: (
    specifier: string,
    context: ResolveContext,
  ) => Promise<ResolutionResult>,
): Promise<ResolutionResult> {
  if (context.importAttributes.as !== "cachebust") {
    return nextResolve(specifier, context);
  }
  if (context.importAttributes.format) {
    // no need to resolve at all, we have all necessary information
    return {
      url: bustFileName(specifier),
      format: context.importAttributes.format,
      importAttributes: context.importAttributes,
      shortCircuit: true,
    };
  }
  const result = await nextResolve(specifier, context);
  return {
    ...result,
    url: bustFileName(result.url),
    importAttributes: {
      ...context.importAttributes,
      format: result.format,
    },
  };
}

export async function load(
  url: string,
  context: ImportContext,
  nextLoad: (url: string, context: ImportContext) => Promise<LoadResult>,
): Promise<LoadResult> {
  if (context.importAttributes.as !== "cachebust") {
    return nextLoad(url, context);
  }
  return {
    format: context.importAttributes.format || "module",
    shortCircuit: true,
    source: context.importAttributes.contents,
  };
}
