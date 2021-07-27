import { isNamedType, GraphQLNamedType, printType } from "graphql";
import { Plugin } from "pretty-format";

const plugin: Plugin = {
  test(value) {
    return value && isNamedType(value);
  },

  serialize(value: GraphQLNamedType): string {
    return printType(value);
  },
};

export default plugin;
