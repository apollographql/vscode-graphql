# Stripe REST Connector

This connector currently covers a portion of the [Supabase API](https://supabase.com/docs/guides/api).

## Prerequisites

To use the connector, you need to set up a new account in supabase and at least one table schema.
In the connector template you will point to your unique supabase url and update and table names and fields to match your schema.
Supabase requires passing a key on the header which can be found in your Supabase dashboard.

Please note that the queries and mutations in this template do not take into consideration RLS (Row Level Security) policies.
If you have any RLS policies set on your table for CRUD operations, you may need to adjust the schema.

See Supabase documentation for more information about working with [RLS policies](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Getting started 

1. If you haven't already, [create a new graph in GraphOS](https://www.apollographql.com/docs/graphos/get-started/guides/rest#step-1-set-up-your-graphql-api). Once you get to the **Set up your local development environment** modal in the [Create a graph](https://www.apollographql.com/docs/graphos/get-started/guides/rest#create-a-graph) section:
    - Copy the `supergraph.yaml` and `router.yaml` files from this folder instead of the `supergraph.yaml` provided by the modal.
    - Instead of downloading the example schema provided by the modal, copy the supabase schema files you want to use for this connector
1. Grab your Supabase anon API key and set it as an environment variable for your terminal:

    ```
    export anonKey=....
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
  rover subgraph publish My-Graph-s1ff1u@main --name products --schema products.graphql --routing-url http://products

APOLLO_KEY=service:My-Graph-s1ff1u:•••••••••••••••••••••• \
  rover subgraph publish My-Graph-s1ff1u@main --name checkout --schema checkout.graphql --routing-url http://checkout
```

## Additional setup for VS Code task runner

Edit your `.vscode/settings.json` to include the following Stripe-specific key:

```
{
  "terminal.integrated.profiles.osx": {
    "graphos": {
      "path": "zsh",
      "args": ["-l"],
      "env": {
        "anonKey": "",
        ...
      }
    }
  },
  "terminal.integrated.defaultProfile.osx": "graphos"
}

```

Once you've set this up, you can execute the `Tasks: Run Task` command in VS Code to run the `rover dev` task.
Alternatively, you can open a new terminal window in VS Code with the `graphos` profile, then run `rover dev --supergraph-config supergraph.yaml --router-config router.yaml`.

## Contributing

To contribute additional modules to this connector, make sure to:

1. Add a schema designed for the module as a new `.graphql` file.
2. Update the `router.yaml` and `supergraph.yaml` files accordingly.

See [REST API reference](https://docs.stripe.com/api) for other modules that can be implemented. You can use the current modules in this folder as examples to work with. 