---
"vscode-apollo": minor
---

Derive extensions for supported languages and monitored files from other installed extensions.
Adjust default `includes` for client projects.

This changes the default `includes` similar to (depending on additional extensions you might have installed):

```diff
-'src/**/*.{ts,tsx,js,jsx,graphql,gql}',
+'src/**/*{.gql,.graphql,.graphqls,.js,.mjs,.cjs,.es6,.pac,.ts,.mts,.cts,.jsx,.tsx,.vue,.svelte,.py,.rpy,.pyw,.cpy,.gyp,.gypi,.pyi,.ipy,.pyt,.rb,.rbx,.rjs,.gemspec,.rake,.ru,.erb,.podspec,.rbi,.dart,.re,.ex,.exs}'
```
