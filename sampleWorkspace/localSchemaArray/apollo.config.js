module.exports = {
  client: {
    service: {
      name: "localMultiSchema",
      localSchemaFile: [
        "./starwarsSchema.graphql",
        // this documents an unfixed bug: in this multi-folder-workspace, this looks for files relative to the first folder in the .code-workspace file
        "./planets.graphql",
      ],
    },
  },
};
