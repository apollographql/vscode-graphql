declare function gql<A = any, B = any>(arg: string): void;
declare type SomeResult = any;
declare type SomeVariables = any;

// prettier-ignore
gql(`query { test }`)

// prettier-ignore
gql<SomeResult, SomeVariables>(`query { test }`)

// prettier-ignore
gql<{
  test: string;
},{
  test: string;
}>(`query { test }`)

// prettier-ignore
gql(
`query { test }`
)

// prettier-ignore
gql
(
  `query { test }`
  )

// prettier-ignore
gql  (  `query { test }` )

gql(`
  query {
    test
  }
`);

gql<SomeResult, SomeVariables>(`
  query {
    test
  }
`);

gql<
  {
    test: string;
  },
  {
    test: string;
  }
>(`
  query {
    test
  }
`);

// prettier-ignore
gql(
`
  query {
    test
  }
`
);

// prettier-ignore
gql (  `
  query {
    test
  }
` );

export {};
