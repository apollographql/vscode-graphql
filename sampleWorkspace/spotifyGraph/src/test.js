import gql from "graphql-tag";
gql`
  query CurrentUserQuery {
    me {
      profile {
        id
        displayName
      }
    }
  }
`;
