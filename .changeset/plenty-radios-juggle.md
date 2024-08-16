---
"vscode-apollo": patch
---

Fixed a bug where hints on the 0-th line of an embedded GraphQL document were offset incorrectly.


E.g. in 
```js
const verylonglala = gql`type Foo { baaaaaar: String }`
```
the hover on `String` would only appear when hovering characters left of it.