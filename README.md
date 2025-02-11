<div align="center">

<p>
	<a href="https://www.apollographql.com/"><img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/apollo-wordmark.png" height="100" alt=""></a>
</p>
<h1>Apollo GraphQL for VS Code</h1>

[![Visual Studio Marketplace Version (including pre-releases)](https://img.shields.io/visual-studio-marketplace/v/apollographql.vscode-apollo)](https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo) [![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/apollographql.vscode-apollo)](https://marketplace.visualstudio.com/items?itemName=apollographql.vscode-apollo) [![Build Status](https://circleci.com/gh/apollographql/vscode-graphql.svg?style=svg)](https://circleci.com/gh/apollographql/vscode-graphql) [![Join the community](https://img.shields.io/discourse/status?label=Join%20the%20community&server=https%3A%2F%2Fcommunity.apollographql.com)](https://community.apollographql.com)

</div>

Thanks to its strongly typed schema and query language, GraphQL has the potential to create incredible developer experiences. The Apollo platform brings these possibilities to life by enhancing your editor with rich metadata from your graph API.

![demo](https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/jump-to-def.gif)

The Apollo GraphQL extension for VS Code brings an all-in-one tooling experience for developing apps with Apollo.

The extension provides:

- [Syntax highlighting](#syntax-highlighting) for GraphQL files and `gql` templates in JavaScript
- Real-time feedback, including [intelligent autocomplete](#intelligent-autocomplete) for fields, arguments, types, and variables as you write queries
- Client-side and remote schema management, including [client-only](#client-only-schemas) schemas
- Inline [performance information](#performance-insights) and [supergraph editing](#supergraph-editing) tool
- [Streamlined project navigation](#navigating-projects) with jump-to and peek-at definitions
- [Switch graph variants](#graph-variant-switching) to work with schemas running on different environments

Starting with version 2.3.3, the extension also works with Apollo Connectors. [Learn more.](#developing-connectors)

<h2 id="getting-started">Getting started</h2>


The VS Code extension must be linked to a published or local schema via a configuration file.

<h3 id="configuration">Configuration</h3>

The VS Code extension requires a `apollo.config.json` configuration file at the root of the project.
Alternatively, you can create a `yaml`, `cjs`, `mjs`, or `ts` file with the same configuration.

Select one of the options below to define the contents of this configuration file.

<h4>Configure extension for client development with schemas published to Apollo GraphOS</h4>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

To get all the benefits of the VS Code experience, it's best to link the schema being developed before installing the extension. The best way to do that is by [publishing a schema](https://www.apollographql.com/docs/graphos/delivery/publishing-schemas/) to the [GraphOS schema registry](https://www.apollographql.com/docs/graphos#core-features).

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

To authenticate with GraphOS Studio to pull down your schema, create an `.env` file in the same directory as the `apollo.config.json` file. The `.env` file should be untracked—that is, don't commit it to Git.

Then, go to your [User Settings page](https://studio.apollographql.com/user-settings/api-keys?referrer=docs-content) in GraphOS Studio to create a new personal API key.

> It's best practice to create a new API key for each team member. API keys should also be named so they're easy to find and revoke if needed.

After you've created your API key, add the following line to the `.env` file:

```bash showLineNumbers=false
APOLLO_KEY=<enter copied key here>
```

Afterward, reload VS Code. The Apollo integration will connect to GraphOS Studio to provide autocomplete, validation, and more.

</details>

<h4>Configure extension for supergraph schema development</h4>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

The extension can integrate with the [Rover CLI](https://www.apollographql.com/docs/rover/) to help you design supergraph schemas with additional support for Apollo Federation.

Ensure you've [installed](https://www.apollographql.com/docs/rover/getting-started) and [configured](https://www.apollographql.com/docs/rover/configuring) the [latest Rover release](https://github.com/apollographql/rover/releases).

Next edit your `apollo.config.json` to look like this:

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

Since all these options are optional, you can specify only the `rover` key to indicate you're using Rover for schema development rather than client development:

```jsonc
{
  "rover": {}
}
```

Afterward, reload VS Code. The Apollo extension will start using Rover to help you build your supergraph.

</details>

<h4 id="local-schemas">Configure extension for client development with introspection from a locally running service</h4>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

To experiment with designs under active development, you can link the editor to a locally running version of a schema. Link the `apollo.config.json` file to a local service definition like so:

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

Linking to local schemas won't provide all extension features, such as switching graph variants and performance metrics.

</details>

<h4 id="local-schema-files">Configure extension for client development with local schema files</h4>
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

<h4 id="client-only-schemas">Bonus: Adding client-only schemas</h4>
<details>
<summary>
<i>Expand for instructions.</i>
</summary>

One of the best features of the VS Code extension is the automatic merging of remote and local schemas when using integrated state management with Apollo Client. This happens automatically whenever schema definitions are found within a client project. By default, the VS Code extension will look for all JavaScript, TypeScript, and GraphQL files under `./src` to find both the operations and schema definitions for building a complete schema for the application.

Client-side schema definitions can be spread throughout the client app project and will be merged to create one single schema. You can set the default behavior by adding specifications to the `apollo.config.json`:

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

After opening a file, click the status bar icon to open the output window and see stats about the project associated with that file. This is helpful for confirming that the project is set up properly.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/stats.gif"  alt="Clicking the status bar icon to open the output pane">

<h2 id="features">Features</h2>

Apollo for VS Code offers a range of useful features for working on GraphQL projects.

<h3 id="intelligent-autocomplete">Intelligent autocomplete</h3>

Once configured, VS Code has full knowledge of the schema clients are running operations against, including client-only schemas (for things like local state mutations). Because of this, it have the ability to autocomplete fields and arguments as you type.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/autocomplete.gif"  alt="vscode completing a field when typing">

<h3 id="errors-and-warnings">Inline errors and warnings</h3>

VS Code can use local or published schemas to validate operations before running them. **Syntax errors**, **invalid fields or arguments**, and even **deprecated fields** instantly appear as errors or warnings in your editor, ensuring your entire team is working with the most up-to-date production schemas.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/warnings-and-errors.gif"  alt="tooltip showing a field deprecation warning and error">

<h3 id="field-type-info">Inline field type information</h3>

Because of GraphQL's strongly typed schema, VS Code knows not only which fields and arguments are valid, but also what types are expected. Hover over any type in a valid GraphQL operation to see what type that field returns and whether or not it can be null.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/type-info.png" style="max-width:800px;" alt="a tooltip showing a Boolean type for a field">

<h3 id="performance-insights">Performance insights</h3>

GraphQL's flexibility can make it difficult to predict the cost of an operation. Without insight into how expensive an operation is, developers can accidentally write queries that place strain on their graph API's underlying backends. Thanks to the Apollo platform's integration with VS Code and our trace warehouse, teams can avoid these performance issues by instantly seeing the cost of a query in their editor.

The VS Code extension will show inline performance diagnostics when connected to a service with reported metrics in GraphOS Studio. As operations are typed, any fields that take longer than 1 ms to respond will be annotated to the right of the field inline. This shows team members how long the operation will take as more and more fields are added to operations or fragments.

<img
  src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/perf-annotation.png"
  width="80%"
  style="margin: 5%"
  alt="Performance annotation next to a field"
/>

<h3 id="syntax-highlighting">Syntax highlighting</h3>

Apollo's editor extension provides syntax highlighting for all things GraphQL, including schema definitions in `.graphql` files, complex queries in TypeScript, and even client-only schema extensions. Syntax highlighting for GraphQL works out-of-the-box in GraphQL, JavaScript, TypeScript, Python, Lua, Ruby, Dart, Elixir, and ReasonML files.

<h3 id="supergraph-editing">supergraph editing</h3>

The extension provides features for supergraph editing, such as support for Federation directives, subgraph-spanning go-to-definition, and reporting composition errors directly to the **Problems** panel.

<img
  src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/federation-directive-hover.png"
  alt="Hover on Federation directive"
/>

<h3 id="navigating-projects">Navigating projects</h3>

Navigating large codebases can be difficult, but the Apollo GraphQL extension makes this easier. Right-clicking on any field in operations or schemas allows you to jump to (or peek at) definitions and find any other references to that field in your project.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/jump-to-def.gif"  alt="Using jump to definition on a fragment">

<h3 id="graph-variant-switching">Schema tag switching</h3>

Apollo supports publishing multiple versions ([variants](https://www.apollographql.com/docs/graphos/graphs/#variants)) of a schema. This is useful for developing on a future development schema and preparing your clients to conform to that schema. To switch between graph variants, open the Command Palette (`cmd + shift + p` on mac), search "Apollo" and choose the "Apollo: Select Schema Tag" option.

<h3 id="developing-connectors">Developing Connectors</h3>

Starting with version 2.3.3, the Apollo GraphQL VS Code extension can give you fast feedback on your Apollo Connectors in VS Code. Through it, you can get the _same_ validations that composition provides, with errors and hints highlighted in your schema file on each save.

<h4 id="prerequisites">Prerequisites</h4>

These composition-based diagnostics are powered by Rover. You'll need Rover version 0.27.0 or later [installed](/rover/getting-started) to use composition-based diagnostics.

<h4 id="connector-configuration">Connector Configuration</h4>

By default, you need two files in the root of your project to enable connector validations in VS Code:

1. An `apollo.config.yaml` file containing `rover: {}`
2. A `supergraph.yaml` file that's the
   [configuration file](/rover/commands/supergraphs#yaml-configuration-file)
   used for `rover dev`, `rover supergraph compose`, and this VS Code extension.
   1. Make sure to set the composition version to {products.federation.version("connectors").version}.
   2. Make sure every file you want feedback on is included in the `subgraphs` section.

You can use a different location for your `supergraph.yaml` by setting the `rover.supergraphConfig` option in
`apollo.config.yaml`, like this:

```yaml title="apollo.config.yaml"
rover:
  supergraphConfig: path/to/supergraph.yaml
```

<h2 id="troubleshooting">Troubleshooting</h2>

The most common errors are configuration errors, like a missing `.env` file or incorrect service information in the `apollo.config.json` file. Please see [the Apollo config docs](https://www.apollographql.com/docs/devtools/apollo-config/) for more configuration guidance.

An old version of a published schema may cause other errors. To reload a schema, open the **Command Palette** (`cmd + shift + p` on Mac), search for "Apollo." Choose the **Apollo: Reload Schema** option.

Sometimes, errors will appear as a notification at the bottom of your editor. Other, less critical, messages may be shown in the output pane of the editor. To open the output pane and get diagnostic information about the extension and the current service loaded (if working with a client project), click the Apollo GraphQL icon in the status bar at the bottom.

<img src="https://raw.githubusercontent.com/apollographql/vscode-graphql/main/images/marketplace/stats.gif"  alt="Clicking the status bar icon to open the output pane">

If problems persist or the error messages are unhelpful, open an [issue](https://github.com/apollographql/vscode-graphql/issues) in the `vscode-graphql` repository.

<h3 id="reloading-extension">Reloading the extension</h3>

If you aren't seeing diagnostics, try reloading the extension by running the `Apollo: Reload schema` command from the command palette.

<h3 id="turn-on-autosave">Turn on autosave</h3>

Most diagnostics will only appear when you save your schema file.
If you enable autosave in VS Code, you'll see feedback each time you finish typing.

<h3 id="double-check-rover-version">Double-check your Rover version</h3>

If you aren't seeing diagnostics for Apollo Connectors, run `rover --version` in a terminal to ensure you have version 0.27.0 or later.
You can also specify a path to a specific Rover binary in your `apollo.config.yaml` file:

```yaml title="apollo.config.yaml"
rover:
  bin: /path/to/rover
```

<h3 id="debug-logging">Debug logging</h3>

If the extension isn't working as expected, you can set the apollographql.trace.server setting to verbose in your VS Code settings.
This setting adds detailed logs to the output panel of the extension, which can aid in debugging.

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
