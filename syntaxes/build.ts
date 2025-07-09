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
  values: { watch, debug, snapshot },
  positionals,
} = parseArgs({
  options: {
    watch: { type: "boolean", default: false },
    debug: {
      type: "boolean",
      default: false,
      description: "pattern names will be concatenated with the pattern path",
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
    const knownPatterns = new Map<string, object>();
    const output =
      JSON.stringify(
        parsed,
        function replacer(key, value) {
          const currentPath = (paths.get(this) || []).concat(key);
          if (value && typeof value === "object" && key !== "") {
            paths.set(value, currentPath);
          }
          const isPattern =
            currentPath.length == 2 && currentPath[0] === "repository";
          if (isPattern) {
            knownPatterns.set("#" + key, value);
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
            }
          }
          if (typeof value === "string") {
            if (key === "begin" || key === "end" || key === "match") {
              const regexString = value.replace(
                /\{\{([\w#.]+)\}\}/g,
                function replacer(_, reference: string) {
                  let replaced: string;
                  const patternMatch = /^(#\w+)\.(\w+)/.exec(reference);
                  console.log({ reference, patternMatch });
                  if (patternMatch) {
                    const [, pattern, key] = patternMatch;
                    const patternObject = knownPatterns.get(pattern);
                    if (!patternObject) {
                      throw new Error(
                        `Pattern not found: ${styleText(colors.reference, pattern)}` +
                          ` accessed from ${pathToString(currentPath)}`,
                      );
                    }
                    console.log({ pattern, key, patternObject });
                    replaced = patternObject[key];
                  } else {
                    if (!(reference in variables)) {
                      throw new Error(
                        `Variable not found: ${styleText(colors.variable, reference)}` +
                          ` accessed from ${pathToString(currentPath)}` +
                          ` with available variables: ${Object.keys(variables)
                            .map((v) => styleText(colors.availableVariable, v))
                            .join(", ")}`,
                      );
                    }
                    replaced = variables[reference];
                  }
                  return verify(
                    replaced.replace(/\{\{(\w+)\}\}/g, replacer),
                    `reference ${styleText(colors.variable, reference)} accessed from ` +
                      pathToString(currentPath),
                  );
                },
              );

              return verify(regexString, pathToString(currentPath));
            } else if (key === "include" && value.startsWith("#")) {
              if (!(value.slice(1) in parsed.repository)) {
                console.warn(
                  `Include pattern not found: ${styleText(colors.reference, value)} at path ${pathToString(currentPath)}`,
                );
              }
            }
          } else if (typeof value === "object" && value !== null) {
            if (isPattern) {
              if (typeof value.inherit === "string") {
                const { inherit, ...rest } = value;
                const inheritedPattern = knownPatterns.get(inherit);
                if (!inheritedPattern) {
                  throw new Error(
                    `Pattern to inherit from not found: ${styleText(
                      colors.reference,
                      value.inherit,
                    )} at path ${pathToString(currentPath)}`,
                  );
                }
                if (inheritedPattern) {
                  value = { ...inheritedPattern, ...rest };
                }
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
