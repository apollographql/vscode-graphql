import { ClientConfig, DefaultConfigBase, parseApolloConfig } from "../";
import { URI } from "vscode-uri";

describe("ApolloConfig", () => {
  describe("confifDirURI", () => {
    it("properly parses dir paths for configDirURI", () => {
      const uri = URI.parse("/test/dir/name");
      const config = parseApolloConfig(
        { client: { name: "hai", ...DefaultConfigBase } },
        uri,
      );
      // can be either /test/dir/name or \\test\\dir\\name depending on platform
      // this difference is fine :)
      expect(config?.configDirURI?.fsPath).toMatch(
        /\/test\/dir\/name|\\test\\dir\\name/,
      );
    });
    it("properly parses filepaths for configDirURI", () => {
      const uri = URI.parse("/test/dir/name/apollo.config.js");
      const config = new ClientConfig(
        {
          client: { service: "hai", ...DefaultConfigBase },
        },
        uri,
      );
      // can be either /test/dir/name or \\test\\dir\\name depending on platform
      // this difference is fine :)
      expect(config?.configDirURI?.fsPath).toMatch(
        /\/test\/dir\/name|\\test\\dir\\name/,
      );
    });
  });

  describe("variant", () => {
    it("gets default variant when none is set", () => {
      const config = new ClientConfig({
        client: { service: "hai", ...DefaultConfigBase },
      });
      expect(config?.variant).toEqual("current");
    });

    it("gets variant from service specifier", () => {
      const config = new ClientConfig({
        client: { service: "hai@master", ...DefaultConfigBase },
      });
      expect(config?.variant).toEqual("master");
    });

    it("can set and override variants", () => {
      const config = new ClientConfig({
        client: { service: "hai@master", ...DefaultConfigBase },
      });
      config!.variant = "new";
      expect(config?.variant).toEqual("new");
    });
  });
});
