---
"vscode-apollo": patch
---

Replace deprecated `util.isString` with `typeof x === "string"` so the extension works on Node 24, where the runtime-deprecated `util.isString` has been removed.
