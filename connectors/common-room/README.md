# Common Room REST Connector

This connector currently covers the Contact object in Common Room](https://api.commonroom.io/docs/) REST API. To use this, you'll need to add a `COMMON_ROOM_API_KEY` in your environment variables then running `rover` or the `router` binary with the config files in this folder (`router.yaml` and `supergraph.yaml`). 

## Contributing

A partial implementation of the `Contacts` API has been implemented including: 

- GET contact by email
- POST add note to contact

The following schema modules still need to be implemented:

- Activities
- Segments
- Tags
- Right to be Forgotten

To contribute any of these modules, you'll need to:

1. A schema designed for that portion of the rest API as a new `.graphql` file
2. Add the new `.graphql` file to the `supergraph.yaml` 
3. Add the connector config to the `router.yaml` and be sure to use the subgraph name you populated in the previous step (referenced in `supergraph.yaml`)