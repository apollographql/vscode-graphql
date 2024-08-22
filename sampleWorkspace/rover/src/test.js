import gql from "graphql-tag";

sdfsdfs;
gql`
  """
  The query type, represents all of the entry points into our object graph
  """
  type Query {
    me: User!
  }

  """
  Test
  """
  type User {
    id: ID!
    name: String!
  }
`;

console.log("foobar!");

gql`
  type User {
    lastName: String!
  }
`;

// prettier-ignore
const verylonglala = gql`type Foo { baaaaaar: String }`
