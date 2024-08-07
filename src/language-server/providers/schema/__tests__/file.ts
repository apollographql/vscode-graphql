import { FileSchemaProvider } from "../file";
import * as path from "path";
import * as fs from "fs";
import { Debug } from "../../../utilities";

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

describe("FileSchemaProvider", () => {
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

  describe("resolveFederatedServiceSDL", () => {
    it("finds and loads sdl from graphql file for a federated service", async () => {
      writeFilesToDir(dir, {
        "schema.graphql": `
          extend type Query {
            myProduct: Product
          }

          type Product @key(fields: "id") {
            id: ID
            sku: ID
            name: String
          }
        `,
      });

      const provider = new FileSchemaProvider({
        path: dir + "/schema.graphql",
      });
      const sdl = await provider.resolveFederatedServiceSDL();
      expect(sdl).toMatchInlineSnapshot;
    });

    it("finds and loads sdl from multiple graphql files for a federated service", async () => {
      writeFilesToDir(dir, {
        "schema.graphql": `
          extend type Query {
            myProduct: Product
          }

          type Product @key(fields: "id") {
            id: ID
            sku: ID
            name: String
          }`,
        "schema2.graphql": `
          extend type Product {
            weight: Float
          }`,
      });

      const provider = new FileSchemaProvider({
        paths: [dir + "/schema.graphql", dir + "/schema2.graphql"],
      });
      const sdl = await provider.resolveFederatedServiceSDL();
      expect(sdl).toMatchInlineSnapshot(`
"directive @key(fields: _FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE

directive @requires(fields: _FieldSet!) on FIELD_DEFINITION

directive @provides(fields: _FieldSet!) on FIELD_DEFINITION

directive @external(reason: String) on OBJECT | FIELD_DEFINITION

directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION

directive @extends on OBJECT | INTERFACE

type Query {
  _entities(representations: [_Any!]!): [_Entity]!
  _service: _Service!
}

extend type Query {
  myProduct: Product
}

type Product
  @key(fields: \\"id\\")
{
  id: ID
  sku: ID
  name: String
}

extend type Product {
  weight: Float
}

scalar _FieldSet

scalar _Any

type _Service {
  sdl: String
}

union _Entity = Product"
`);
    });

    it("errors when sdl file is not a graphql file", async () => {
      const toWrite = `
        module.exports = \`
        extend type Query {
          myProduct: Product
        }

        type Product @key(fields: "id") {
          id: ID
          sku: ID
          name: string
        }\`
      `;
      writeFilesToDir(dir, {
        "schema.js": toWrite,
      });

      // noop -- just spy on and silence the error
      const errorSpy = jest.spyOn(Debug, "error");
      errorSpy.mockImplementation(() => {});

      const provider = new FileSchemaProvider({ path: dir + "/schema.js" });
      const sdl = await provider.resolveFederatedServiceSDL();
      expect(errorSpy).toBeCalledTimes(2);
    });
  });
});
