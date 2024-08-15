import gql from "graphql-tag";
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
`

console.log("foobar!")

gql`
type User {
  lastName: String!
}
`