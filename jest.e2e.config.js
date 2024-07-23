// see https://github.com/microsoft/vscode-test/issues/37#issuecomment-700167820
const path = require("path");

module.exports = {
  moduleFileExtensions: ["js"],
  testMatch: ["<rootDir>/lib/**/*.e2e.js"],
  testEnvironment: "./src/__e2e__/vscode-environment.js",
  verbose: true,
  moduleNameMapper: {
    vscode: path.join(__dirname, "src", "__e2e__", "vscode.js"),
  },
};
