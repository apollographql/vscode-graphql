const path = require("path");
const { runCLI } = require("@jest/core");
async function run() {
  const root = path.join(__dirname, "..", "..");
  await runCLI(
    { config: path.join(root, "jest.e2e.config.js"), runInBand: true },
    [root],
  );
}

module.exports.run = run;
