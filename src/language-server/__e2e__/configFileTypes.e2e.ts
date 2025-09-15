import { writeFile } from "fs/promises";
import {
  reloadService,
  waitForLSP,
  resolveRelativeToSampleWorkspace,
} from "./utils";

test.each([
  ["cjsConfig", "commonjs"],
  ["cjsConfig", "module"],
  ["mjsConfig", "module"],
  ["mjsConfig", "commonjs"],
  ["jsConfigWithCJS", "commonjs"],
  ["jsConfigWithCJS", "module"],
  ["jsConfigWithESM", "module"],
  ["jsConfigWithESM", "commonjs"],
  ["tsConfigWithCJS", "commonjs"],
  ["tsConfigWithCJS", "module"],
  ["tsConfigWithESM", "module"],
  ["tsConfigWithESM", "commonjs"],
] as const)("%s with `type: '%s'`", async (project, moduleType) => {
  await writeFile(
    resolveRelativeToSampleWorkspace(`configFileTypes/${project}/package.json`),
    `${JSON.stringify(
      {
        name: "test",
        type: moduleType,
      },
      undefined,
      2,
    )}\n`,
    "utf-8",
  );
  await reloadService();
  const stats = await waitForLSP(`configFileTypes/${project}/src/test.js`);
  expect(stats.serviceId).toBe(project);
});
