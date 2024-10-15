import { pathToFileURL } from "node:url";

export type ImportAttributes =
  | {
      as: `cachebust:${Format}`;
      contents: string;
    }
  | { as?: undefined };

export type ImportAssertions =
  | {
      as: `cachebust:${Format}`;
      [key: string]: string;
    }
  | { as?: undefined };

export type Format =
  | "builtin"
  | "commonjs"
  | "json"
  | "module"
  | "wasm"
  | null
  | undefined;

export interface LegacyResolveContext {
  conditions: string[];
  importAssertions: ImportAssertions;
  parentURL?: string;
}

export interface ResolveContext {
  conditions: string[];
  importAttributes: ImportAttributes;
  parentURL?: string;
}

export interface LegacyImportContext {
  conditions: string[];
  importAssertions: ImportAssertions;
  format: Format;
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
