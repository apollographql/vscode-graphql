let { loadConfig } = require("../");
let { ClientConfig, RoverConfig } = require("../config");
import * as path from "path";
import * as fs from "fs";

async function withFeatureFlags(flags: string, fn: () => void) {
  const FF = process.env.APOLLO_FEATURE_FLAGS;
  try {
    process.env.APOLLO_FEATURE_FLAGS = flags;
    jest.resetModules();
    ({ loadConfig } = require("../"));
    ({ ClientConfig, RoverConfig } = require("../config"));
    return await fn();
  } finally {
    process.env.APOLLO_FEATURE_FLAGS = FF;
    jest.resetModules();
    ({ loadConfig } = require("../"));
    ({ ClientConfig, RoverConfig } = require("../config"));
  }
}

const makeNestedDir = (dir: string) => {
  if (fs.existsSync(dir)) return;

  try {
    fs.mkdirSync(dir);
  } catch (err: any) {
    if (err.code == "ENOENT") {
      makeNestedDir(path.dirname(dir)); //create parent dir
      makeNestedDir(dir); //create dir
    }
  }
};

const deleteFolderRecursive = (path: string) => {
  // don't delete files on windows -- will get a resource locked error
  if (require("os").type().includes("Windows")) {
    return;
  }

  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

const writeFilesToDir = (dir: string, files: Record<string, string>) => {
  Object.keys(files).forEach((key) => {
    if (key.includes("/")) makeNestedDir(path.dirname(key));
    fs.writeFileSync(`${dir}/${key}`, files[key]);
  });
};

describe("loadConfig", () => {
  let dir: string;
  let dirPath: string;

  // set up a temp dir
  beforeEach(() => {
    dir = fs.mkdtempSync("__tmp__");
    dirPath = `${process.cwd()}/${dir}`;
  });

  // clean up our temp dir
  afterEach(() => {
    if (dir) {
      deleteFolderRecursive(dir);
    }
  });

  describe("finding files", () => {
    it("loads with client defaults from different dir", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `
          module.exports = {
            client: {
              service: 'hello'
            }
          }
        `,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });
      expect(config?.rawConfig).toMatchInlineSnapshot(`
Object {
  "client": Object {
    "excludes": Array [
      "**/node_modules",
      "**/__tests__",
    ],
    "service": "hello",
    "tagName": "gql",
  },
  "engine": Object {
    "endpoint": "https://graphql.api.apollographql.com/api/graphql",
  },
}
`);
    });

    it("loads with rover defaults from different dir", () =>
      withFeatureFlags("rover", async () => {
        writeFilesToDir(dir, {
          "apollo.config.js": `
          module.exports = {
            rover: {
            }
          }
        `,
        });
        fs.mkdirSync(`${dir}/bin`);
        fs.writeFileSync(`${dir}/bin/rover`, "", { mode: 0o755 });
        let oldPath = process.env.PATH;
        process.env.PATH = `${dir}/bin:${oldPath}`;
        try {
          const config = await loadConfig({
            configPath: dirPath,
          });
          expect(config?.rawConfig).toMatchInlineSnapshot(`
Object {
  "engine": Object {
    "endpoint": "https://graphql.api.apollographql.com/api/graphql",
  },
  "rover": Object {
    "bin": "${dir}/bin/rover",
    "extraArgs": Array [],
  },
}
`);
        } finally {
          process.env.PATH = oldPath;
        }
      }));

    it("[deprecated] loads config from package.json", async () => {
      writeFilesToDir(dir, {
        "package.json": `{"apollo":{"client": {"service": "hello"}} }`,
      });

      // silence the warning
      const spy = jest.spyOn(console, "warn");
      spy.mockImplementationOnce(() => {});

      const config = await loadConfig({ configPath: dirPath });

      spy.mockRestore();
      expect(config?.client?.service).toEqual("hello");
    });

    it("loads config from a ts file", async () => {
      writeFilesToDir(dir, {
        "apollo.config.ts": `export default {"client": {"service": "hello"} }`,
      });
      const config = await loadConfig({ configPath: dirPath });
      expect(config?.client?.service).toEqual("hello");
    });

    it("loads config from a ts file with CommonJs", async () => {
      writeFilesToDir(dir, {
        "apollo.config.ts": `module.exports = {"client": {"service": "hello"} }`,
      });
      const config = await loadConfig({ configPath: dirPath });
      expect(config?.client?.service).toEqual("hello");
    });

    it("loads config from a cjs file", async () => {
      writeFilesToDir(dir, {
        "apollo.config.cjs": `module.exports = {"client": {"service": "hello"} }`,
      });
      const config = await loadConfig({ configPath: dirPath });
      expect(config?.client?.service).toEqual("hello");
    });

    it("loads config from a mjs file", async () => {
      writeFilesToDir(dir, {
        "apollo.config.mjs": `export default {"client": {"service": "hello"} }`,
      });
      const config = await loadConfig({ configPath: dirPath });
      expect(config?.client?.service).toEqual("hello");
    });

    it("loads config from a yml file", async () => {
      writeFilesToDir(dir, {
        "apollo.config.yml": `
client:
  service: hello
`,
      });
      const config = await loadConfig({ configPath: dirPath });
      expect(config?.client?.service).toEqual("hello");
    });

    it("loads config from a yaml file", async () => {
      writeFilesToDir(dir, {
        "apollo.config.yaml": `
client:
  service: hello
`,
      });
      const config = await loadConfig({ configPath: dirPath });
      expect(config?.client?.service).toEqual("hello");
    });

    it("loads config from a json file", async () => {
      writeFilesToDir(dir, {
        "apollo.config.json": `{"client": /* testing jsonc */ {"service": "hello"} }`,
      });
      const config = await loadConfig({ configPath: dirPath });
      expect(config?.client?.service).toEqual("hello");
    });
  });

  describe("errors", () => {
    it("throws when config file is empty", async () => {
      writeFilesToDir(dir, { "apollo.config.js": `` });

      const spy = jest.spyOn(console, "error");
      // use this to keep the log quiet
      spy.mockImplementation();

      await loadConfig({
        configPath: dirPath,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/config file failed to load/i),
      );

      spy.mockRestore();
    });

    it("throws when explorer.search fails", async () => {
      writeFilesToDir(dir, { "apollo.config.js": `* 98375^%*&^ its lit` });

      const error = await loadConfig({
        configPath: dirPath,
      }).catch((e: any) => e);

      expect(error.message).toMatch(/config file failed to load/i);
    });

    it("issues a deprecation warning when loading config from package.json", async () => {
      const spy = jest.spyOn(console, "warn");
      spy.mockImplementation();

      writeFilesToDir(dir, {
        "package.json": `{"apollo":{"client": {"service": "hello"}} }`,
      });

      await loadConfig({
        configPath: dirPath,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/The "apollo" package.json configuration/i),
      );

      spy.mockRestore();
    });

    it("throws if a config file was expected but not found", async () => {
      const spy = jest.spyOn(console, "error");
      spy.mockImplementation();

      writeFilesToDir(dir, { "foo.config.js": `module.exports = {}` });

      await loadConfig({
        configPath: dirPath,
        requireConfig: true, // this is what we're testing
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/no apollo config/i),
      );
      spy.mockRestore();
    });

    it("throws if project type cant be resolved", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = {}`,
      });

      const error = await loadConfig({
        configPath: dirPath,
      }).catch((e: any) => e);

      expect(error.message).toMatch(
        /Config needs to contain a 'client' field./i,
      );
    });
  });

  describe("env loading", () => {
    it("finds .env in config path & parses for key", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { } }`,
        ".env": `APOLLO_KEY=service:harambe:54378950jn`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("harambe");
    });

    it("finds .env.local in config path & parses for key", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: {  } }`,
        ".env.local": `APOLLO_KEY=service:harambe:54378950jn`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("harambe");
    });

    it("finds .env and .env.local in config path & parses for key, preferring .env.local", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: {  } }`,
        ".env": `APOLLO_KEY=service:hamato:54378950jn`,
        ".env.local": `APOLLO_KEY=service:yoshi:65489061ko`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("yoshi");
    });

    // this doesn't work right now :)
    it.skip("finds .env in cwd & parses for key", async () => {
      writeFilesToDir(dir, {
        "dir/apollo.config.js": `module.exports = { client: { name: 'hello' } }`,
        ".env": `APOLLO_KEY=service:harambe:54378950jn`,
      });
      process.chdir(dir);
      const config = await loadConfig({
        configPath: "dir/",
      });

      process.chdir("../");
      expect(config?.client?.service).toEqual("harambe");
    });
  });

  describe("project type", () => {
    it("infers client projects from config", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { service: 'hello' } }`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config).toBeInstanceOf(ClientConfig);
    });

    it("infers rover projects from config", () =>
      withFeatureFlags("rover", async () => {
        writeFilesToDir(dir, {
          "apollo.config.js": `module.exports = { rover: { bin: "/usr/bin/env" } }`,
        });

        const config = await loadConfig({
          configPath: dirPath,
        });

        expect(config).toBeInstanceOf(RoverConfig);
      }));
  });

  describe("service name", () => {
    it("lets config service name take precedence for client project", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { service: 'hello' } }`,
        ".env": `APOLLO_KEY=service:harambe:54378950jn`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("hello");
    });

    it("uses env var to determine service name when no other options", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: {  } }`,
        ".env": `APOLLO_KEY=service:harambe:54378950jn`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("harambe");
    });
  });

  describe("default merging", () => {
    it("merges service name and default config for client projects", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { service: 'hello' } }`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect((config?.rawConfig as any).client.includes).toEqual(
        /**
         * This will be calculated in the `GraphQLInternalProject` constructor by calling `getSupportedExtensions()`
         * which will have information about all the extensions added by other VSCode extensions for the language ids
         * that Apollo supports.
         */
        undefined,
      );
    });

    it("merges engine config defaults", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { service: 'wow' } }`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.rawConfig?.engine?.endpoint).toEqual(
        "https://graphql.api.apollographql.com/api/graphql",
      );
    });
  });
});
