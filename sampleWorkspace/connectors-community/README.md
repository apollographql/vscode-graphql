# Apollo Connectors Community

This repository is for builders to share API connectors to help accelerate the community with rich starting points. The basic workflow functionality below can help a builder get a new project started in seconds with a fantastic developer experience. 

The template for creating with `connectors-community` includes:

- A fully working local instance with everything you need to connect to any REST API, just add your APOLLO_KEY and GRAPH_REF and you are ready to go
  - If you want to start with an existing/prebuilt connector in this repo, you can start with that schema and supergraph
  - If you want to create a new connector, the steps to set up your local environment with Rover CLI can be found in our [Getting Started documentation](https://www.apollographql.com/docs/quickstart)
- A graph in GraphOS created with API keys synced to your local project
- a dockerfile for [easy deployment](https://www.apollographql.com/docs/graphos/connectors/deployment#router-deployment)
- VS Code supercharged `.vscode` folder
  - `dev` command with hot reloading for all the related files available as a Task
  - Custom terminal profile created that includes GraphOS API keys
  - Recommendations for the Apollo extension

Everything's configured—it all just works. 💪

## Set up your environment

1. If you have not installed Rover before, install [Rover CLI](https://www.apollographql.com/docs/quickstart):

```sh
curl -sSL https://rover.apollo.dev/nix/latest | sh 
```
2. Run `rover init`
3. Select the option 'Create a new graph'
4. Select the option 'Start with one or more REST API's
5. Name your graph

Next Rover will generate a GRAPH_REF and APOLLO_KEY for you and provide a command to run from the terminal.

It is a best practice to take these values and add them to your terminal environment.  For VSCode, that looks like this:

In VScode > settings.js add the configuration below then restart VSCode.

```
{

 "terminal.integrated.profiles.osx": {

   "graphos": {

     "path": "zsh",

     "args": ["-l"],

     "env": {

       "APOLLO_KEY": "<YOUR_KEY>",

       "APOLLO_GRAPH_REF": "<GRAPH_REF>"

     }

   }

 },

 "terminal.integrated.defaultProfile.osx": "graphos"

}
```

Graph development is supported in other IDE's. All directions here are for VSCode.  For more details or working in other environments see [IDE Support Documentation.](https://www.apollographql.com/docs/ide-support)

## Adding and Running a Prebuilt Connector

1. From the connectors folder, choose the prebuilt Connector you want to work with and add all graphql files plus the supergraph.yaml to your new project.
2. Next open your terminal and run the following:

```
rover dev --supergraph-config supergraph.yaml
```

## Tip for VSCode users

1. Install the [VSCode extension](https://www.apollographql.com/docs/ide-support/vs-code) to provide a better development expereince when working with Connectors including syntax highlighting and realt-time feedback.
   This extension requires a configuration file in the root named `apollo.config.json` with the following inside:
```
{
  "rover": {}
}
```

2. You can also configure the `rover dev` task for VS Code in the `.vscode/tasks.json` folder:

```json
{
    "version": "2.0.0",
    "tasks": [{
        "label": "rover dev",
        "command": "rover", // Could be any other shell command
        "args": ["dev", "--supergraph-config","supergraph.yaml", "--router-config","./connectors/stripe/router.yaml"],
        "type": "shell",
        "problemMatcher": [],
    }]
}
```
## Contributing a connector to the community

We welcome any and all contributions! There are only a couple requirements:

1. *We need to be able to recreate your connector work*. Ideally we can hit some live endpoints. That isn't always possible with some APIs, but if we have an OpenAPI specification with example definitions, we can have a mocked REST API that a connector is built with.
2. *The connector must be working and complete*. You don't have to implement the entire API to contribute, just a portion of it. We just want to ensure that whatever you have implemented is used in the schema; the goal is to try and avoid unused definitions that should be pruned.

That's it! Feel free to open an issue with the ["New Connector" template](./connectors/.template) or a PR with your work. The Apollo DevRel team will help usher your contribution through the process and promote your work to the broader community. If you need some help, you can open a post on the [Apollo Community Forum](https://community.apollographql.com/c/connectors/29) and add the `connectors` tag to it. 

