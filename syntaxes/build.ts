#!/usr/bin/env node
import { parseArgs, styleText } from "node:util";
import {
  watch as nodeWatch,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import yaml from "js-yaml";
import { format, parse } from "node:path";

const dir = import.meta.dirname;
const {
  values: { watch, debug, snapshot, highlight },
  positionals,
} = parseArgs({
  options: {
    watch: { type: "boolean", default: false },
    debug: {
      type: "boolean",
      default: false,
      description: "pattern names will be concatenated with the pattern path",
    },
    highlight: {
      type: "boolean",
      default: true,
      description:
        "(in `debug` or `snapshot`) add a low-priority `variable` property to the pattern to visibly distinguish all matches",
    },
    snapshot: {
      type: "boolean",
      default: false,
      description: "pattern names will be replaced with the pattern path",
    },
  },
  allowPositionals: true,
});

const colors = {
  variable: "red",
  availableVariable: "green",
  regex: "magenta",
  reference: "yellow",
  path: "blue",
  filename: ["blue", "underline"],
} satisfies Record<string, Parameters<typeof styleText>[0]>;

const files = new Set<string>();

for (const filename of await readdir(dir)) {
  if (positionals.length > 0) {
    if (positionals.includes(parse(filename).base)) {
      files.add(filename);
    }
  } else if (filename.endsWith(".yaml")) {
    files.add(filename);
  }
}

for (const filename of files) {
  await build(filename);
}

if (watch) {
  (async () => {
    try {
      const watcher = nodeWatch(dir);
      for await (const event of watcher) {
        if (event.eventType === "rename" || event.eventType === "change") {
          const filename = event.filename;
          if (files.has(filename)) {
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
          if (debug || snapshot) {
            // attach the respository pattern name for debugging
            if (
              typeof value === "object" &&
              value !== null &&
              currentPath[0] === "repository" &&
              // top-level patterns
              (currentPath.length == 2 ||
                // nested inline patterns
                (currentPath.length > 2 &&
                  currentPath.at(-2) === "patterns" &&
                  typeof value === "object" &&
                  !("include" in value)))
            ) {
              const debugPath =
                "debugName" in value
                  ? currentPath.slice(0, -1).concat(value.debugName)
                  : currentPath;
              delete value.debugName;
              if (snapshot) {
                // in snapshot mode we only are interested in the pattern names, not colorization details
                delete value.name;
              }
              value.name =
                (value.name ?? "meta") + "." + pathToString(debugPath, false);
              if (highlight) {
                value.name += ".identifier";
              }
            }
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
function pathToString(path: string[], colorize = true) {
  const text = path.reduce(
    (acc, part) =>
      acc + (isFinite(+part) ? "[" + part + "]" : (acc ? "." : "") + part),
    "",
  );
  return colorize ? styleText(colors.path, text) : text;
}
