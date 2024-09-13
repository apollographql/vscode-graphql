import { Loader, defaultLoaders } from "cosmiconfig";
import { basename, dirname, sep, format as formatPath } from "node:path";
import { rm, writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import typescript from "typescript";

// implementation based on https://github.com/cosmiconfig/cosmiconfig/blob/a5a842547c13392ebb89a485b9e56d9f37e3cbd3/src/loaders.ts
// Copyright (c) 2015 David Clark licensed MIT. Full license can be found here:
// https://github.com/cosmiconfig/cosmiconfig/blob/a5a842547c13392ebb89a485b9e56d9f37e3cbd3/LICENSE

export const loadTs: Loader = async function loadTs(filepath, content) {
  try {
    return await load(filepath, content, ".mjs", {
      module: typescript.ModuleKind.ES2022,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      // [ERROR] ReferenceError: module is not defined in ES module scope
      error.message.includes("module is not defined")
    ) {
      return await load(filepath, content, ".cjs", {
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
  extension: string,
  compilerOptions: Partial<import("typescript").CompilerOptions>,
) {
  const tempDir = await mkdtemp(`${tmpdir()}${sep}`);
  const base = basename(filepath);
  const compiledFilepath = formatPath({
    dir: tempDir,
    name: base,
    ext: extension,
  });
  let transpiledContent;
  try {
    try {
      const config = resolveTsConfig(dirname(filepath)) ?? {};
      config.compilerOptions = {
        ...config.compilerOptions,

        moduleResolution: typescript.ModuleResolutionKind.Bundler,
        target: typescript.ScriptTarget.ES2022,
        noEmit: false,
        ...compilerOptions,
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
    await rm(tempDir, { recursive: true, force: true });
  }
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
