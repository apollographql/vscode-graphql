#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  watch as nodeWatch,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import yaml from "js-yaml";
import { format, join, parse } from "node:path";
const {
  values: { watch },
} = parseArgs({
  options: {
    watch: { type: "boolean", default: false },
  },
});
const dir = import.meta.dirname;

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
    const output =
      JSON.stringify(
        parsed,
        (key, value) => {
          if (
            typeof value === "string" &&
            (key === "begin" || key === "end" || key === "match")
          ) {
            const regexString = value.replace(
              /\{\{(\w+)\}\}/g,
              function replacer(_, variableName: string) {
                if (!(variableName in variables)) {
                  throw new Error(
                    "Variable not found: " +
                      variableName +
                      " with available variables: " +
                      Object.keys(variables).join(", "),
                  );
                }
                return verify(
                  variables[variableName].replace(/\{\{(\w+)\}\}/g, replacer),
                  "variable " + variableName,
                );
              },
            );

            return verify(regexString, key);
          }
          return value;
        },
        2,
      ) + "\n";

    await writeFile(format({ dir, name, ext: ".json" }), output, "utf8");
  } catch (err) {
    console.error(`Error building ${filename}:\n`, err);
  }
}
function verify(regexString: string, context: string) {
  try {
    new RegExp(regexString);
  } catch (err) {
    throw new Error(
      `Invalid regex: ${regexString} in context: ${context}\n${err}`,
    );
  }
  return regexString;
}
