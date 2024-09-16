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

const prefix = `data:cachebust;`;
type CachebustingUrl =
  `data:cachebust;format=${string};path=${string};base64,${string}` & {
    __brand: "CachebustingUrl";
  };

export function buildVirtualUrl(
  filename: string,
  contents: string,
  format?: ResolutionResult["format"],
): CachebustingUrl {
  return buildUrl(
    format || "detect",
    filename,
    Buffer.from(contents).toString("base64"),
  );
}

function isCachebustingUrl(url: string | undefined): url is CachebustingUrl {
  return !!url && url.startsWith(prefix);
}

function getUrlInfo(dataUrl: CachebustingUrl) {
  const split = dataUrl.split(";");
  return {
    format: split[1].slice(7) as
      | "detect"
      | "builtin"
      | "commonjs"
      | "json"
      | "module"
      | "wasm"
      | null
      | undefined,
    path: split[2].slice(5),
    base64: split[3].slice(7),
  };
}

function buildUrl(
  format: string,
  path: string,
  base64: string,
): CachebustingUrl {
  return `${prefix}format=${
    format || "detect"
  };path=${path};base64,${base64}` as CachebustingUrl;
}

export async function resolve(
  specifier: string,
  context: Context,
  nextResolve: (
    specifier: string,
    context: Context,
  ) => Promise<ResolutionResult>,
): Promise<ResolutionResult> {
  if (!isCachebustingUrl(specifier)) {
    if (isCachebustingUrl(context.parentURL)) {
      // ensure that imports are resolved relative to the correct file position
      return nextResolve(specifier, {
        ...context,
        parentURL: getUrlInfo(context.parentURL).path,
      });
    }
    return nextResolve(specifier, context);
  }

  const info = getUrlInfo(specifier);
  if (info.format !== "detect") {
    return {
      url: specifier,
      format: info.format,
      shortCircuit: true,
    };
  }
  let result = await nextResolve(info.path, context);
  return {
    ...result,
    url: buildUrl(result.format || "module", info.path, info.base64),
  };
}

export async function load(url: any, context: any, nextLoad: any) {
  if (!isCachebustingUrl(url)) {
    return nextLoad(url, context);
  }
  const info = getUrlInfo(url);
  return {
    format: info.format,
    shortCircuit: true,
    source: Buffer.from(info.base64, "base64").toString("ascii"),
  };
}
