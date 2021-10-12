import { IntrospectionQuery } from "graphql";

export const starwarsSchema: IntrospectionQuery = {
  __schema: {
    queryType: {
      name: "Query",
      kind: "OBJECT",
    },
    mutationType: {
      name: "Mutation",
      kind: "OBJECT",
    },
    subscriptionType: null,
    types: [
      {
        kind: "OBJECT",
        name: "Query",
        description:
          "The query type, represents all of the entry points into our object graph",
        fields: [
          {
            name: "hero",
            description: "",
            args: [
              {
                name: "episode",
                description: "",
                type: {
                  kind: "ENUM",
                  name: "Episode",
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "INTERFACE",
              name: "Character",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "reviews",
            description: "",
            args: [
              {
                name: "episode",
                description: "",
                type: {
                  kind: "NON_NULL",
                  ofType: {
                    kind: "ENUM",
                    name: "Episode",
                  },
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "LIST",
              ofType: {
                kind: "OBJECT",
                name: "Review",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "search",
            description: "",
            args: [
              {
                name: "text",
                description: "",
                type: {
                  kind: "SCALAR",
                  name: "String",
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "LIST",
              ofType: {
                kind: "UNION",
                name: "SearchResult",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "character",
            description: "",
            args: [
              {
                name: "id",
                description: "",
                type: {
                  kind: "NON_NULL",
                  ofType: {
                    kind: "SCALAR",
                    name: "ID",
                  },
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "INTERFACE",
              name: "Character",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "droid",
            description: "",
            args: [
              {
                name: "id",
                description: "",
                type: {
                  kind: "NON_NULL",
                  ofType: {
                    kind: "SCALAR",
                    name: "ID",
                  },
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "OBJECT",
              name: "Droid",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "human",
            description: "",
            args: [
              {
                name: "id",
                description: "",
                type: {
                  kind: "NON_NULL",
                  ofType: {
                    kind: "SCALAR",
                    name: "ID",
                  },
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "OBJECT",
              name: "Human",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "starship",
            description: "",
            args: [
              {
                name: "id",
                description: "",
                type: {
                  kind: "NON_NULL",
                  ofType: {
                    kind: "SCALAR",
                    name: "ID",
                  },
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "OBJECT",
              name: "Starship",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "ENUM",
        name: "Episode",
        description: "The episodes in the Star Wars trilogy",
        enumValues: [
          {
            name: "NEWHOPE",
            description: "Star Wars Episode IV: A New Hope, released in 1977.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "EMPIRE",
            description:
              "Star Wars Episode V: The Empire Strikes Back, released in 1980.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "JEDI",
            description:
              "Star Wars Episode VI: Return of the Jedi, released in 1983.",
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
      },
      {
        kind: "INTERFACE",
        name: "Character",
        description: "A character from the Star Wars universe",
        fields: [
          {
            name: "id",
            description: "The ID of the character",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "ID",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "name",
            description: "The name of the character",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "friends",
            description:
              "The friends of the character, or an empty list if they have none",
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "INTERFACE",
                name: "Character",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "friendsConnection",
            description:
              "The friends of the character exposed as a connection with edges",
            args: [
              {
                name: "first",
                description: "",
                type: {
                  kind: "SCALAR",
                  name: "Int",
                },
                defaultValue: null,
              },
              {
                name: "after",
                description: "",
                type: {
                  kind: "SCALAR",
                  name: "ID",
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "OBJECT",
                name: "FriendsConnection",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "appearsIn",
            description: "The movies this character appears in",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "ENUM",
                  name: "Episode",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        possibleTypes: [
          {
            kind: "OBJECT",
            name: "Human",
          },
          {
            kind: "OBJECT",
            name: "Droid",
          },
        ],
        interfaces: [],
      },
      {
        kind: "SCALAR",
        name: "ID",
        description:
          'The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID.',
      },
      {
        kind: "SCALAR",
        name: "String",
        description:
          "The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.",
      },
      {
        kind: "SCALAR",
        name: "Int",
        description:
          "The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1. ",
      },
      {
        kind: "OBJECT",
        name: "FriendsConnection",
        description: "A connection object for a character's friends",
        fields: [
          {
            name: "totalCount",
            description: "The total number of friends",
            args: [],
            type: {
              kind: "SCALAR",
              name: "Int",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "edges",
            description: "The edges for each of the character's friends.",
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "OBJECT",
                name: "FriendsEdge",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "friends",
            description:
              "A list of the friends, as a convenience when edges are not needed.",
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "INTERFACE",
                name: "Character",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "pageInfo",
            description: "Information for paginating this connection",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "OBJECT",
                name: "PageInfo",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "OBJECT",
        name: "FriendsEdge",
        description: "An edge object for a character's friends",
        fields: [
          {
            name: "cursor",
            description: "A cursor used for pagination",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "ID",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "node",
            description: "The character represented by this friendship edge",
            args: [],
            type: {
              kind: "INTERFACE",
              name: "Character",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "OBJECT",
        name: "PageInfo",
        description: "Information for paginating this connection",
        fields: [
          {
            name: "startCursor",
            description: "",
            args: [],
            type: {
              kind: "SCALAR",
              name: "ID",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "endCursor",
            description: "",
            args: [],
            type: {
              kind: "SCALAR",
              name: "ID",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "hasNextPage",
            description: "",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "SCALAR",
        name: "Boolean",
        description: "The `Boolean` scalar type represents `true` or `false`.",
      },
      {
        kind: "OBJECT",
        name: "Review",
        description: "Represents a review for a movie",
        fields: [
          {
            name: "stars",
            description: "The number of stars this review gave, 1-5",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Int",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "commentary",
            description: "Comment about the movie",
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "UNION",
        name: "SearchResult",
        description: "",
        possibleTypes: [
          {
            kind: "OBJECT",
            name: "Human",
          },
          {
            kind: "OBJECT",
            name: "Droid",
          },
          {
            kind: "OBJECT",
            name: "Starship",
          },
        ],
      },
      {
        kind: "OBJECT",
        name: "Human",
        description: "A humanoid creature from the Star Wars universe",
        fields: [
          {
            name: "id",
            description: "The ID of the human",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "ID",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "name",
            description: "What this human calls themselves",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "homePlanet",
            description: "The home planet of the human, or null if unknown",
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "height",
            description: "Height in the preferred unit, default is meters",
            args: [
              {
                name: "unit",
                description: "",
                type: {
                  kind: "ENUM",
                  name: "LengthUnit",
                },
                defaultValue: "METER",
              },
            ],
            type: {
              kind: "SCALAR",
              name: "Float",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "mass",
            description: "Mass in kilograms, or null if unknown",
            args: [],
            type: {
              kind: "SCALAR",
              name: "Float",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "friends",
            description:
              "This human's friends, or an empty list if they have none",
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "INTERFACE",
                name: "Character",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "friendsConnection",
            description:
              "The friends of the human exposed as a connection with edges",
            args: [
              {
                name: "first",
                description: "",
                type: {
                  kind: "SCALAR",
                  name: "Int",
                },
                defaultValue: null,
              },
              {
                name: "after",
                description: "",
                type: {
                  kind: "SCALAR",
                  name: "ID",
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "OBJECT",
                name: "FriendsConnection",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "appearsIn",
            description: "The movies this human appears in",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "ENUM",
                  name: "Episode",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "starships",
            description:
              "A list of starships this person has piloted, or an empty list if none",
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "OBJECT",
                name: "Starship",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [
          {
            kind: "INTERFACE",
            name: "Character",
          },
        ],
      },
      {
        kind: "ENUM",
        name: "LengthUnit",
        description: "Units of height",
        enumValues: [
          {
            name: "METER",
            description: "The standard unit around the world",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "FOOT",
            description: "Primarily used in the United States",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "CUBIT",
            description: "Ancient unit used during the Middle Ages",
            isDeprecated: true,
            deprecationReason: "Test deprecated enum case",
          },
        ],
      },
      {
        kind: "SCALAR",
        name: "Float",
        description:
          "The `Float` scalar type represents signed double-precision fractional values as specified by [IEEE 754](http://en.wikipedia.org/wiki/IEEE_floating_point). ",
      },
      {
        kind: "OBJECT",
        name: "Starship",
        description: "",
        fields: [
          {
            name: "id",
            description: "The ID of the starship",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "ID",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "name",
            description: "The name of the starship",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "length",
            description: "Length of the starship, along the longest axis",
            args: [
              {
                name: "unit",
                description: "",
                type: {
                  kind: "ENUM",
                  name: "LengthUnit",
                },
                defaultValue: "METER",
              },
            ],
            type: {
              kind: "SCALAR",
              name: "Float",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "coordinates",
            description: "",
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "LIST",
                  name: null,
                  ofType: {
                    kind: "NON_NULL",
                    name: null,
                    ofType: {
                      kind: "SCALAR",
                      name: "Float",
                      ofType: null,
                    },
                  },
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "OBJECT",
        name: "Droid",
        description:
          "An autonomous mechanical character in the Star Wars universe",
        fields: [
          {
            name: "id",
            description: "The ID of the droid",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "ID",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "name",
            description: "What others call this droid",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "friends",
            description:
              "This droid's friends, or an empty list if they have none",
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "INTERFACE",
                name: "Character",
                ofType: null,
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "friendsConnection",
            description:
              "The friends of the droid exposed as a connection with edges",
            args: [
              {
                name: "first",
                description: "",
                type: {
                  kind: "SCALAR",
                  name: "Int",
                },
                defaultValue: null,
              },
              {
                name: "after",
                description: "",
                type: {
                  kind: "SCALAR",
                  name: "ID",
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "OBJECT",
                name: "FriendsConnection",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "appearsIn",
            description: "The movies this droid appears in",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "ENUM",
                  name: "Episode",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "primaryFunction",
            description: "This droid's primary function",
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [
          {
            kind: "INTERFACE",
            name: "Character",
          },
        ],
      },
      {
        kind: "OBJECT",
        name: "Mutation",
        description:
          "The mutation type, represents all updates we can make to our data",
        fields: [
          {
            name: "createReview",
            description: "",
            args: [
              {
                name: "episode",
                description: "",
                type: {
                  kind: "ENUM",
                  name: "Episode",
                },
                defaultValue: null,
              },
              {
                name: "review",
                description: "",
                type: {
                  kind: "NON_NULL",
                  ofType: {
                    kind: "INPUT_OBJECT",
                    name: "ReviewInput",
                  },
                },
                defaultValue: null,
              },
            ],
            type: {
              kind: "OBJECT",
              name: "Review",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "INPUT_OBJECT",
        name: "ReviewInput",
        description:
          "The input object sent when someone is creating a new review",
        inputFields: [
          {
            name: "stars",
            description: "0-5 stars",
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Int",
              },
            },
            defaultValue: null,
          },
          {
            name: "commentary",
            description: "Comment about the movie, optional",
            type: {
              kind: "SCALAR",
              name: "String",
            },
            defaultValue: null,
          },
          {
            name: "favorite_color",
            description: "Favorite color, optional",
            type: {
              kind: "INPUT_OBJECT",
              name: "ColorInput",
            },
            defaultValue: null,
          },
        ],
      },
      {
        kind: "INPUT_OBJECT",
        name: "ColorInput",
        description: "The input object sent when passing in a color",
        inputFields: [
          {
            name: "red",
            description: "",
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Int",
              },
            },
            defaultValue: null,
          },
          {
            name: "green",
            description: "",
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Int",
              },
            },
            defaultValue: null,
          },
          {
            name: "blue",
            description: "",
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Int",
              },
            },
            defaultValue: null,
          },
        ],
      },
      {
        kind: "OBJECT",
        name: "__Schema",
        description:
          "A GraphQL Schema defines the capabilities of a GraphQL server. It exposes all available types and directives on the server, as well as the entry points for query, mutation, and subscription operations.",
        fields: [
          {
            name: "types",
            description: "A list of all types supported by this server.",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "NON_NULL",
                  name: null,
                  ofType: {
                    kind: "OBJECT",
                    name: "__Type",
                    ofType: null,
                  },
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "queryType",
            description: "The type that query operations will be rooted at.",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "OBJECT",
                name: "__Type",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "mutationType",
            description:
              "If this server supports mutation, the type that mutation operations will be rooted at.",
            args: [],
            type: {
              kind: "OBJECT",
              name: "__Type",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "subscriptionType",
            description:
              "If this server support subscription, the type that subscription operations will be rooted at.",
            args: [],
            type: {
              kind: "OBJECT",
              name: "__Type",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "directives",
            description: "A list of all directives supported by this server.",
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "NON_NULL",
                  name: null,
                  ofType: {
                    kind: "OBJECT",
                    name: "__Directive",
                    ofType: null,
                  },
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "OBJECT",
        name: "__Type",
        description:
          "The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.\n\nDepending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name and description, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.",
        fields: [
          {
            name: "kind",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "ENUM",
                name: "__TypeKind",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "name",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "description",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "fields",
            description: null,
            args: [
              {
                name: "includeDeprecated",
                description: null,
                type: {
                  kind: "SCALAR",
                  name: "Boolean",
                },
                defaultValue: "false",
              },
            ],
            type: {
              kind: "LIST",
              ofType: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "__Field",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "interfaces",
            description: null,
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "__Type",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "possibleTypes",
            description: null,
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "__Type",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "enumValues",
            description: null,
            args: [
              {
                name: "includeDeprecated",
                description: null,
                type: {
                  kind: "SCALAR",
                  name: "Boolean",
                },
                defaultValue: "false",
              },
            ],
            type: {
              kind: "LIST",
              ofType: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "__EnumValue",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "inputFields",
            description: null,
            args: [],
            type: {
              kind: "LIST",
              ofType: {
                kind: "NON_NULL",
                name: null,
                ofType: {
                  kind: "OBJECT",
                  name: "__InputValue",
                  ofType: null,
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "ofType",
            description: null,
            args: [],
            type: {
              kind: "OBJECT",
              name: "__Type",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "ENUM",
        name: "__TypeKind",
        description:
          "An enum describing what kind of type a given `__Type` is.",
        enumValues: [
          {
            name: "SCALAR",
            description: "Indicates this type is a scalar.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "OBJECT",
            description:
              "Indicates this type is an object. `fields` and `interfaces` are valid fields.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "INTERFACE",
            description:
              "Indicates this type is an interface. `fields` and `possibleTypes` are valid fields.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "UNION",
            description:
              "Indicates this type is a union. `possibleTypes` is a valid field.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "ENUM",
            description:
              "Indicates this type is an enum. `enumValues` is a valid field.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "INPUT_OBJECT",
            description:
              "Indicates this type is an input object. `inputFields` is a valid field.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "LIST",
            description:
              "Indicates this type is a list. `ofType` is a valid field.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "NON_NULL",
            description:
              "Indicates this type is a non-null. `ofType` is a valid field.",
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
      },
      {
        kind: "OBJECT",
        name: "__Field",
        description:
          "Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type.",
        fields: [
          {
            name: "name",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "description",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "args",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "NON_NULL",
                  name: null,
                  ofType: {
                    kind: "OBJECT",
                    name: "__InputValue",
                    ofType: null,
                  },
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "type",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "OBJECT",
                name: "__Type",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "isDeprecated",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "deprecationReason",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "OBJECT",
        name: "__InputValue",
        description:
          "Arguments provided to Fields or Directives and the input fields of an InputObject are represented as Input Values which describe their type and optionally a default value.",
        fields: [
          {
            name: "name",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "description",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "type",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "OBJECT",
                name: "__Type",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "defaultValue",
            description:
              "A GraphQL-formatted string representing the default value for this input value.",
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "OBJECT",
        name: "__EnumValue",
        description:
          "One possible value for a given Enum. Enum values are unique values, not a placeholder for a string or numeric value. However an Enum value is returned in a JSON response as a string.",
        fields: [
          {
            name: "name",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "description",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "isDeprecated",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "deprecationReason",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
        interfaces: [],
      },
      {
        kind: "OBJECT",
        name: "__Directive",
        description:
          "A Directive provides a way to describe alternate runtime execution and type validation behavior in a GraphQL document.\n\nIn some cases, you need to provide options to alter GraphQL's execution behavior in ways field arguments will not suffice, such as conditionally including or skipping a field. Directives provide this by describing additional information to the executor.",
        fields: [
          {
            name: "name",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "String",
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "description",
            description: null,
            args: [],
            type: {
              kind: "SCALAR",
              name: "String",
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "locations",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "NON_NULL",
                  name: null,
                  ofType: {
                    kind: "ENUM",
                    name: "__DirectiveLocation",
                    ofType: null,
                  },
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "args",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "LIST",
                ofType: {
                  kind: "NON_NULL",
                  name: null,
                  ofType: {
                    kind: "OBJECT",
                    name: "__InputValue",
                    ofType: null,
                  },
                },
              },
            },
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "onOperation",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            isDeprecated: true,
            deprecationReason: "Use `locations`.",
          },
          {
            name: "onFragment",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            isDeprecated: true,
            deprecationReason: "Use `locations`.",
          },
          {
            name: "onField",
            description: null,
            args: [],
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            isDeprecated: true,
            deprecationReason: "Use `locations`.",
          },
        ],
        interfaces: [],
      },
      {
        kind: "ENUM",
        name: "__DirectiveLocation",
        description:
          "A Directive can be adjacent to many parts of the GraphQL language, a __DirectiveLocation describes one such possible adjacencies.",
        enumValues: [
          {
            name: "QUERY",
            description: "Location adjacent to a query operation.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "MUTATION",
            description: "Location adjacent to a mutation operation.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "SUBSCRIPTION",
            description: "Location adjacent to a subscription operation.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "FIELD",
            description: "Location adjacent to a field.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "FRAGMENT_DEFINITION",
            description: "Location adjacent to a fragment definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "FRAGMENT_SPREAD",
            description: "Location adjacent to a fragment spread.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "INLINE_FRAGMENT",
            description: "Location adjacent to an inline fragment.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "SCHEMA",
            description: "Location adjacent to a schema definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "SCALAR",
            description: "Location adjacent to a scalar definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "OBJECT",
            description: "Location adjacent to an object type definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "FIELD_DEFINITION",
            description: "Location adjacent to a field definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "ARGUMENT_DEFINITION",
            description: "Location adjacent to an argument definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "INTERFACE",
            description: "Location adjacent to an interface definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "UNION",
            description: "Location adjacent to a union definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "ENUM",
            description: "Location adjacent to an enum definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "ENUM_VALUE",
            description: "Location adjacent to an enum value definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "INPUT_OBJECT",
            description:
              "Location adjacent to an input object type definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
          {
            name: "INPUT_FIELD_DEFINITION",
            description:
              "Location adjacent to an input object field definition.",
            isDeprecated: false,
            deprecationReason: null,
          },
        ],
      },
    ],
    directives: [
      {
        name: "skip",
        description:
          "Directs the executor to skip this field or fragment when the `if` argument is true.",
        locations: ["FIELD", "FRAGMENT_SPREAD", "INLINE_FRAGMENT"],
        args: [
          {
            name: "if",
            description: "Skipped when true.",
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            defaultValue: null,
          },
        ],
      },
      {
        name: "include",
        description:
          "Directs the executor to include this field or fragment only when the `if` argument is true.",
        locations: ["FIELD", "FRAGMENT_SPREAD", "INLINE_FRAGMENT"],
        args: [
          {
            name: "if",
            description: "Included when true.",
            type: {
              kind: "NON_NULL",
              ofType: {
                kind: "SCALAR",
                name: "Boolean",
              },
            },
            defaultValue: null,
          },
        ],
      },
      {
        name: "deprecated",
        description:
          "Marks an element of a GraphQL schema as no longer supported.",
        locations: ["FIELD_DEFINITION", "ENUM_VALUE"],
        args: [
          {
            name: "reason",
            description:
              "Explains why this element was deprecated, usually also including a suggestion for how to access supported similar data. Formatted in [Markdown](https://daringfireball.net/projects/markdown/).",
            type: {
              kind: "SCALAR",
              name: "String",
            },
            defaultValue: '"No longer supported"',
          },
        ],
      },
    ],
  },
};
