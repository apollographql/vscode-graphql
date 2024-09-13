import { readFile } from "node:fs/promises";

import { fileURLToPath, pathToFileURL } from "node:url";

interface Context {
  conditions: string[];
  importAttributes: Record<string, string>;
  parentURL?: string;
}

interface ResolutionResult {
  format:
    | "builtin"
    | "commonjs"
    | "json"
    | "module"
    | "wasm"
    | null
    | undefined;
  importAttribute?: any;
  shortCircuit?: boolean;
  url: string;
}

const fileSchema = "file://";
const cacheBustSchema = "apollo-cachebust://";

export function buildVirtualUrl(
  filename: string,
  contents: string,
  format?: ResolutionResult["format"],
): string {
  const url = pathToFileURL(filename);
  url.searchParams.set("cachebust", contents);
  if (format) {
    url.searchParams.set("format", format);
  }
  return cacheBustSchema + url.toString().slice(fileSchema.length);
}

function toFileUrl(bustingUrl: string): string {
  const url = new URL(fileSchema + bustingUrl.slice(cacheBustSchema.length));
  url.search = "";
  return url.toString();
}

export async function resolve(
  specifier: string,
  context: Context,
  nextResolve: (
    specifier: string,
    context: Context,
  ) => Promise<ResolutionResult>,
): Promise<ResolutionResult> {
  if (!specifier.startsWith(cacheBustSchema)) {
    if (context.parentURL?.startsWith(cacheBustSchema)) {
      // ensure that imports are resolved relative to the correct file position
      return nextResolve(specifier, {
        ...context,
        parentURL: toFileUrl(context.parentURL),
      });
    }
    return nextResolve(specifier, context);
  }

  const url = new URL(specifier);
  if (url.searchParams.has("format")) {
    return {
      url: specifier,
      format: url.searchParams.get("format") as ResolutionResult["format"],
      shortCircuit: true,
    };
  }
  let result = await nextResolve(toFileUrl(specifier), context);
  url.searchParams.set("format", result.format || "module");
  return {
    ...result,
    url: url.toString(),
  };
}
export async function load(url: any, context: any, nextLoad: any) {
  if (!url.startsWith(cacheBustSchema)) {
    return nextLoad(url, context);
  }
  const urlObj = new URL(url);
  return {
    format: urlObj.searchParams.get("format"),
    shortCircuit: true,
    source: urlObj.searchParams.get("cachebust"),
  };
}
