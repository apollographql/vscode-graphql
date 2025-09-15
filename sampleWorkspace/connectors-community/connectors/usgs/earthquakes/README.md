# USGS earthquakes with location data from Nominatum REST Connector

This connector is a minimal implementation of USGS Earthquakes and Nominatum reverse geocoding API developed to support a tutorial demo in //blog link coming soon// and is implemented in [graphql-version branch](https://github.com/AmandaApollo/earthquake-finder/tree/graphql-version) of [this repository](https://github.com/AmandaApollo/earthquake-finder).

## Prerequisites

USGS and Nominatum are free to access APIs that enforce their own rate limits. 
[USGS API Documentation](https://earthquake.usgs.gov/fdsnws/event/1/)
[Nominatum API Documentation](https://nominatim.org/release-docs/develop/api/Overview/)

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

This implementation was created to support a tutorial and therefore will not accept modifications to evolve it at this time.  If you are interested in contributing to this resource, you may do so as a separate .`graphql` file. 
