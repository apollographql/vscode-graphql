# Strapi REST Connector

This connector currently covers the users [content-type](https://docs.strapi.io/cms/backend-customization/models) in Strapi.

## Prerequisites

To use the connector, you need a [Strapi API token](https://docs.strapi.io/cms/features/api-tokens).

## Getting started 

1. If you haven't already, [create a new graph in GraphOS](https://www.apollographql.com/docs/graphos/get-started/guides/rest#step-1-set-up-your-graphql-api). Once you get to the **Set up your local development environment** modal in the [Create a graph](https://www.apollographql.com/docs/graphos/get-started/guides/rest#create-a-graph) section:
    - Copy the `supergraph.yaml` and `router.yaml` files from this folder instead of the `supergraph.yaml` provided by the modal.
    - Instead of downloading the example schema provided by the modal, copy the `users.graphql` schema file.
1. Grab your Strapi API key and set it as an environment variable for your terminal:

    ```
    export STRAPI_API_KEY=....
    ```

1. Run `rover dev` to start the local development session:

    ```
    APOLLO_KEY=service:My-Graph-s1ff1u:•••••••••••••••••••••• \
      APOLLO_GRAPH_REF=My-Graph-s1ff1u@main \
      rover dev --supergraph-config supergraph.yaml --router-config router.yaml
    ```

You’re all set! Open up http://localhost:4000 to query your graph using Apollo Sandbox.

### Adding to an existing graph in GraphOS

To add these connectors to an existing graph, publish the schema files to your graph ref using `rover subgraph publish`:

```
APOLLO_KEY=service:My-Graph-s1ff1u:•••••••••••••••••••••• \
  rover subgraph publish My-Graph-s1ff1u@main --name users --schema users.graphql --routing-url http://users
```

## Additional setup for VS Code task runner

Edit your `.vscode/settings.json` to include the following Strapi-specific keys

```
{
  "terminal.integrated.profiles.osx": {
    "graphos": {
      "path": "zsh",
      "args": ["-l"],
      "env": { 
        "STRAPI_URL: "",
        "STRAPI_API_KEY": "",
      }
    }
  },
  "terminal.integrated.defaultProfile.osx": "graphos"
}

```

Once you've set this up, you can execute the `Tasks: Run Task` command in VS Code to run the `rover dev` task.
Alternatively, you can open a new terminal window in VS Code with the `graphos` profile, then run `rover dev --supergraph-config supergraph.yaml --router-config router.yaml`.

## Contributing

The following schema modules can be added to this connector:

- [Roles](https://docs.strapi.io/user-docs/users-roles-permissions/configuring-end-users-roles)

To contribute them, make sure to:

1. Add a schema designed for the module as a new `.graphql` file.
2. Update the `router.yaml` and `supergraph.yaml` files accordingly.


See [REST API reference](https://docs.strapi.io/cms/api/rest) for other modules that can be implemented. You can use the current modules in this folder as examples to work with. 