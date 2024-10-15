import { pathToFileURL } from "node:url";

export type ImportAttributes =
  | {
      as: `cachebust:${"module" | "commonjs"}`;
      contents: string;
    }
  | { as?: undefined };

type Format =
  | "builtin"
  | "commonjs"
  | "json"
  | "module"
  | "wasm"
  | null
  | undefined;

export interface ResolveContext {
  conditions: string[];
  importAttributes?: ImportAttributes;
  importAssertions: ImportAttributes;
  parentURL?: string;
}

export interface ImportContext {
  conditions: string[];
  importAttributes?: ImportAttributes;
  importAssertions: ImportAttributes;
  format: Format;
}

export interface ResolutionResult {
  format: Format;
  importAttributes?: ImportAttributes;
  shortCircuit?: boolean;
  url: string;
}

export interface LoadResult {
  format: Format;
  shortCircuit?: boolean;
  source: string;
}

export {};
