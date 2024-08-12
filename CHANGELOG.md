# CHANGELOG

## 2.0.0

### Major Changes

- [#163](https://github.com/apollographql/vscode-graphql/pull/163) [`70f8895a`](https://github.com/apollographql/vscode-graphql/commit/70f8895a5f82fd6056cd47b95a0b93847bc767c6) Thanks [@phryneas](https://github.com/phryneas)! - Remove Service projects
  "Service"-type projects had almost no functionality in the Extension, so they were removed

- [#169](https://github.com/apollographql/vscode-graphql/pull/169) [`ff4f0de4`](https://github.com/apollographql/vscode-graphql/commit/ff4f0de4da4d80e8bd9ea9779a8c34678b47de0d) Thanks [@phryneas](https://github.com/phryneas)! - Bundle extension instead of just building it.

- [#163](https://github.com/apollographql/vscode-graphql/pull/163) [`70f8895a`](https://github.com/apollographql/vscode-graphql/commit/70f8895a5f82fd6056cd47b95a0b93847bc767c6) Thanks [@phryneas](https://github.com/phryneas)! - Remove support for deprecated configuration environment variable `ENGINE_API_KEY`

### Minor Changes

- [#153](https://github.com/apollographql/vscode-graphql/pull/153) [`a37cfaa6`](https://github.com/apollographql/vscode-graphql/commit/a37cfaa6bf20a8aa6ffd937e4a113ef808baf980) Thanks [@phryneas](https://github.com/phryneas)! - Add `@nonreactive` and `@defer` directives to Apollo Client schema

- [#149](https://github.com/apollographql/vscode-graphql/pull/149) [`a8fe79f6`](https://github.com/apollographql/vscode-graphql/commit/a8fe79f665f02f16e8df8d90e5134c7bc944a72e) Thanks [@phryneas](https://github.com/phryneas)! - Add support for `apollo.config.mjs`.

- [#148](https://github.com/apollographql/vscode-graphql/pull/148) [`39430fdf`](https://github.com/apollographql/vscode-graphql/commit/39430fdfd46557eff7615b3fa8e9a90ff3d6071f) Thanks [@phryneas](https://github.com/phryneas)! - Modernization:

  - move from `apollo-link-*` packages to `@apollo/client` dependency
  - move from `@apollo/federation` to `@apollo/subgraph`
  - replace `apollo-graphql` usage with `@graphql-tools/schema`
  - drop `core-js` dependency
  - update internally-used `@graphql-codegen`
  - update `graphql` to v16
  - replace `graphql-language-service-*` packages with `graphql-language-service` package
  - remove `apollo-server-errors` dependency

- [#164](https://github.com/apollographql/vscode-graphql/pull/164) [`54316f24`](https://github.com/apollographql/vscode-graphql/commit/54316f24dc598734da35d663c5a754060d40ee1c) Thanks [@phryneas](https://github.com/phryneas)! - Fix configuration error display

- [`a6e6b7c1`](https://github.com/apollographql/vscode-graphql/commit/a6e6b7c1f02bbf79291cdd0d3c79224276e2eca2) Thanks [@phryneas](https://github.com/phryneas)! - Try schema path resolution relative to configuration path.

- [#149](https://github.com/apollographql/vscode-graphql/pull/149) [`a8fe79f6`](https://github.com/apollographql/vscode-graphql/commit/a8fe79f665f02f16e8df8d90e5134c7bc944a72e) Thanks [@phryneas](https://github.com/phryneas)! - Modernization:

  - update `cosmiconfig`
  - drop now-obsolete `@endemolshinegroup/cosmiconfig-typescript-loader`

- [#163](https://github.com/apollographql/vscode-graphql/pull/163) [`70f8895a`](https://github.com/apollographql/vscode-graphql/commit/70f8895a5f82fd6056cd47b95a0b93847bc767c6) Thanks [@phryneas](https://github.com/phryneas)! - Configuration parsing has been reworked based on `zod`.

- [#153](https://github.com/apollographql/vscode-graphql/pull/153) [`a37cfaa6`](https://github.com/apollographql/vscode-graphql/commit/a37cfaa6bf20a8aa6ffd937e4a113ef808baf980) Thanks [@phryneas](https://github.com/phryneas)! - Remove unused `clientOnlyDirectives`, `clientSchemaDirectives` and `addTypename` client project config options.

- [#146](https://github.com/apollographql/vscode-graphql/pull/146) [`0721afe9`](https://github.com/apollographql/vscode-graphql/commit/0721afe9108a7b8b540fd18e967b9b138aee58f5) Thanks [@phryneas](https://github.com/phryneas)! - Modernization:

  - set minimum VSCode version to 1.90.0
  - update build target to ES2020
  - drop `node-fetch` and similar polyfills
  - update `vscode-languageclient/-server` modules
  - migrate from the deprecated `vscode` module to `@types/vscode`
  - update `typescript` developement dependency to 5.5

- [#163](https://github.com/apollographql/vscode-graphql/pull/163) [`70f8895a`](https://github.com/apollographql/vscode-graphql/commit/70f8895a5f82fd6056cd47b95a0b93847bc767c6) Thanks [@phryneas](https://github.com/phryneas)! - Remove support for unused configuration options
  The configuration options `client.name`, `client.referenceId`, `client.version`, `client.statsWindow`, `client.clientOnlyDirectives`, and `client.clientSchemaDirectives` had no effect in the extension, so they have been removed.

### Patch Changes

- [#150](https://github.com/apollographql/vscode-graphql/pull/150) [`eeed0b8e`](https://github.com/apollographql/vscode-graphql/commit/eeed0b8e2bbb109c5796b3cda5516c5a6817059a) Thanks [@phryneas](https://github.com/phryneas)! - Modernization

  - update `glob`
  - add E2E tests

- [#149](https://github.com/apollographql/vscode-graphql/pull/149) [`a8fe79f6`](https://github.com/apollographql/vscode-graphql/commit/a8fe79f665f02f16e8df8d90e5134c7bc944a72e) Thanks [@phryneas](https://github.com/phryneas)! - Fixed a bug where changes in `apollo.config.ts` or `apollo.config.cjs` would require a manual extension reload.

- [#160](https://github.com/apollographql/vscode-graphql/pull/160) [`5312c6e8`](https://github.com/apollographql/vscode-graphql/commit/5312c6e8cd1cddb0ad762843c30e62caf5169f1d) Thanks [@phryneas](https://github.com/phryneas)! - Replace `graphql-datasource` usage with `@apollo/client`

- [#161](https://github.com/apollographql/vscode-graphql/pull/161) [`7fd57310`](https://github.com/apollographql/vscode-graphql/commit/7fd57310e5483584068550b762d91491379b90a5) Thanks [@phryneas](https://github.com/phryneas)! - Only show "Run in Studio" gutter action for local graphs if an endpoint is configured.

- [#159](https://github.com/apollographql/vscode-graphql/pull/159) [`952ef37d`](https://github.com/apollographql/vscode-graphql/commit/952ef37df0cf035a1af46918ef1f38868a7aa282) Thanks [@phryneas](https://github.com/phryneas)! - Fix a bug where unrelated project configurations could be merged into each other.

- [#161](https://github.com/apollographql/vscode-graphql/pull/161) [`7fd57310`](https://github.com/apollographql/vscode-graphql/commit/7fd57310e5483584068550b762d91491379b90a5) Thanks [@phryneas](https://github.com/phryneas)! - Modernization

  - update `minimatch` and `lz-string`
  - drop `await-to-js`, `resolve-from`, `sha.js`
  - drop `query-string`

- [#161](https://github.com/apollographql/vscode-graphql/pull/161) [`7fd57310`](https://github.com/apollographql/vscode-graphql/commit/7fd57310e5483584068550b762d91491379b90a5) Thanks [@phryneas](https://github.com/phryneas)! - Fix a bug where the "Run in Studio" button would link to a Studio Graph instead of Explorer for local projects.

- [#160](https://github.com/apollographql/vscode-graphql/pull/160) [`5312c6e8`](https://github.com/apollographql/vscode-graphql/commit/5312c6e8cd1cddb0ad762843c30e62caf5169f1d) Thanks [@phryneas](https://github.com/phryneas)! - Prevent accidental creation of multiple output channels

## 1.20.0

### Minor Changes

- [#105](https://github.com/apollographql/vscode-graphql/pull/105) [`43879da4`](https://github.com/apollographql/vscode-graphql/commit/43879da40f3a3b7c6327cf165fca9980e04b4bc7) Thanks [@zovits](https://github.com/zovits)! - Add inline syntax highlighting support for Lua

### Patch Changes

- [#99](https://github.com/apollographql/vscode-graphql/pull/99) [`2a3fc1bb`](https://github.com/apollographql/vscode-graphql/commit/2a3fc1bb3c38245f09a5e5e0a19900ea0cfc58b3) Thanks [@pvinis](https://github.com/pvinis)! - Support tagging inside of parentheses

- [#73](https://github.com/apollographql/vscode-graphql/pull/73) [`d07b303d`](https://github.com/apollographql/vscode-graphql/commit/d07b303d31fdf0810f8be163bb3973c564cf0754) Thanks [@rachsmithcodes](https://github.com/rachsmithcodes)! - Return early instead of erroring on missing fields

- [#97](https://github.com/apollographql/vscode-graphql/pull/97) [`2b57a1af`](https://github.com/apollographql/vscode-graphql/commit/2b57a1afd9882a139a47af9b55496b7aa62fde2b) Thanks [@clf17222592](https://github.com/clf17222592)! - Support configuration files with .cjs file extension

- [#78](https://github.com/apollographql/vscode-graphql/pull/78) [`8b02374a`](https://github.com/apollographql/vscode-graphql/commit/8b02374a355ef9304e1fe9b0d89bcf559e618428) Thanks [@jtgrenz](https://github.com/jtgrenz)! - Fix regex for ruby heredoc

### 1.19.11

- Fix directive highlighting on enums and arguments [#6716](https://github.com/apollographql/vscode-graphql/pull/71)

### 1.19.10

- Fix highlighting on schema extension directives [#66](https://github.com/apollographql/vscode-graphql/pull/66)

### 1.19.9

- Add validation/completion for #graphql annotated strings in js [#47](https://github.com/apollographql/vscode-graphql/pull/47)
- Add config option for disabling 'Run in Studio' button [#46](https://github.com/apollographql/vscode-graphql/pull/46)
- Add config option to disable switching to output tab on error [#44](https://github.com/apollographql/vscode-graphql/pull/44)

### 1.19.8

- Move 'Run in Studio' icon to end of line [#42](https://github.com/apollographql/vscode-graphql/pull/42)
- Fix syntax highlighting for directives on types [#36](https://github.com/apollographql/vscode-graphql/pull/36)

### 1.19.7

- Specify files with conflicting documents for the 'There are multiple definitions' message. [#29](https://github.com/apollographql/vscode-graphql/pull/29)
- Dont watch non file documents. Diff view will no longer crash extension. [#28](https://github.com/apollographql/vscode-graphql/pull/28)
- Upgrade graphql version to 15.5 [#34](https://github.com/apollographql/vscode-graphql/pull/34)

### 1.19.6

- Fix 'Run in explorer' link. [#25](https://github.com/apollographql/vscode-graphql/pull/25)

### 1.19.5

- Add a 'Run in explorer' gutter action. [#20](https://github.com/apollographql/vscode-graphql/pull/20)
- Switch Studio query that fetches timing hints to use a newer field. This should have no user-observable impact, though we may eventually remove the old field once most users have upgraded their extensions. [#22](https://github.com/apollographql/vscode-graphql/pull/22)
- Add support for highlighting Svelte files [#17](https://github.com/apollographql/vscode-graphql/pull/17)
- Add support for `.cjs` files [#4](https://github.com/apollographql/vscode-graphql/pull/4)
- Exclude localSchemaFile when looking for graphql documents. This should fix the common case for hitting `VSCode Plugin: Loading Schema Twice` errors. [#8](https://github.com/apollographql/vscode-graphql/pull/8)

### 1.19.4

- Fix VS Code extension performance issues for larger projects [#1938](https://github.com/apollographql/apollo-tooling/pull/1938)

-> _Note:_ This project used to live in the [apollo-tooling](https://github.com/apollographql/apollo-tooling) repo. Refer to the [apollo-tooling CHANGELOG](https://github.com/apollographql/apollo-tooling/blob/master/CHANGELOG.md) for full list of changes before April 25, 2021. See below for filtered changelog from apollo-tooling.

## Legacy apollo-tooling Changelog

### apollo-tools@0.5.1

- Remove dependency on `apollo-env`, so using this package no longer installs polyfills.

### apollo-env@0.10.0

- deps: Updated `node-fetch` to v2.6.1

### apollo-env@0.9.0

- The following utility functions are no longer exported from `apollo-env` and can now be found in the `apollo-graphql` library:
  - `createHash`
  - `isNodeLike`
  - `mapValues`
  - `isNotNullOrDefined`

### `apollo-language-server@1.14.3`

- `apollo-language-server@1.14.3`
  - Fix issue where fragment definitions only included in `@client` fields would not be stripped ((AP-682)(https://golinks.io/AP-682), [#1454](https://github.com/apollographql/apollo-tooling/pull/1454))

### `apollo-language-server@1.14.2`

- `apollo-language-server@1.14.2`
  - Fix #735 caused #928 error implement [#1461](https://github.com/apollographql/apollo-tooling/pull/1461)
  - Fix dirname parsing for ts config files [#1463](https://github.com/apollographql/apollo-tooling/pull/1463)

### `vscode-apollo@1.9.1`, `apollo-language-server@1.14.1`

- `apollo-language-server@1.14.1`
  - Fix cache invalidation bug for reload schema which caused outdated results in autocomplete [#1446](https://github.com/apollographql/apollo-tooling/pull/1446)

### `vscode-apollo@1.9.0`, `apollo-language-server@1.14.0`, `apollo-codegen-swift@0.34.2`

- `vscode-apollo@1.9.0`
  - Add Dart support for vscode [#1385](https://github.com/apollographql/apollo-tooling/pull/1385)
- `apollo-language-server@1.14.0`
  - Add Dart operation extraction [#1385](https://github.com/apollographql/apollo-tooling/pull/1385)
- `apollo-codegen-swift@0.34.2`
  - Prevent compiler warnings for redundant access-level modifiers when using `--namespace` [1241](https://github.com/apollographql/apollo-tooling/pull/1241)

### `apollo-language-server@1.5.2`, `vscode-apollo@1.5.2`

- `apollo-language-server@1.5.2`
  - fix single apollo.config breaking others loaded at the same time [#1055](https://github.com/apollographql/apollo-tooling/pull/1055)
  - Fix broken fileSet.includesFile to use full filepath [#1055](https://github.com/apollographql/apollo-tooling/pull/1055)
- `vscode-apollo@1.5.2`

### `apollo-env@0.3.1`

- `apollo-env@0.3.1`
  - Fix core-js dependency by pinning to `3.0.0-beta.3` [#961](https://github.com/apollographql/apollo-tooling/pull/961)

### `apollo-language-server@1.4.1`

- `apollo-language-server` 1.4.1
  - Fix edge case for empty operations [#959](https://github.com/apollographql/apollo-tooling/pull/959)

### `apollo-language-server@1.0.0`

> NOTE: Many of the updates and changes in this release came from a complete rebuild of the Apollo CLI in preparation for GraphQL summit. Many of these changes can be traced to [this commit](https://github.com/apollographql/apollo-tooling/commit/d2d73f9c597845355b7ee267e411d80d1c493043) but aren't tied to a specific pull request, and won't be linked.

- `apollo-language-server@1.0.0`
  - Initial release of `apollo-language-server` to support `vscode-apollo`, and `apollo`
  - Supports editor features for...
    - Autocompletion of GraphQL documents
    - Hover information for fields anr arguments
    - Type definitions and references
    - Code lenses for open files
- `vscode-apollo@1.0.0`
  - Initial Release of `vscode-apollo`
  - Switching of schema tags [#632](https://github.com/apollographql/apollo-tooling/pull/632)
  - Supports all of the editor features exposed by `apollo-language-server`

#### :rocket: Feature

- `apollo-language-server`, `apollo-vscode`
  - [#536](https://github.com/apollographql/apollo-tooling/pull/536) Display status of loading tasks for config and Engine stats ([@shadaj](https://github.com/shadaj))

#### :bug: Bug Fix

- `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  - [#519](https://github.com/apollographql/apollo-tooling/pull/519) [VSCode] Fix detection of projects inside folders ([@shadaj](https://github.com/shadaj))

#### :memo: Documentation

- `apollo-cli`, `apollo-vscode`
  - [#521](https://github.com/apollographql/apollo-tooling/pull/521) Add README for the VS Code extension ([@shadaj](https://github.com/shadaj))

#### :rocket: Feature

- `apollo-language-server`
  - [#516](https://github.com/apollographql/apollo-tooling/pull/516) Code complete default query variables ([@shadaj](https://github.com/shadaj))
- `apollo-language-server`, `apollo-vscode`
  - [#515](https://github.com/apollographql/apollo-tooling/pull/515) Fix missing descriptions and add more hover information for arguments ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-codegen-core`, `apollo-language-server`, `apollo-vscode-webview`, `apollo-vscode`
  - [#512](https://github.com/apollographql/apollo-tooling/pull/512) React UI for webviews, fix file tracking and fragment spreads ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  - [#508](https://github.com/apollographql/apollo-tooling/pull/508) Support jumping to definitions in schema ([@shadaj](https://github.com/shadaj))

#### :house: Internal

- `apollo-cli`, `apollo-language-server`
  - [#506](https://github.com/apollographql/apollo-tooling/pull/506) Share validation logic between CLI and language server ([@shadaj](https://github.com/shadaj))

#### :rocket: Feature

- `apollo-language-server`, `apollo-vscode`
  - [#504](https://github.com/apollographql/apollo-tooling/pull/504) Add Apollo VS Code extension ([@shadaj](https://github.com/shadaj))
