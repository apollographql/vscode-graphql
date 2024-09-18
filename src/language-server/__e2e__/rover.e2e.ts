import { test as origTest } from "@jest/globals";
import { load } from "js-yaml";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ParsedApolloConfigFormat } from "../config";

// we want to skip these tests unless the user running them has a rover config profile named "VSCode-E2E"
let test = origTest.skip;
try {
  const roverProjectDir = join(__dirname, "../../../sampleWorkspace/rover");
  const config = load(
    readFileSync(join(roverProjectDir, "apollo.config.yaml"), "utf-8"),
  ) as ParsedApolloConfigFormat;
  const roverBin = join(roverProjectDir, config.rover!.bin);
  const result = execFileSync(roverBin, [
    "config",
    "list",
    "--format=json",
  ]).toString("utf8");
  const parsed = JSON.parse(result);
  if (parsed.data.profiles.includes("VSCode-E2E")) {
    test = origTest;
  }
} catch (e) {}
if (test === origTest.skip) {
  console.info(
    "Skipping rover E2E tests: no profile with the name 'VSCode-E2E'\n" +
      "You can create one by running `rover config auth --profile VSCode-E2E`",
  );
}

test("result", () => {
  // deliberately fail the test to show that it's running
  expect(true).toBeFalsy();
});
