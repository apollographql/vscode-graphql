import { pathToFileURL } from "node:url";

export type ImportAttributes =
  | {
      as: "cachebust";
      contents: string;
      format: Format;
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
  importAttributes: ImportAttributes;
  parentURL?: string;
}

export interface ImportContext {
  conditions: string[];
  importAttributes: ImportAttributes;
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
