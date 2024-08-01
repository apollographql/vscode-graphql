import gql from "graphql-tag";
gql`
  query Test($defer: Boolean!) {
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
`;
