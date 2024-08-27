import * as vscode from "vscode";
import {
  LanguageIdExtensionMap,
  minimumKnownExtensions,
} from "./languageInformation";

/**
 * @returns An object with language identifiers as keys and file extensions as values.
 * see https://github.com/microsoft/vscode/issues/109919
 */
export function getLangugageInformation(): LanguageIdExtensionMap {
  const allKnownExtensions = vscode.extensions.all
    .map(
      (i) =>
        i.packageJSON?.contributes?.languages as (
          | undefined
          | {
              id?: string;
              extensions?: string[];
            }
        )[],
    )
    .flat()
    .filter(
      (i): i is { id: string; extensions: `.${string}`[] } =>
        !!(i && i.id && i.extensions?.length),
    )
    .reduce<Record<string, Set<`.${string}`>>>(
      (acc, i) => {
        if (!acc[i.id]) acc[i.id] = new Set();
        for (const ext of i.extensions) acc[i.id].add(ext);
        return acc;
      },
      Object.fromEntries(
        Object.entries(minimumKnownExtensions).map(([k, v]) => [k, new Set(v)]),
      ),
    );
  return Object.fromEntries(
    Object.entries(allKnownExtensions).map(([k, v]) => [k, [...v]] as const),
  ) as LanguageIdExtensionMap;
}
