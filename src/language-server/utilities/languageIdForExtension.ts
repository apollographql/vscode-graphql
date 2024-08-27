import {
  LanguageIdExtensionMap,
  supportedLanguageIds,
} from "../../tools/utilities/languageInformation";

let languageIdPerExtension: Record<`.${string}`, string> | undefined;
let supportedExtensions: `.${string}`[] | undefined;

export function setLanguageIdExtensionMap(map: LanguageIdExtensionMap) {
  languageIdPerExtension = Object.fromEntries(
    Object.entries(map).flatMap(([languageId, extensions]) =>
      extensions.map((extension) => [extension, languageId]),
    ),
  );
  supportedExtensions = supportedLanguageIds.flatMap(
    (languageId) => map[languageId],
  );
}

/**
 * @throws if called before the language server has received options via `onInitialize`.
 */
export function getLanguageIdForExtension(ext: `.${string}`) {
  if (!languageIdPerExtension) {
    throw new Error("LanguageIdExtensionMap not set");
  }
  return languageIdPerExtension[ext];
}

/**
 * @throws if called before the language server has received options via `onInitialize`.
 */
export function getSupportedExtensions() {
  if (!supportedExtensions) {
    throw new Error("LanguageIdExtensionMap not set");
  }
  return supportedExtensions;
}
