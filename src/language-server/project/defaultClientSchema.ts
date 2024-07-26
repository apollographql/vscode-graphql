import { GraphQLDocument } from "../document";
import { Source } from "graphql";

export const apolloClientSchema = `#graphql
"""
Direct the client to resolve this field locally, either from the cache or local resolvers.
"""
directive @client(
  """
  When true, the client will never use the cache for this value. See
  https://www.apollographql.com/docs/react/local-state/local-resolvers/#forcing-resolvers-with-clientalways-true
  """
  always: Boolean
) on FIELD | FRAGMENT_DEFINITION | INLINE_FRAGMENT

"""
Export this locally resolved field as a variable to be used in the remainder of this query. See
https://www.apollographql.com/docs/react/local-state/local-resolvers/#using-client-fields-as-variables
"""
directive @export(
  """
  The variable name to export this field as.
  """
  as: String!
) on FIELD

"""
Specify a custom store key for this result. See
https://www.apollographql.com/docs/react/caching/advanced-topics/#the-connection-directive
"""
directive @connection(
  """
  Specify the store key.
  """
  key: String!
  """
  An array of query argument names to include in the generated custom store key.
  """
  filter: [String!]
) on FIELD

"""
The @nonreactive directive can be used to mark query fields or fragment spreads and is used to indicate that changes to the data contained within the subtrees marked @nonreactive should not trigger rerendering.
This allows parent components to fetch data to be rendered by their children without rerendering themselves when the data corresponding with fields marked as @nonreactive change.
https://www.apollographql.com/docs/react/data/directives#nonreactive
"""
directive @nonreactive on FIELD

"""
This directive enables your queries to receive data for specific fields incrementally, instead of receiving all field data at the same time.
This is helpful whenever some fields in a query take much longer to resolve than others.
https://www.apollographql.com/docs/react/data/directives#defer
"""
directive @defer on FRAGMENT_SPREAD | INLINE_FRAGMENT
`;

export const apolloClientSchemaDocument = new GraphQLDocument(
  new Source(apolloClientSchema),
);
