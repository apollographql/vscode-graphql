module.exports = {
  client: {
    service: {
      name: "localSchema",
      localSchemaFile: "./starwarsSchema.graphql",
    },
    includes: ["./src/**/*.js", "./src/**/*.ts", "./src/**/*.tsx"],
    excludes: ["**/__tests__/**"],
  },
};
