import { test as origTest } from "@jest/globals";
import { load } from "js-yaml";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ParsedApolloConfigFormat } from "../config";
import { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  getCompletionItems,
  getHover,
  getPositionForEditor,
  GetPositionFn,
  getFullSemanticTokens,
  getDefinitions,
} from "./utils";

let test = origTest.skip;
if (process.platform === "win32") {
  console.info("Skipping rover E2E tests in Windows");
  test = origTest.skip;
}

let editor: TextEditor;
let getPosition: GetPositionFn;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("rover/src/test.graphql");
  getPosition = getPositionForEditor(editor);
});

test("hover", async () => {
  expect(await getHover(editor, getPosition("@over|ride(from")))
    .toMatchInlineSnapshot(`
"The [\`@override\`](https://www.apollographql.com/docs/federation/federated-schemas/federated-directives/#override) directive indicates that an object field is now resolved by this subgraph instead of another subgraph where it's also defined. This enables you to migrate a field from one subgraph to another.

You can apply \`@override\` to entity fields and fields of the root operation types (such as \`Query\` and \`Mutation\`). A second \`label\` argument can be used to progressively override a field. See [the docs](https://www.apollographql.com/docs/federation/entities/migrate-fields/#incremental-migration-with-progressive-override) for more information.
***
\`\`\`graphql
directive @override(from: String!, label: String) on FIELD_DEFINITION
\`\`\`"
`);
});

test("completion", async () => {
  expect(await getCompletionItems(editor, getPosition("@over|ride(from")))
    .toMatchInlineSnapshot(`
[
  {
    "detail": undefined,
    "label": "@authenticated",
  },
  {
    "detail": undefined,
    "label": "@deprecated",
  },
  {
    "detail": undefined,
    "label": "@external",
  },
  {
    "detail": undefined,
    "label": "@inaccessible",
  },
  {
    "detail": undefined,
    "label": "@override(…)",
  },
  {
    "detail": undefined,
    "label": "@policy(…)",
  },
  {
    "detail": undefined,
    "label": "@provides(…)",
  },
  {
    "detail": undefined,
    "label": "@requires(…)",
  },
  {
    "detail": undefined,
    "label": "@requiresScopes(…)",
  },
  {
    "detail": undefined,
    "label": "@shareable",
  },
  {
    "detail": undefined,
    "label": "@tag(…)",
  },
  {
    "detail": undefined,
    "label": "@federation__authenticated",
  },
  {
    "detail": undefined,
    "label": "@federation__inaccessible",
  },
  {
    "detail": undefined,
    "label": "@federation__policy(…)",
  },
  {
    "detail": undefined,
    "label": "@federation__provides(…)",
  },
  {
    "detail": undefined,
    "label": "@federation__requiresScopes(…)",
  },
  {
    "detail": undefined,
    "label": "@federation__tag(…)",
  },
]
`);
});

test("semantic tokens", async () => {
  const tokens = await getFullSemanticTokens(editor);
  expect(tokens[0]).toStrictEqual({
    startPosition: getPosition('fields: "|a"'),
    endPosition: getPosition('fields: "a|"'),
    tokenType: "property",
    tokenModifiers: [],
  });
  expect(tokens[1]).toStrictEqual({
    startPosition: getPosition('fields: "|c"'),
    endPosition: getPosition('fields: "c|"'),
    tokenType: "property",
    tokenModifiers: [],
  });
});

test("definitions", async () => {
  const definitions = await getDefinitions(editor, getPosition("a: |A"));

  expect(definitions[0].targetUri.toString()).toBe(
    editor.document.uri.toString(),
  );
  expect(
    editor.document.getText(definitions[0].targetSelectionRange!),
  ).toMatchInlineSnapshot(`"A"`);
  expect(editor.document.getText(definitions[0].targetRange))
    .toMatchInlineSnapshot(`
"type A @key(fields: "a") {
  a: ID @override(from: "DNE")
  b: String! @requires(fields: "c") @shareable
  c: String! @external
}"
`);
});
