# Google Maps REST Connector

This connector currently covers a portion of the [Google Maps Legacy API](https://developers.google.com/maps/documentation/places/web-service/legacy/details).

Including:
[Place Search](https://developers.google.com/maps/documentation/places/web-service/legacy/search)
[Distance Matrix](https://developers.google.com/maps/documentation/distance-matrix/distance-matrix)
[Timezone](https://developers.google.com/maps/documentation/timezone/requests-timezone)

Google Maps has two types of REST APIs, legacy requires an [API KEY passed via the URL](https://developers.google.com/maps/documentation/places/web-service/get-api-key#creating-api-keys). 

It is important to restrict the use of these keys and to not expose these calls to the client.

If you require any features from the new API's, they use [OAUTH2](https://developers.google.com/maps/documentation/places/web-service/oauth-token) and will require updates to this schema to use.

At the time of this writing legacy maps API's are stable for use but will not recieve new features.

You can read more in Google Maps Documenation.

## Prerequisites

To use the connector, you need a [Google Maps API key](https://developers.google.com/maps/documentation/places/web-service/get-api-key#creating-api-keys).

## Getting started 

1. If you haven't already, [create a new graph in GraphOS](https://www.apollographql.com/docs/graphos/get-started/guides/rest#step-1-set-up-your-graphql-api). Once you get to the **Set up your local development environment** modal in the [Create a graph](https://www.apollographql.com/docs/graphos/get-started/guides/rest#create-a-graph) section:
    - Copy the `supergraph.yaml` file from this folder instead of the `supergraph.yaml` provided by the modal.
    - Instead of downloading the example schema provided by the modal, copy the schema files from this folder
      - *Note: If you only want to one of the schema files, you need to modify the `supergraph.yaml` file to only contain the respective schema file .*

1. Run `rover dev` to start the local development session:

    ```
    APOLLO_KEY=service:My-Graph-s1ff1u:•••••••••••••••••••••• \
      APOLLO_GRAPH_REF=My-Graph-s1ff1u@main \
      rover dev --supergraph-config supergraph.yaml
    ```

You’re all set! Open up http://localhost:4000 to query your graph using Apollo Sandbox.

### Adding to an existing graph in GraphOS

To add these connectors to an existing graph, publish the schema files to your graph ref using `rover subgraph publish` example below:

```
APOLLO_KEY=service:My-Graph-s1ff1u:•••••••••••••••••••••• \
  rover subgraph publish My-Graph-s1ff1u@main --name places --schema places.graphql --routing-url http://places

```

## Contributing

To add other modules to this schema, see the [Google Maps API list](https://console.cloud.google.com/google/maps-apis/api-list) - only legacy API KEY endpoints should be added to this schema

To contribute them, make sure to:

1. Add a schema designed for the module as a new `.graphql` file.
2. Update the `supergraph.yaml` file accordingly.
