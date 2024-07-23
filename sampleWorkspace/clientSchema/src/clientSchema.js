import gql from "graphql-tag";
gql`
extend type Droid {
    """
    A client-side addition
    """
    model: String
}
`