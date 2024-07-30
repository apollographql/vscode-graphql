import gql from "graphql-tag";
gql`
  query Test {
    books {
      title
      author
    }
  }
`;
