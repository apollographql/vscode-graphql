# OpenAI REST Connector

This connector currently covers the [chat](https://platform.openai.com/docs/api-reference/chat) and [assistants (beta)](https://platform.openai.com/docs/api-reference/assistants) APIs provided by OpenAI.

## Prerequisites

To use the connector, you need a [OpenAI API token](https://platform.openai.com/docs/api-reference/authentication).

## Getting started 

1. If you haven't already, [create a new graph in GraphOS](https://www.apollographql.com/docs/graphos/get-started/guides/rest#step-1-set-up-your-graphql-api). Once you get to the **Set up your local development environment** modal in the [Create a graph](https://www.apollographql.com/docs/graphos/get-started/guides/rest#create-a-graph) section:
    - Copy the `supergraph.yaml` and `router.yaml` files from this folder instead of the `supergraph.yaml` provided by the modal.
    - Instead of downloading the example schema provided by the modal, copy the schema file from this fodler that you want to use.
1. Grab your Strapi API key and set it as an environment variable for your terminal:

    ```
    export OPENAI_API_KEY=....
    ```

2. Run `rover dev` to start the local development session:

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
  rover subgraph publish My-Graph-s1ff1u@main --name models --schema models.graphql --routing-url http://usmodelsers
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