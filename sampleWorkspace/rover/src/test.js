import gql from "graphql-tag";
gql`
"""
The query type, represents all of the entry points into our object graph
"""
type Query {
  me: User!
}
 
type User {
  id: ID!
  name: String!
}
`