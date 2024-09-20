import gql from "graphql-tag";
gql`
  query Test {
    droid(id: "2000") {
      dName: name
    }
    planets {
      id
      name
    }
  }
`;
