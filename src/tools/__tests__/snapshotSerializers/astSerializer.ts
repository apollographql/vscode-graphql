import { ASTNode, print } from "graphql";
import { Plugin } from "pretty-format";

const plugin: Plugin = {
  test(value) {
    return value && typeof value.kind === "string";
  },

  serialize(value: ASTNode, _config, indentation): string {
    return (
      indentation +
      print(value)
        .trim()
        .replace(/\n/g, "\n" + indentation)
    );
  },
};

export default plugin;
