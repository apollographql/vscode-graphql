// see https://github.com/microsoft/vscode-test/issues/37#issuecomment-700167820
const path = require("path");

module.exports = {
  moduleFileExtensions: ["js", "ts"],
  testMatch: ["<rootDir>/src/**/*.e2e.ts"],
  testEnvironment: "./src/__e2e__/vscode-environment.js",
  setupFiles: ["./src/__e2e__/setup.js"],
  verbose: true,
  moduleNameMapper: {
    vscode: path.join(__dirname, "src", "__e2e__", "vscode.js"),
  },
  transform: {
    "^.+\\.(ts)$": "ts-jest",
  },
  prettierPath: null,
};
