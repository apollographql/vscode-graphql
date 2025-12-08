import gql from "graphql-tag";
gql`    
  """
  Query-Level Comment Test
  """
  query Test(
    """
    Argument-Level Comment Test
    """
    $defer: Boolean!
    ) {

    featureFlagDefer @client(always: false) @export(as: "defer")
    droid(id: "2000") {
      name
      model @client
      primaryFunction @nonreactive
      ... @defer(if: $defer, label: "fc") {
        friendsConnection(after: 0, first: 3) @connection(key: "feed") {
          friends {
            id
          }
        }
      }
    }
  }
  query Test2 {
    reviews(episode: EMPIRE) { __typename }
  }
`;
