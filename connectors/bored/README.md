# Bored API REST Connector

This connector covers the full [Bored API](https://bored-api.appbrewery.com/).  This is an API that retrieves random activites. 

This API is considered a teaching tool and is best used for practice with Connectors. It has no business or production value, but sometimes that's nice.

API Requests are rate limited to 100 requests every 15 minutes.

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

This conector will not evolve, however, contributions of other REST API connectors are welcome. Please see the [Contribution Guide](https://github.com/apollographql/connectors-community/tree/main?tab=readme-ov-file#contributing-a-connector-to-the-community)
