import { Loader } from "cosmiconfig";
import { dirname, extname } from "node:path";
import typescript from "typescript";
import { pathToFileURL } from "node:url";
import { register } from "node:module";
import { ImportAttributes } from "./cache-busting-resolver.types";
// implementation based on https://github.com/cosmiconfig/cosmiconfig/blob/a5a842547c13392ebb89a485b9e56d9f37e3cbd3/src/loaders.ts
// Copyright (c) 2015 David Clark licensed MIT. Full license can be found here:
// https://github.com/cosmiconfig/cosmiconfig/blob/a5a842547c13392ebb89a485b9e56d9f37e3cbd3/LICENSE

if (process.env.JEST_WORKER_ID === undefined) {
  register(
    pathToFileURL(require.resolve("./config/cache-busting-resolver.js")),
  );
} else {
  register(pathToFileURL(require.resolve("./cache-busting-resolver.js")));
}

export const loadTs: Loader = async function loadTs(filepath, content) {
  try {
    return await load(filepath, content, "module", {
      module: typescript.ModuleKind.ES2022,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      // [ERROR] ReferenceError: module is not defined in ES module scope
      error.message.includes("module is not defined")
    ) {
      return await load(filepath, content, "commonjs", {
        module: typescript.ModuleKind.CommonJS,
      });
    } else {
      throw error;
    }
  }
};

async function load(
  filepath: string,
  content: string,
  type: "module" | "commonjs",
  compilerOptions: Partial<import("typescript").CompilerOptions>,
) {
  let transpiledContent;

  try {
    const config = resolveTsConfig(dirname(filepath)) ?? {};
    config.compilerOptions = {
      ...config.compilerOptions,

      moduleResolution: typescript.ModuleResolutionKind.Bundler,
      target: typescript.ScriptTarget.ES2022,
      noEmit: false,
      ...compilerOptions,
    };
    transpiledContent = typescript.transpileModule(content, config).outputText;
  } catch (error: any) {
    error.message = `TypeScript Error in ${filepath}:\n${error.message}`;
    throw error;
  }
  return loadCachebustedJs(filepath, transpiledContent, type);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveTsConfig(directory: string): any {
  const filePath = typescript.findConfigFile(directory, (fileName) => {
    return typescript.sys.fileExists(fileName);
  });
  if (filePath !== undefined) {
    const { config, error } = typescript.readConfigFile(filePath, (path) =>
      typescript.sys.readFile(path),
    );
    if (error) {
      throw new Error(`Error in ${filePath}: ${error.messageText.toString()}`);
    }
    return config;
  }
  return;
}

export const loadJs: Loader = async function loadJs(filepath, contents) {
  const extension = extname(filepath);
  if (extension === ".mjs") {
    return loadCachebustedJs(filepath, contents, "module");
  }
  if (extension === ".cjs") {
    return loadCachebustedJs(filepath, contents, "commonjs");
  }
  try {
    return await loadCachebustedJs(filepath, contents, "module");
  } catch (error) {
    if (
      error instanceof Error &&
      // [ERROR] ReferenceError: module is not defined in ES module scope
      // [ERROR] ReferenceError: require is not defined in ES module scope
      error.message.includes("is not defined in ES module scope")
    ) {
      return loadCachebustedJs(filepath, contents, "commonjs");
    } else {
      throw error;
    }
  }
};

async function loadCachebustedJs(
  filename: string,
  contents: string,
  type: "module" | "commonjs",
) {
  return (
    await import(
      filename,
      // @ts-ignore
      {
        with: {
          as: `cachebust:${type}`,
          contents,
        } satisfies ImportAttributes,
      }
    )
  ).default;
}
