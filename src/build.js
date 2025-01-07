const esbuild = require("esbuild");
const { zodToJsonSchema } = require("zod-to-json-schema");
const { writeFileSync } = require("fs");
const importFresh = require("import-fresh");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: [
      "src/extension.ts",
      "src/language-server/server.ts",
      {
        in: require.resolve("@apollo/client-devtools-vscode/panel"),
        out: "panel",
      },
      "src/language-server/config/config.ts",
      "src/language-server/config/cache-busting-resolver.js",
    ],
    bundle: true,
    format: "cjs",
    minify: production,
    keepNames: true,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outdir: "lib",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [
      /* add to the end of plugins array */
      esbuildProblemMatcherPlugin,
      buildJsonSchemaPlugin,
      resolvePlugin,
    ],
  });
  if (watch) {
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started");
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        );
      });
      console.log("[watch] build finished");
    });
  },
};

const buildJsonSchemaPlugin = {
  name: "build-json-schema",
  setup(build) {
    build.onEnd(() => {
      const {
        configSchema,
        clientConfig,
        roverConfig,
        engineConfig,
        baseConfig,
        // @ts-ignore
      } = importFresh("../lib/language-server/config/config.js");

      const jsonSchema = zodToJsonSchema(configSchema, {
        errorMessages: true,
        definitions: {
          clientConfig,
          roverConfig,
          engineConfig,
          baseConfig,
        },
      });
      writeFileSync(
        "./schemas/apollo.config.schema.json",
        JSON.stringify(jsonSchema, null, 2),
      );
    });
  },
};

const resolvePlugin = {
  name: "resolve",
  setup(build) {
    build.onResolve(
      { filter: /^jsonc-parser$/ },
      async ({ path, ...options }) => {
        return build.resolve("jsonc-parser/lib/esm/main.js", options);
      },
    );
  },
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
