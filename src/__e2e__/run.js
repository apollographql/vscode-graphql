const path = require("path");
const { runCLI } = require("@jest/core");
const yargs = require("yargs");
const { yargsOptions } = require("jest-cli");

async function run() {
  const root = path.join(__dirname, "..", "..");
  const argv = await yargs(JSON.parse(process.env.TEST_ARGV).slice(2))
    .alias("help", "h")
    .options(yargsOptions).argv;

  await runCLI(
    {
      ...argv,
      config: path.join(root, "jest.e2e.config.js"),
      runInBand: true,
    },
    [root],
  );
}

module.exports.run = run;
