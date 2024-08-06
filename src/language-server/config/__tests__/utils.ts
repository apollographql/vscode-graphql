import {
  getServiceFromKey,
  getGraphIdFromConfig,
  isClientConfig,
  isLocalServiceConfig,
  parseServiceSpecifier,
  parseApolloConfig,
  configSchema,
} from "../";

describe("getServiceFromKey", () => {
  it("returns undefined with no provided key", () => {
    expect(getServiceFromKey()).toBeUndefined();
  });

  it("returns service name from service api key", () => {
    const key = "service:bob-123:489fhseo4";
    expect(getServiceFromKey(key)).toEqual("bob-123");
  });

  it("returns nothing if key is not a service key", () => {
    const key = "not-a-service:bob-123:489fhseo4";
    expect(getServiceFromKey(key)).toBeUndefined();
  });

  it("returns nothing if key is malformed", () => {
    const key = "service/bob-123:489fhseo4";
    expect(getServiceFromKey(key)).toBeUndefined();
  });
});

describe("getServiceName", () => {
  describe("client config", () => {
    it("finds service name when client.service is a string", () => {
      const rawConfig = configSchema.parse({
        client: { service: "my-service" },
      });
      expect(getGraphIdFromConfig(rawConfig)).toEqual("my-service");

      const rawConfigWithTag = configSchema.parse({
        client: { service: "my-service@master" },
      });
      expect(getGraphIdFromConfig(rawConfigWithTag)).toEqual("my-service");
    });

    it("finds service name when client.service is an object", () => {
      const rawConfig = configSchema.parse({
        client: {
          service: { name: "my-service", localSchemaFile: "./someFile" },
        },
      });
      expect(getGraphIdFromConfig(rawConfig)).toEqual("my-service");
    });
  });
  describe("service config", () => {
    it("finds service name from raw service config", () => {
      const rawConfig = configSchema.parse({
        client: {
          service: {
            name: "my-service",
            localSchemaFile: "./someFile",
          },
          includes: [],
          excludes: [],
        },
      });
      expect(getGraphIdFromConfig(rawConfig)).toEqual("my-service");
    });
  });
});

describe("isClientConfig", () => {
  it("identifies client config properly", () => {
    const config = parseApolloConfig({
      client: { service: "hello" },
    });
    expect(isClientConfig(config!)).toBeTruthy();
  });
});

describe("isLocalServiceConfig", () => {
  it("properly identifies a client config that uses localSchemaFiles", () => {
    const clientServiceConfig = { name: "my-service", localSchemaFile: "okay" };
    expect(isLocalServiceConfig(clientServiceConfig)).toBeTruthy();
  });
});

describe("parseServiceSpecifier", () => {
  it("parses service identifier for service id and tag properly", () => {
    const [id, tag] = parseServiceSpecifier("my-service@master");
    expect(id).toEqual("my-service");
    expect(tag).toEqual("master");

    const [idFromSimpleName, tagFromSimpleName] =
      parseServiceSpecifier("my-service");
    expect(idFromSimpleName).toEqual("my-service");
    expect(tagFromSimpleName).toBeUndefined();
  });
});
