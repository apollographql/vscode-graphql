const _supportedDocumentTypes = [
  "graphql",
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "vue",
  "svelte",
  "python",
  "ruby",
  "dart",
  "reason",
  "elixir",
] as const;
export type SupportedLanguageIds = (typeof _supportedDocumentTypes)[number];
export const supportedLanguageIds =
  // remove the `readonly` we get from using `as const`
  _supportedDocumentTypes as any as SupportedLanguageIds[];

export const minimumKnownExtensions: Record<
  SupportedLanguageIds,
  `.${string}`[]
> = {
  graphql: [".gql", ".graphql", ".graphqls"],
  javascript: [".js", ".mjs", ".cjs"],
  typescript: [".ts", ".mts", ".cts"],
  javascriptreact: [".jsx"],
  typescriptreact: [".tsx"],
  vue: [".vue"],
  svelte: [".svelte"],
  python: [".py"],
  ruby: [".rb"],
  dart: [".dart"],
  reason: [".re"],
  elixir: [".ex", ".exs"],
};

export type LanguageIdExtensionMap = Record<string, `.${string}`[]> &
  typeof minimumKnownExtensions;
