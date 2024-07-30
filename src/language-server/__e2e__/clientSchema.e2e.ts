import { TextEditor } from "vscode";
import { closeAllEditors, openEditor, testCompletion, getHover } from "./utils";

let editor: TextEditor;
beforeAll(async () => {
  closeAllEditors();
  editor = await openEditor("clientSchema/src/test.js");
});

test("completion", async () => {
  // dro|id
  await testCompletion(editor, [4, 7], [["droid", "Droid"]]);
  // na|me
  await testCompletion(editor, [5, 8], [["name", "String!"]]);
  // mo|del
  await testCompletion(editor, [6, 8], [["model", "String"]]);
});

test("hover", async () => {
  // featu|reFlagDefer
  expect(await getHover(editor, [3, 10])).toMatchInlineSnapshot(`
"\`\`\`graphql
Query.featureFlagDefer: Boolean!
\`\`\`

---

\`Client-Only Field\` \`Resolved locally\`

---

Whether to use defer"
`);

  // @c|lient(always: false)
  expect(await getHover(editor, [3, 24])).toMatchInlineSnapshot(`
"\`\`\`graphql
@client(always: Boolean)
\`\`\`

---

Direct the client to resolve this field locally, either from the cache or local resolvers."
`);

  // @client(alwa|ys: false)
  expect(await getHover(editor, [3, 33])).toMatchInlineSnapshot(`
"\`\`\`graphql
always: Boolean
\`\`\`

---

When true, the client will never use the cache for this value. See
https://www.apollographql.com/docs/react/local-state/local-resolvers/#forcing-resolvers-with-clientalways-true"
`);

  // @expo|rt(as: "defer")
  expect(await getHover(editor, [3, 49])).toMatchInlineSnapshot(`
"\`\`\`graphql
@export(as: String!)
\`\`\`

---

Export this locally resolved field as a variable to be used in the remainder of this query. See
https://www.apollographql.com/docs/react/local-state/local-resolvers/#using-client-fields-as-variables"
`);
  expect(await getHover(editor, [3, 53])).toMatchInlineSnapshot(`
"\`\`\`graphql
as: String!
\`\`\`

---

The variable name to export this field as."
`);

  // @nonre|active
  expect(await getHover(editor, [7, 28])).toMatchInlineSnapshot(`
"\`\`\`graphql
@nonreactive
\`\`\`

---

The @nonreactive directive can be used to mark query fields or fragment spreads and is used to indicate that changes to the data contained within the subtrees marked @nonreactive should not trigger rerendering.
This allows parent components to fetch data to be rendered by their children without rerendering themselves when the data corresponding with fields marked as @nonreactive change.
https://www.apollographql.com/docs/react/data/directives#nonreactive"
`);

  // @def|er(if: $defer, label: "fc")
  expect(await getHover(editor, [8, 14])).toMatchInlineSnapshot(`
"\`\`\`graphql
@defer(if: Boolean, label: String)
\`\`\`

---

This directive enables your queries to receive data for specific fields incrementally, instead of receiving all field data at the same time.
This is helpful whenever some fields in a query take much longer to resolve than others.
https://www.apollographql.com/docs/react/data/directives#defer"
`);
  //@defer(i|f: $defer, label: "fc")
  expect(await getHover(editor, [8, 18])).toMatchInlineSnapshot(`
"\`\`\`graphql
if: Boolean
\`\`\`

---

When true fragment may be deferred, if omitted defaults to true."
`);
  //@defer(if: $defer, labe|l: "fc")
  expect(await getHover(editor, [8, 33])).toMatchInlineSnapshot(`
"\`\`\`graphql
label: String
\`\`\`

---

A unique label across all @defer and @stream directives in an operation.
This label should be used by GraphQL clients to identify the data from patch responses and associate it with the correct fragment.
If provided, the GraphQL Server must add it to the payload."
`);
  // @connec|tion(key: "feed")
  expect(await getHover(editor, [9, 53])).toMatchInlineSnapshot(`
"\`\`\`graphql
@connection(key: String!, filter: [String!])
\`\`\`

---

Specify a custom store key for this result. See
https://www.apollographql.com/docs/react/caching/advanced-topics/#the-connection-directive"
`);
  // @connection(ke|y: "feed")
  expect(await getHover(editor, [9, 61])).toMatchInlineSnapshot(`
"\`\`\`graphql
key: String!
\`\`\`

---

Specify the store key."
`);
});
