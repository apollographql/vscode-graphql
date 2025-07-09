import {config} from "dotenv";
config({ override: true });

import prompts from "prompts";
import { copyFile, cp, mkdir, readdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { gql, request } from "graphql-request";
import { faker } from "@faker-js/faker";
import { existsSync, readFileSync } from "fs";
import { dump, load } from "js-yaml";

const userApiKey = process.env.APOLLO_KEY;
const graphosURL = "https://graphql.api.apollographql.com/api/graphql";
const graphosHeaders = {
  "x-api-key": userApiKey,
  "apollographql-client-name": "connectors-community",
  "apollographql-client-version": "1",
};

async function main() {
  if(!userApiKey) throw new Error("No User API key found in .env")
  if (userApiKey && userApiKey.includes("service"))
    throw new Error(
      "You muse use a user API key from https://studio.apollographql.com/user-settings/api-keys"
    );


  let graphId = process.env.APOLLO_KEY?.split(":")[1];
  let graphVariant = process.env.APOLLO_GRAPH_VARIANT;
  let graphApiKey;

  let clonePath = process.argv[2];
  if (!clonePath) {
    const pathPrompt = await prompts({
      type: "text",
      name: "path",
      message: "Where would you like to setup your new connector environment?",
    });

    clonePath = pathPrompt.path.replace(/['"]+/g, "").replace(/[']+/g, "").trim();
  }

  const graphPrompt =
    graphId && graphVariant
      ? { type: 1 }
      : await prompts({
          name: "type",
          type: "select",
          choices: ["new", "existing"],
          message: "Is this for a new or existing graph?",
        });

  let connectorName;
  let folderToClone = ".template";
  const modules = [];
  const prebuild = await prompts({
    type: "confirm",
    name: "use",
    message: "Do you want to use a pre-built connector?",
  });

  if (prebuild.use) {
    const directory = await readdir("connectors", {
      encoding: "utf-8",
    });
    const connectors = directory.filter(
      (item) => !/(^|\/)\.[^\/\.]/g.test(item)
    );
    const prebuiltPrompt = await prompts({
      name: "connector",
      type: "select",
      choices: connectors,
      message: "Which connector would you like to use?",
    });

    if (prebuiltPrompt.connector == undefined)
      throw new Error("User cancelled");

    folderToClone = connectors[prebuiltPrompt.connector];
    connectorName = folderToClone;
    //Prompt for modules
    const connectorDirectory = await readdir(
      resolve("connectors", folderToClone),
      {
        encoding: "utf-8",
      }
    );
    const schemaFiles = connectorDirectory.filter((f) =>
      f.includes(".graphql")
    );
    const choices = schemaFiles.map((s) => s.split(".graphql")[0]);

    if (choices.length === 1) {
      modules.push(schemaFiles[0]);
    }else if (choices.length > 1) {
      const schemaModulesPrompt = await prompts({
        name: "modules",
        type: "multiselect",
        choices,
        message: `What portions of the ${connectorName} connector would you like to use?`,
      });
      schemaModulesPrompt.modules.forEach((i) => modules.push(schemaFiles[i]));
    }
  } else {
    const connectorNamePrompt = await prompts({
      name: "name",
      type: "text",
      message: "What would you like to name your connector?",
    });

    if (!connectorNamePrompt.name) userCancelled();

    connectorName = connectorNamePrompt.name;
  }

  //Get user orgs and have them select if there is more than one
  //We want to filter orgs that don't have any graphs in them yet
  const org = await getUserOrgId(graphPrompt.type == 1);
  const orgId = org.id;
  if(org.graphId) graphId = org.graphId;
  if(org.graphVariant) graphVariant = org.graphVariant;

  //Create graph in GraphOS
  if (graphPrompt.type == 0) {
    //3. Create graph id
    let idIsValid = false;
    let newGraphId;
    while (!idIsValid) {
      newGraphId =
        connectorName +
        "-" +
        faker.string
          .uuid()
          .replace(/[^A-Za-z0-9_]+/g, "-")
          .toLowerCase()
          .substring(0, 6);
      const idValidResults = await request(
        graphosURL,
        gql`
          query CC_IsGraphIdValid($graphId: ID!, $accountId: ID!) {
            account(id: $accountId) {
              graphIDAvailable(id: $graphId)
            }
          }
        `,
        {
          graphId: newGraphId,
          accountId: orgId,
        },
        graphosHeaders
      );

      idIsValid = idValidResults?.account?.graphIDAvailable ?? false;
    }
    //4. Create graph - return API key
    const createGraphResults = await request(
      graphosURL,
      gql`
        mutation CC_CreateGraph(
          $graphType: GraphType!
          $hiddenFromUninvitedNonAdmin: Boolean!
          $createGraphId: ID!
          $title: String!
          $accountId: ID!
        ) {
          account(id: $accountId) {
            createGraph(
              graphType: $graphType
              hiddenFromUninvitedNonAdmin: $hiddenFromUninvitedNonAdmin
              id: $createGraphId
              title: $title
            ) {
              ... on Service {
                id
                apiKeys {
                  token
                }
              }
              ...on GraphCreationError {
                message
              }
            }
          }
        }
      `,
      {
        graphType: "SELF_HOSTED_SUPERGRAPH",
        hiddenFromUninvitedNonAdmin: false,
        createGraphId: newGraphId,
        title: connectorName,
        accountId: orgId,
      },
      graphosHeaders
    );

    if(createGraphResults.account.message){
      throw new Error(`Unable to create graph in GraphOS: ${createGraphResults.account.message}`)
    }

    graphId = createGraphResults.account.createGraph.id;
    graphVariant = "dev";
    graphApiKey = createGraphResults.account.createGraph.apiKeys[0].token;

    let sdl= await readFile(
      resolve("connectors", ".template", "connector.graphql"),
      { encoding: "utf-8" }
    );

    const publishSchemaDoc = gql`
      mutation CC_PublishSubgraphSchema(
        $graphId: ID!
        $variantName: String!
        $subgraphName: String!
        $schemaDocument: PartialSchemaInput!
        $url: String
        $revision: String!
      ) {
        graph(id: $graphId) {
          publishSubgraph(
            graphVariant: $variantName
            activePartialSchema: $schemaDocument
            name: $subgraphName
            url: $url
            revision: $revision
          ) {
            launchUrl
            updatedGateway
            wasCreated
          }
        }
      }
    `;
    const variables = {
      graphId: graphId,
      variantName: graphVariant,
      subgraphName: connectorName,
      schemaDocument: {
        sdl
      },
      url: `http://${connectorName}`,
      revision: "initial",
    };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    
    if(prebuild.use){
      // need to publish modules
      for(var i = 0; i<modules.length;i++){
        const module = modules[i];
        const moduleName = module.split(".")[0];

        variables.url = `http://${connectorName}`;
        variables.subgraphName = moduleName
        variables.schemaDocument.sdl = await readFile(
          resolve("connectors", folderToClone, module),
          { encoding: "utf-8" }
        );

        await request(
          graphosURL,
          publishSchemaDoc,
          variables,
          graphosHeaders
        );
        await sleep(1000);
      }
    } else {
      await request(
        graphosURL,
        publishSchemaDoc,
        variables,
        graphosHeaders
      );
    }

    await sleep(1000);
    await request(
      graphosURL,
      gql`
        mutation CC_ChangeBuildPipeline(
          $graphId: ID!
          $variantName: String!
          $fedVersion: BuildPipelineTrack!
        ) {
          graph(id: $graphId) {
            variant(name: $variantName) {
              buildConfig(version: $fedVersion) {
                id
              }
            }
          }
        }
      `,
      {
        graphId: graphId,
        variantName: graphVariant,
        fedVersion: "FED_NEXT",
      },
      graphosHeaders
    );
  }
  //Use graph in GraphOS
  else if (graphPrompt.type == 1) {
    const newApiKeyResults = await request(
      graphosURL,
      gql`
        mutation CC_CreateGraphKey($graphId: ID!, $keyName: String) {
          graph(id: $graphId) {
            newKey(keyName: $keyName) {
              token
            }
          }
        }
      `,
      {
        graphId,
        keyName: `connectors-community-${faker.string
          .uuid()
          .replace(/[^A-Za-z0-9_]+/g, "-")
          .toLowerCase()
          .substring(0, 6)}`,
      },
      graphosHeaders
    );
    graphApiKey = newApiKeyResults.graph.newKey.token;
  }

  if (!graphId || !graphVariant)
    throw new Error("You muse use a graph ref from GraphOS to use connectors");

  if (!existsSync(clonePath)) await mkdir(clonePath);

  if (modules.length > 0) {
    await copyFile(
      resolve("connectors", folderToClone, "router.yaml"),
      resolve(clonePath, "router.yaml")
    );
    let supergraph = load(
      readFileSync(resolve("connectors", folderToClone, "supergraph.yaml"))
    );
    supergraph.subgraphs = {};
    modules.forEach(async (module) => {
      const moduleName = module.split(".")[0];
      supergraph.subgraphs[`${connectorName}-${moduleName}`] = {
        routing_url: `http:${moduleName}`,
        schema: {
          file: module,
        },
      };
      await copyFile(
        resolve("connectors", folderToClone, module),
        resolve(clonePath, module)
      );
    });
    await writeFile(resolve(clonePath, "supergraph.yaml"), dump(supergraph), {
      encoding: "utf-8",
    });
  } else {
    //Only one module so we can clone the folder
    await cp(resolve("connectors", folderToClone), clonePath, {
      recursive: true,
    });
  }

  await mkdir(resolve(clonePath, ".vscode"));
  await cp(".vscode", resolve(clonePath, ".vscode"), {
    recursive: true,
  });
  await copyFile(
    "apollo.config.json",
    resolve(clonePath, "apollo.config.json")
  );

  await writeFile(
    resolve(clonePath, ".env"),
    `APOLLO_KEY=${graphApiKey}\nAPOLLO_GRAPH_REF=${graphId}@${graphVariant}`,
    { encoding: "utf-8" }
  );
  await writeFile(
    resolve(clonePath, ".vscode", "settings.json"),
    `{
  "terminal.integrated.profiles.osx": {
    "graphos": {
      "path": "zsh",
      "args": ["-l"],
      "env": { 
        "APOLLO_KEY": "${graphApiKey}",
        "APOLLO_GRAPH_REF": "${graphId}@${graphVariant}",
        "APOLLO_ROVER_DEV_ROUTER_VERSION": "2.0.0",
      }
    }
  },
  "terminal.integrated.defaultProfile.osx": "graphos"
}`
  );

  console.log(
    `Project ready 🚀\! To open in VS Code, run: \n\ncode ${clonePath}`
  );
}

main();

function userCancelled() {
  throw new Error("User cancelled");
}

async function getUserOrgId(promptForGraph = false) {
  //Get user orgs and have them select if there is more than one
  const orgResults = await request(
    graphosURL,
    gql`
      query CC_UserMemberships {
        me {
          id
          ... on User {
            memberships {
              account {
                id
                graphs {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `,
    {},
    graphosHeaders
  );
  let graphId;
  let graphVariant;
  let orgId = orgResults.me.memberships[0].account.id;
  if (orgResults.me.memberships.length > 1 && orgId) {
    let membershipChoices = orgResults.me.memberships;
    if (promptForGraph)
      membershipChoices = membershipChoices.filter(
        (m) => m.account.graphs.length > 0
      );
    const orgPrompt = await prompts({
      name: "org",
      type: "select",
      choices: membershipChoices.map((m) => m.account.id),
      message: promptForGraph ? "Which org would you like to use? (filtered to orgs that havecd  graphs in them)" : "Which org would you like to use?",
    });
    if (typeof orgPrompt.org === 'number')
      orgId = membershipChoices[orgPrompt.org].account.id;
    else userCancelled();

    if(promptForGraph){
      const graphs = membershipChoices[orgPrompt.org].account.graphs;
      const graphPrompt = await prompts({
        name: "graph",
        type: "select",
        choices: graphs.map((m) => m.name),
        message: "Which graph would you like to use?",
      });

      graphId = graphs[graphPrompt.graph].id;

      const variantResults = await request(
        graphosURL,
        gql`
          query CC_GetGraphVariants($graphId: ID!) {
            graph(id: $graphId) {
              variants {
                name
              }
            }
          }
        `,
        { graphId },
        graphosHeaders
      );

      const variants = variantResults.graph.variants;
      if (variants.length == 1) {
        graphVariant = variants[0].name;
      } else {
        const variantPrompt = await prompts({
          name: "variant",
          type: "select",
          choices: variants.map((m) => m.name),
          message: "Which variant would you like to use?",
        });
        graphVariant = variants[variantPrompt.variant].name;
      }
    }
  }
  
  return { id: orgId, graphId, graphVariant };
}

async function updateFedVersion(graphId, graphVariant) {
  await request(
    graphosURL,
    gql`
      mutation CC_PublishSubgraphSchema(
        $graphId: ID!
        $variantName: String!
        $fedVersion: BuildPipelineTrack!
      ) {
        graph(id: $graphId) {
          variant(name: $variantName) {
            buildConfig(version: $fedVersion) {
              id
            }
          }
        }
      }
    `,
    {
      graphId: graphId,
      variantName: graphVariant,
      fedVersion: "FED_NEXT",
    },
    graphosHeaders
  );
}