# Todoist Connector

This connector implements Todoist APIs and currently covers Projects and Tasks.

## Prerequisites

Todoist provides access to API's and the product in a freemium model. See their documentation for more information.
[Todoist v1 API Documentation](https://developer.todoist.com/api/v1)

*Please note that while todoist does have a v2 API, v1 is the latest version as of the time of development.
The structure of the JSON response for tasks and Projects is different between these two versions.

A Bearer token is required to call todoist APIs, see [the documentation](https://www.todoist.com/help/articles/find-your-api-token-Jpzx9IIlB) for more information.

## Getting Started

1. Create an [Apollo Studio](https://studio.apollographql.com/) account. This will provide the abilty to create and manage your graph including necesary credentials APOLLO_KEY and APOLLO_GRAPH_REF
2. [Install](https://www.apollographql.com/docs/rover/getting-started#installation-methods) and [authenticate](https://www.apollographql.com/docs/rover/configuring) Rover CLI to configure your graph and run locally.
3. Run `rover init` to generate a new connector.  See the [Rover CLI documentation](https://www.apollographql.com/docs/rover) for more information and commands.


## Additional Setup for VS Code Task runner

Edit your `.vscode/settings.json` to include the following keys:

```
{
  "terminal.integrated.profiles.osx": {
    "graphos": {
      "path": "zsh",
      "args": ["-l"],
      "env": {
        "API_KEY": "",
        "APOLLO_KEY": "",
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

If you are interested in contributing to this or other connectors we welcome contributions. PLease see the [contributing guide](https://github.com/apollographql/connectors-community?tab=readme-ov-file#contributing-a-connector-to-the-community) for more information
