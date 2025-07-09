# Public Art Museum REST Connector

This connector currently contains subgraphs schemas for:

[The Art Institute of Chicago API](https://api.artic.edu/docs/#introduction)
[The Metropolitan Museum of Art](https://metmuseum.github.io/?ref=public_apis&utm_medium=website)

These Apis are public and free to use, see the respective documentaiton for more information about usage and limitations.

These subgraph files are complimentary but do not depend on each other, they can be used independently.

## Additional Setup for VS Code Task runner

Edit your `.vscode/settings.json` to include the following keys:

```
{
  "terminal.integrated.profiles.osx": {
    "graphos": {
      "path": "zsh",
      "args": ["-l"],
      "env": {
        "APOLLO_KEY": "",
        ...
      }
    }
  },
  "terminal.integrated.defaultProfile.osx": "graphos"
}
```

Once you've set this up, you can execute the `Tasks: Run Task` command in VS Code to run the `rover dev` task.
Alternatively, you can open a new terminal window in VS Code with the `graphos` profile, then run `rover dev --supergraph-config supergraph.yaml`.

## Contributing

Other Art Museums with public apis are good candidates to contribute to this schema.

1. Add a schema designed for the module as a new `.graphql` file.
2. Update the `supergraph.yaml` file accordingly.
