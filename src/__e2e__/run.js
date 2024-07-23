const path = require("path");
const { runCLI } = require("jest");
async function run() {
  const root = path.join(__dirname, "..", "..");
  await runCLI({ config: path.join(root, "jest.e2e.config.js") }, [root]);
}

module.exports.run = run;
