import gql from "graphql-tag";
gql`
  query Test {
    droid(id: "2000") {
      name
    }
  }
`;

// prettier-ignore
const verylonglala = gql`type Foo { baaaaaar: String }`
