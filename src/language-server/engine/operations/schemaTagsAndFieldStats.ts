import gql from "graphql-tag";

export const SCHEMA_TAGS_AND_FIELD_STATS = gql`
  query SchemaTagsAndFieldStats($id: ID!) {
    service(id: $id) {
      schemaTags {
        tag
      }
      stats(from: "-86400", to: "-0") {
        fieldLatencies {
          groupBy {
            parentType
            fieldName
          }
          metrics {
            fieldHistogram {
              durationMs(percentile: 0.95)
            }
          }
        }
      }
    }
  }
`;
