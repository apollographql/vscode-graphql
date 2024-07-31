// @ts-check
const path = require("path");
const { runTests } = require("@vscode/test-electron");
const { runMockServer } = require("./mockServer.js");
const { loadDefaultMocks } = require("./mocks.js");

async function main() {
  let disposable;
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    // The path to the extension test runner script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./run.js");
    process.env.TEST_ARGV = JSON.stringify(process.argv);

    const TEST_PORT = 7096;
    process.env.APOLLO_ENGINE_ENDPOINT = "http://localhost:7096/apollo";
    disposable = runMockServer(TEST_PORT);
    await loadDefaultMocks(TEST_PORT);
    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        "--disable-extensions",
        `${extensionDevelopmentPath}/sampleWorkspace/sampleWorkspace.code-workspace`,
      ],
    });
  } catch (err) {
    console.error(err);
    console.error("Failed to run tests");
    process.exit(1);
  } finally {
    if (disposable) {
      disposable[Symbol.dispose]();
    }
  }
}

main();
