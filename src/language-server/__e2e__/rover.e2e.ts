import { test as origTest } from "@jest/globals";
import { load } from "js-yaml";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ParsedApolloConfigFormat } from "../config";
import vscode, { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  getCompletionItems,
  getHover,
  getPositionForEditor,
  GetPositionFn,
  getFullSemanticTokens,
} from "./utils";

// we want to skip these tests unless the user running them has a rover config profile named "VSCode-E2E"
let test = origTest.skip;
try {
  const roverProjectDir = join(__dirname, "../../../sampleWorkspace/rover");
  const config = load(
    readFileSync(join(roverProjectDir, "apollo.config.yaml"), "utf-8"),
  ) as ParsedApolloConfigFormat;
  const roverBin = join(roverProjectDir, config.rover!.bin);
  const result = execFileSync(roverBin, [
    "config",
    "list",
    "--format=json",
  ]).toString("utf8");
  const parsed = JSON.parse(result);
  if (parsed.data.profiles.includes("VSCode-E2E")) {
    test = origTest;
  }
} catch (e) {}
if (test === origTest.skip) {
  console.info(
    "Skipping rover E2E tests: no profile with the name 'VSCode-E2E'\n" +
      "You can create one by running `rover config auth --profile VSCode-E2E`",
  );
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
    "label": "@deprecated",
  },
  {
    "detail": undefined,
    "label": "@external",
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
  {
    "detail": undefined,
    "label": "@override(…)",
  },
  {
    "detail": undefined,
    "label": "@requires(…)",
  },
  {
    "detail": undefined,
    "label": "@shareable",
  },
]
`);
});

test("semantic tokens", async () => {
  expect(getFullSemanticTokens(editor)).toMatchInlineSnapshot(`
[
  {
    "range": [
      {
        "character": 21,
        "line": 10,
      },
      {
        "character": 22,
        "line": 10,
      },
    ],
    "tokenModifiers": [],
    "tokenType": "property",
  },
  {
    "range": [
      {
        "character": 32,
        "line": 12,
      },
      {
        "character": 33,
        "line": 12,
      },
    ],
    "tokenModifiers": [],
    "tokenType": "property",
  },
]
`);
});
