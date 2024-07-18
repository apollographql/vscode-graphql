---
"vscode-apollo": minor
---

Modernization:

- move from `apollo-link-*` packages to `@apollo/client` dependency
- move from `@apollo/federation` to `@apollo/subgraph`
- add an explicit dependency on `apollo-graphql`
- drop `core-js` dependency
- update internally-used `@graphql-codegen`
