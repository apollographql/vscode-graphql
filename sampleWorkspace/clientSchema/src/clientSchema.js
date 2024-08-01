import gql from "graphql-tag";
gql`
  extend type Droid {
    """
    A client-side addition
    """
    model: String @deprecated(reason: "It's just a robot...")
  }

  extend type Query {
    """
    Whether to use defer
    """
    featureFlagDefer: Boolean!
  }
`;
