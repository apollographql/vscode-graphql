<div align="center">

<p>
	<a href="https://www.apollographql.com/"><img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/apollo-wordmark.png" height="100" alt=""></a>
</p>
<h1>Apollo GraphQL for VS Code</h1>

[![Visual Studio Marketplace Version (including pre-releases)](https://img.shields.io/visual-studio-marketplace/v/apollographql.vscode-apollo)](https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo) [![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/apollographql.vscode-apollo)](https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo) [![Build Status](https://circleci.com/gh/apollographql/vscode-graphql.svg?style=svg)](https://circleci.com/gh/apollographql/vscode-graphql) [![Join the community](https://img.shields.io/discourse/status?label=Join%20the%20community&server=https%3A%2F%2Fcommunity.apollographql.com)](https://community.apollographql.com) [![Join our Discord server](https://img.shields.io/discord/1022972389463687228.svg?color=7389D8&labelColor=6A7EC2&logo=discord&logoColor=ffffff&style=flat-square)](https://discord.gg/graphos)

</div>

GraphQL has the potential to create incredible developer experiences, thanks to its strongly typed schema and query language. The Apollo platform brings these possibilities to life by enhancing your editor with rich metadata from your graph API.

![demo](https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/jump-to-def.gif)

The Apollo GraphQL extension for VS Code brings an all-in-one tooling experience for developing apps with Apollo.

- Add [syntax highlighting](#syntax-highlighting) for GraphQL files and gql templates inside JavaScript files
- Get instant feedback and [intelligent autocomplete](#intelligent-autocomplete) for fields, arguments, types, and variables as you write queries
- Manage client side schema alongside remote schema
- See [performance information](#performance-insights) inline with your query definitions
- Extra features to help you with [Supergraph editing](#supergraph-editing)
- Validate field and argument usage in operations
- [Navigate projects more easily](#navigating-projects) with jump-to and peek-at definitions
- Manage [client-only](#client-only-schemas) schemas
- [Switch graph variants](#graph-variant-switching) to work with schemas running on different environments

<h2 id="getting-started">Getting started</h2>

For the VS Code plugin to know how to find the schema, it needs to be linked to either a published schema or a local one.

First, create an `apollo.config.json` file at the root of the project.
Alternatively, you can create a `yaml`, `cjs`, `mjs`, or `ts` file with the same configuration.

For the contents of this configuration file, select one of these options:

<h3>Configure extension for Client development with schemas published to Apollo GraphOS</h3>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

To get all the benefits of the VS Code experience, it's best to link the schema that is being developed against before installing the extension. The best way to do that is by [publishing a schema](https://www.apollographql.com/docs/graphos/delivery/publishing-schemas/) to the Apollo schema registry.

After that's done, edit the `apollo.config.json` file to look like this:

```jsonc
{
  "client": {
    "service": "graphos-graph-name"
  }
}
```

The `service` name is the name of the graph you've created in [GraphOS Studio](https://studio.apollographql.com).

See [additional configuration options](#additional-apollo-config-options).

To authenticate with GraphOS Studio to pull down your schema, create a `.env` file in the same directory as the `apollo.config.json` file. This should be an untracked file (that is, don't commit it to Git).

Then go to your [User Settings page](https://studio.apollographql.com/user-settings/api-keys?referrer=docs-content) in GraphOS Studio to create a new Personal API key.

> It is best practice to create a new API key for each member of the team and name the key so its easy to find and revoke if needed. This will be easier to manage in the future.

After the key is found, add the following line to the `.env` file:

```bash showLineNumbers=false
APOLLO_KEY=<enter copied key here>
```

After this is done, VS Code can be reloaded and the Apollo integration will connect to GraphOS Studio to provide autocomplete, validation, and more.

</details>

<h3>Configure extension for Supergraph Schema development</h3>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

The extension can integrate with the [Rover CLI](https://www.apollographql.com/docs/rover/) to help you design Supergraph Schemas with additional support for Apollo Federation.

For this, please make sure that you have [installed Rover](https://www.apollographql.com/docs/rover/getting-started) and [configured Rover](https://www.apollographql.com/docs/rover/configuring).

After that, edit your `apollo.config.json` to look like this:

```jsonc
{
  "rover": {
    // optional, if your rover binary is in PATH it will automatically be detected
    "bin": "/path/to/rover",
    // optional, defaults to `supergraph.yaml` in the folder of the configuration file
    "supergraphConfig": "/path/to/supergraph.yaml",
    // optional, defaults to the Rover default profile
    "profile": ""
  }
}
```

As all of these options are optional, it can be enough to just specify the `rover` key to indicate that you want to use Rover for Schema development instead of doing Client development:

```jsonc
{
  "rover": {}
}
```

After this is done, VS Code can be reloaded and the Apollo extension will start using Rover to help you build your Supergraph.

</details>

<h3 id="local-schemas">Configure extension for Client development with introspection from a locally running service</h3>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

Sometimes it may make sense to link the editor to a locally running version of a schema to try out new designs that are in active development. To do this, the `apollo.config.json` file can be linked to a local service definition:

```jsonc
{
  "client": {
    "service": {
      "name": "my-graphql-app",
      "url": "http://localhost:4000/graphql"
    }
  }
}
```

Linking to the local schema won't provide all features, such as switching graph variants and performance metrics.

</details>

<h3 id="local-schema-files">Configure extension for Client development with local schema files</h3>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

You might not always have a running server to link to, so the extension also supports linking to a local schema file.
This is useful for working on a schema in isolation or for testing out new features.
To link to a local schema file, add the following to the `apollo.config.json` file:

```jsonc
{
  "client": {
    "service": {
      // can be a string pointing to a single file or an array of strings
      "localSchemaFile": "./path/to/schema.graphql"
    }
  }
}
```

</details>

<h3 id="client-only-schemas">Bonus: Adding Client-only schemas</h3>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>
One of the best features of the VS Code extension is the automatic merging of remote schemas and local ones when using integrated state management with Apollo Client. This happens automatically whenever schema definitions are found within a client project. By default, the VS Code extension will look for all JavaScript, TypeScript and GraphQL files under `./src` to find both the operations and schema definitions for building a complete schema for the application.

Client side schema definitions can be spread throughout the client app project and will be merged together to create one single schema. The default behavior can be controlled by adding specifications to the `apollo.config.json`:

```jsonc
{
  "client": {
    // "service": <your service configuration>,
    // array of glob patterns
    "includes": ["./src/**/*.js"],
    // array of glob patterns
    "excludes": ["**/__tests__/**"]
  }
}
```

</details>

<h3 id="get-the-extension">Get the extension</h3>

Once you have a config set up and a schema published, [install the Apollo GraphQL extension](https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo), then try opening a file containing a GraphQL operation.

When a file open, clicking the status bar icon will open the output window and print stats about the project associated with that file. This is helpful when confirming the project is setup properly.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/stats.gif"  alt="Clicking the status bar icon to open the output pane">

<h2 id="features">Features</h2>

Apollo for VS Code brings many helpful features for working on a GraphQL project.

<h3 id="intelligent-autocomplete">Intelligent autocomplete</h3>

Once configured, VS Code has full knowledge of the schema clients are running operations against, including client-only schemas (for things like local state mutations). Because of this, it have the ability to autocomplete fields and arguments as you type.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/autocomplete.gif"  alt="vscode completing a field when typing">

<h3 id="errors-and-warnings">Inline errors and warnings</h3>

VS Code can use local or published schemas to validate operations before running them. **Syntax errors**, **invalid fields or arguments**, and even **deprecated fields** instantly appear as errors or warnings right in your editor, ensuring all developers are working with the most up-to-date production schemas.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/warnings-and-errors.gif"  alt="tooltip showing a field deprecation warning and error">

<h3 id="field-type-info">Inline field type information</h3>

Because of GraphQL's strongly-typed schema, VS Code not only know about which fields and arguments are valid, but also what types are expected. Hover over any type in a valid GraphQL operation to see what type that field returns and whether or not it can be null.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/type-info.png" style="max-width:800px;" alt="a tooltip showing a Boolean type for a field">

<h3 id="performance-insights">Performance insights</h3>

GraphQL's flexibility can make it difficult to predict the cost of an operation. Without insight into how expensive an operation is, developers can accidentally write queries that place strain on their graph API's underlying backends. Thanks to the Apollo platform's integration with VS Code and our trace warehouse, teams can avoid these performance issues altogether by instantly seeing the cost of a query right in their editor.

The VS Code extension will show inline performance diagnostics when connected to a service with reported metrics in GraphOS Studio. As operations are typed, any fields that take longer than 1 ms to respond will be annotated to the right of the field inline! This gives team members a picture of how long the operation will take as more and more fields are added to operations or fragments.

<img
  src="https://raw.githubusercontent.com/apollographql/vscode-graphql/80a6ca4ae59173b8cef25020345e4ebe202eec41/images/marketplace/perf-annotation.png"
  width="80%"
  style="margin: 5%"
  alt="Performance annotation next to a field"
/>

<h3 id="syntax-highlighting">Syntax highlighting</h3>

Apollo's editor extension provides syntax highlighting for all things GraphQL, including schema definitions in `.graphql` files, complex queries in TypeScript, and even client-only schema extensions. Syntax highlighting for GraphQL works out-of-the-box in GraphQL, JavaScript, TypeScript, Python, Lua, Ruby, Dart, Elixir and ReasonML files.

<h3 id="supergraph-editing">Supergraph editing</h3>

The extension provides features for Supergraph editing, such as support for Federation directives, subgraph-spanning go-to-definition and reporting composition errors directly to the "Problems" panel.

<img
  src="https://raw.githubusercontent.com/apollographql/vscode-graphql/be7abe7d5ca348c3138642ce528ace3009ef7a6d/images/marketplace/federation-directive-hover.png"
  alt="Hover on Federation directive"
/>

<h3 id="navigating-projects">Navigating projects</h3>

Navigating large codebases can be difficult, but the Apollo GraphQL extension makes this easier. Right-clicking on any field in operations or schemas gives you the ability to jump to (or peek at) definitions, as well as find any other references to that field in your project.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/jump-to-def.gif"  alt="Using jump to definition on a fragment">

<h3 id="graph-variant-switching">Schema tag switching</h3>

Apollo supports publishing multiple versions ([variants](https://www.apollographql.com/docs/graphos/graphs/#variants)) of a schema. This is useful for developing on a future development schema and preparing your clients to conform to that schema. To switch between graph variants, open the Command Palette (`cmd + shift + p` on mac), search "Apollo" and choose the "Apollo: Select Schema Tag" option.

<h2 id="troubleshooting">Troubleshooting</h2>

The most common errors are configuration errors, like a missing `.env` file or incorrect service information in the `apollo.config.json` file. Please see [the Apollo config docs](https://www.apollographql.com/docs/devtools/apollo-config/) for more configuration guidance.

Other errors may be caused from an old version of a published schema. To reload a schema, open the Command Palette (`cmd + shift + p` on mac), search "Apollo" and choose the "Apollo: Reload Schema" option.

Sometimes errors will show up as a notification at the bottom of your editor. Other, less critical, messages may be shown in the output pane of the editor. To open the output pane and get diagnostic information about the extension and the current service loaded (if working with a client project), just click the "Apollo GraphQL" icon in the status bar at the bottom.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/stats.gif"  alt="Clicking the status bar icon to open the output pane">

If problems persist or the error messages are unhelpful, open an [issue](https://github.com/apollographql/vscode-graphql/issues) in the `vscode-graphql` repository.

<h2 id="additional-apollo-config-options">Additional Apollo config options</h2>

You can add these configurations to your [Apollo config file](#setting-up-an-apollo-config).

<h3 id="option-client-tagName">client.tagName</h3>

_Optional_ - custom tagged template literal.

When using GraphQL with JavaScript or TypeScript projects, it is common to use the `gql` tagged template literal to write out operations. Apollo tools look through your files for the `gql` tag to extract your queries, so if you use a different template literal, you can configure it like so:

```jsonc
{
  "client": {
    "tagName": "graphql",
    "service": //...
  }
}
```
