#!/usr/bin/env node
import { parseArgs, styleText, inspect } from "node:util";
import {
  watch as nodeWatch,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import yaml from "js-yaml";
import { format, join, parse } from "node:path";
import * as path from "node:path";
const {
  values: { watch },
} = parseArgs({
  options: {
    watch: { type: "boolean", default: false },
  },
});
const dir = import.meta.dirname;

const colors = {
  variable: "red",
  availableVariable: "green",
  regex: "magenta",
  reference: "yellow",
  path: "blue",
  filename: ["blue", "underline"],
} satisfies Record<string, Parameters<typeof styleText>[0]>;

for (const filename of await readdir(dir)) {
  if (filename.endsWith(".yaml")) {
    await build(filename);
  }
}

if (watch) {
  (async () => {
    try {
      const watcher = nodeWatch(dir);
      for await (const event of watcher) {
        if (event.eventType === "rename" || event.eventType === "change") {
          const filename = event.filename;
          if (filename.endsWith(".yaml")) {
            await build(filename);
          }
        }
      }
    } catch (err) {
      throw err;
    }
  })();
}

async function build(filename: string) {
  console.log(`Building ${filename}...`);
  const { name, ext } = parse(filename);

  try {
    const content = await readFile(format({ dir, name, ext }), "utf8");
    const parsed = yaml.load(content, {
      filename,
    }) as Record<string, any>;
    const variables = parsed.variables || {};
    delete parsed.variables;
    const paths = new Map<object, string[]>();
    const output =
      JSON.stringify(
        parsed,
        function (key, value) {
          const currentPath = (paths.get(this) || []).concat(key);
          if (value && typeof value === "object" && key !== "") {
            paths.set(value, currentPath);
          }
          if (typeof value === "string") {
            if (key === "begin" || key === "end" || key === "match") {
              const regexString = value.replace(
                /\{\{(\w+)\}\}/g,
                function replacer(_, variableName: string) {
                  if (!(variableName in variables)) {
                    throw new Error(
                      `Variable not found: ${styleText(colors.variable, variableName)}` +
                        ` accessed from ${pathToString(currentPath)}` +
                        ` with available variables: ${Object.keys(variables)
                          .map((v) => styleText(colors.availableVariable, v))
                          .join(", ")}`,
                    );
                  }
                  return verify(
                    variables[variableName].replace(/\{\{(\w+)\}\}/g, replacer),
                    `variable ${styleText(colors.variable, variableName)} accessed from ` +
                      pathToString(currentPath),
                  );
                },
              );

              return verify(regexString, pathToString(currentPath));
            }
            if (key === "include" && value.startsWith("#")) {
              if (!(value.slice(1) in parsed.repository)) {
                console.warn(
                  `Include pattern not found: ${styleText(colors.reference, value)} at path ${pathToString(currentPath)}`,
                );
              }
            }
          }
          return value;
        },
        2,
      ) + "\n";

    await writeFile(format({ dir, name, ext: ".json" }), output, "utf8");
  } catch (err) {
    console.log(
      `Error building ${styleText(colors.filename, filename)}:\n`,
      err instanceof Error ? err.message : err.toString(),
    );
  }
}
function verify(regexString: string, context: string) {
  try {
    new RegExp(regexString);
  } catch (err) {
    throw new Error(
      `Invalid regex: ${styleText(colors.regex, regexString)} in context: ${context}\n${err}`,
    );
  }
  return regexString;
}
function pathToString(path: string[]) {
  return styleText(
    colors.path,
    path.reduce(
      (acc, part) =>
        acc + (isFinite(+part) ? "[" + part + "]" : (acc ? "." : "") + part),
      "",
    ),
  );
}
