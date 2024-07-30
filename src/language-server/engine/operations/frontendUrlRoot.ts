import { TypedDocumentNode } from "@apollo/client/core";
import gql from "graphql-tag";
import type {
  FrontendUrlRootQuery,
  FrontendUrlRootQueryVariables,
} from "src/language-server/graphqlTypes";

export const FRONTEND_URL_ROOT: TypedDocumentNode<
  FrontendUrlRootQuery,
  FrontendUrlRootQueryVariables
> = gql`
  query FrontendUrlRoot {
    frontendUrlRoot
  }
`;
