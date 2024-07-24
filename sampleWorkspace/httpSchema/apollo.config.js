module.exports = {
  client: {
    service: {
      name: "httpSchema",
      url: "http://localhost:7096/graphql",
    },
    includes: ["./src/**/*.js", "./src/**/*.ts", "./src/**/*.tsx"],
    excludes: ["**/__tests__/**"],
  },
};
