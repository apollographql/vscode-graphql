import { TextEditor } from "vscode";
import {
  closeAllEditors,
  openEditor,
  getCompletionItems,
  getHover,
  getPositionForEditor,
  GetPositionFn,
} from "./utils";

let editor: TextEditor;
let getPosition: GetPositionFn;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("clientSchema/src/test.js");
  getPosition = getPositionForEditor(editor);
});

test("completion", async () => {
  expect(
    (await getCompletionItems(editor, getPosition("dro|id")))[0],
  ).toStrictEqual({
    label: "droid",
    detail: "Droid",
  });
  expect(
    (await getCompletionItems(editor, getPosition("na|me")))[0],
  ).toStrictEqual({
    label: "name",
    detail: "String!",
  });
  expect(
    (await getCompletionItems(editor, getPosition("mo|del")))[0],
  ).toStrictEqual({
    label: "model",
    detail: "String",
  });
});

test("hover", async () => {
  expect(await getHover(editor, getPosition("featu|reFlagDefer")))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
Query.featureFlagDefer: Boolean!
\`\`\`

---

\`Client-Only Field\` \`Resolved locally\`

---

Whether to use defer"
`);

  expect(await getHover(editor, getPosition("@c|lient(always: false)")))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
@client(always: Boolean)
\`\`\`

---

Direct the client to resolve this field locally, either from the cache or local resolvers."
`);

  expect(await getHover(editor, getPosition("@client(alwa|ys: false)")))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
always: Boolean
\`\`\`

---

When true, the client will never use the cache for this value. See
https://www.apollographql.com/docs/react/local-state/local-resolvers/#forcing-resolvers-with-clientalways-true"
`);

  expect(await getHover(editor, getPosition('@expo|rt(as: "defer")')))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
@export(as: String!)
\`\`\`

---

Export this locally resolved field as a variable to be used in the remainder of this query. See
https://www.apollographql.com/docs/react/local-state/local-resolvers/#using-client-fields-as-variables"
`);

  expect(await getHover(editor, getPosition('@export(a|s: "defer")')))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
as: String!
\`\`\`

---

The variable name to export this field as."
`);

  expect(await getHover(editor, getPosition("@nonre|active")))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
@nonreactive
\`\`\`

---

The @nonreactive directive can be used to mark query fields or fragment spreads and is used to indicate that changes to the data contained within the subtrees marked @nonreactive should not trigger rerendering.
This allows parent components to fetch data to be rendered by their children without rerendering themselves when the data corresponding with fields marked as @nonreactive change.
https://www.apollographql.com/docs/react/data/directives#nonreactive"
`);

  expect(
    await getHover(editor, getPosition('@def|er(if: $defer, label: "fc")')),
  ).toMatchInlineSnapshot(`
"\`\`\`graphql
@defer(if: Boolean, label: String)
\`\`\`

---

This directive enables your queries to receive data for specific fields incrementally, instead of receiving all field data at the same time.
This is helpful whenever some fields in a query take much longer to resolve than others.
https://www.apollographql.com/docs/react/data/directives#defer"
`);

  expect(
    await getHover(editor, getPosition('@defer(i|f: $defer, label: "fc")')),
  ).toMatchInlineSnapshot(`
"\`\`\`graphql
if: Boolean
\`\`\`

---

When true fragment may be deferred, if omitted defaults to true."
`);

  expect(
    await getHover(editor, getPosition('@defer(if: $defer, labe|l: "fc")')),
  ).toMatchInlineSnapshot(`
"\`\`\`graphql
label: String
\`\`\`

---

A unique label across all @defer and @stream directives in an operation.
This label should be used by GraphQL clients to identify the data from patch responses and associate it with the correct fragment.
If provided, the GraphQL Server must add it to the payload."
`);

  expect(await getHover(editor, getPosition('@connec|tion(key: "feed")')))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
@connection(key: String!, filter: [String!])
\`\`\`

---

Specify a custom store key for this result. See
https://www.apollographql.com/docs/react/caching/advanced-topics/#the-connection-directive"
`);

  expect(await getHover(editor, getPosition('@connection(ke|y: "feed")')))
    .toMatchInlineSnapshot(`
"\`\`\`graphql
key: String!
\`\`\`

---

Specify the store key."
`);
});
