module.exports = {
  client: {
    service: {
      name: "clientSchema",
      localSchemaFile: "./starwarsSchema.graphql",
    },
    includes: ["./src/**/*.js", "./src/**/*.ts", "./src/**/*.tsx"],
    excludes: ["**/__tests__/**"],
  },
};
