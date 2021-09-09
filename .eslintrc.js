module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["prettier", "@typescript-eslint"],
  // Skip generated file.
  ignorePatterns: ["src/language-server/graphqlTypes.ts"],
  rules: {
    "prettier/prettier": "error",
  },
  extends: ["prettier"],
};
