import { Loader, defaultLoaders } from "cosmiconfig";
import { dirname } from "node:path";
import { rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

// implementation based on https://github.com/cosmiconfig/cosmiconfig/blob/a5a842547c13392ebb89a485b9e56d9f37e3cbd3/src/loaders.ts
// Copyright (c) 2015 David Clark licensed MIT. Full license can be found here:
// https://github.com/cosmiconfig/cosmiconfig/blob/a5a842547c13392ebb89a485b9e56d9f37e3cbd3/LICENSE

let typescript: typeof import("typescript");
export const loadTs: Loader = async function loadTs(filepath, content) {
  try {
    return await defaultLoaders[".ts"](filepath, content);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes("module is not defined")
    )
      throw error;
  }

  if (typescript === undefined) {
    typescript = await import("typescript");
  }
  const compiledFilepath = `${filepath.slice(0, -2)}cjs`;
  let transpiledContent;
  try {
    try {
      const config = resolveTsConfig(dirname(filepath)) ?? {};
      config.compilerOptions = {
        ...config.compilerOptions,
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.Bundler,
        target: typescript.ScriptTarget.ES2022,
        noEmit: false,
      };
      transpiledContent = typescript.transpileModule(
        content,
        config,
      ).outputText;
      await writeFile(compiledFilepath, transpiledContent);
    } catch (error: any) {
      error.message = `TypeScript Error in ${filepath}:\n${error.message}`;
      throw error;
    }
    // eslint-disable-next-line @typescript-eslint/return-await
    return await defaultLoaders[".js"](compiledFilepath, transpiledContent);
  } finally {
    if (existsSync(compiledFilepath)) {
      await rm(compiledFilepath);
    }
  }
};

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
