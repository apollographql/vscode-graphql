import gql from "graphql-tag";

export const FRONTEND_URL_ROOT = gql`
  query FrontendUrlRoot {
    frontendUrlRoot
  }
`;
