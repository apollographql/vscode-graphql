import { loadConfig } from "../";
import * as path from "path";
import * as fs from "fs";
import { ClientConfig, RoverConfig } from "../config";
import { Debug } from "../../utilities";

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
    "includes": Array [
      "src/**/*.{ts,tsx,js,jsx,graphql,gql}",
    ],
    "name": "Apollo Language Server",
    "referenceID": "146d29c0-912c-46d3-b686-920e52586be6",
    "service": "hello",
    "tagName": "gql",
    "version": "1.20.0",
  },
  "engine": Object {
    "endpoint": "https://graphql.api.apollographql.com/api/graphql",
  },
}
`);
    });

    it("loads with rover defaults from different dir", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `
          module.exports = {
            rover: {
            }
          }
        `,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });
      expect(config?.rawConfig).toMatchInlineSnapshot(`
Object {
  "engine": Object {
    "endpoint": "https://graphql.api.apollographql.com/api/graphql",
  },
  "rover": Object {},
}
`);
    });

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

      writeFilesToDir(dir, { "apollo.config.js": `module.exports = {}` });

      await loadConfig({
        requireConfig: true, // this is what we're testing
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/no apollo config/i),
      );
      spy.mockRestore();
    });

    it("throws if project type cant be resolved", async () => {
      const spy = jest.spyOn(console, "error");
      spy.mockImplementation();

      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = {}`,
      });

      await loadConfig({
        configPath: dirPath,
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(
          /Config needs to contain either 'client' or 'rover'/i,
        ),
      );
      spy.mockRestore();
    });
  });

  describe("env loading", () => {
    it("finds .env in config path & parses for key", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { name: 'hello' } }`,
        ".env": `APOLLO_KEY=service:harambe:54378950jn`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("harambe");
    });

    it("finds .env.local in config path & parses for key", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { } }`,
        ".env.local": `APOLLO_KEY=service:harambe:54378950jn`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("harambe");
    });

    it("finds .env and .env.local in config path & parses for key, preferring .env.local", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { name: 'hello' } }`,
        ".env": `APOLLO_KEY=service:hamato:54378950jn`,
        ".env.local": `APOLLO_KEY=service:yoshi:65489061ko`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("yoshi");
    });

    it("Allows setting ENGINE_API_KEY with a deprecation warning", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { name: 'hello' } }`,
        ".env.local": `ENGINE_API_KEY=service:yoshi:65489061ko`,
      });

      const spy = jest.spyOn(Debug, "warning");

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.client?.service).toEqual("yoshi");
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/Deprecation warning/i),
      );
    });

    it("Uses new key when .env defined both legacy and new key", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { client: { name: 'hello' } }`,
        ".env.local": `ENGINE_API_KEY=service:yoshi:65489061ko\nAPOLLO_KEY=service:yoshi:65489061ko`,
      });
      const spy = jest.spyOn(Debug, "warning");

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config?.engine.apiKey).toEqual("service:yoshi:65489061ko");
      expect(spy).toHaveBeenCalledWith(
        expect.stringMatching(/Both ENGINE_API_KEY and APOLLO_KEY were found/i),
      );
    });

    // this doesn't work right now :)
    xit("finds .env in cwd & parses for key", async () => {
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

    it("infers rover projects from config", async () => {
      writeFilesToDir(dir, {
        "apollo.config.js": `module.exports = { rover: {} }`,
      });

      const config = await loadConfig({
        configPath: dirPath,
      });

      expect(config).toBeInstanceOf(RoverConfig);
    });
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

      expect((config?.rawConfig as any).client.includes).toEqual([
        "src/**/*.{ts,tsx,js,jsx,graphql,gql}",
      ]);
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
