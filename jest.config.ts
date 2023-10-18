import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  roots: ["<rootDir>/src"],
  snapshotFormat: {
    escapeString: true,
    printBasicPrototype: true,
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.(ts)$": "ts-jest",
  },
  prettierPath: null,
};

export default config;
