import gql from "graphql-tag";

let lorem = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas at velit orci. Nullam et gravida purus, eget commodo sapien. Donec erat sem, egestas at consectetur in, vestibulum non arcu. Aliquam laoreet, sapien vitae auctor efficitur, metus leo lobortis tellus, eu efficitur ante purus et nisl. In vestibulum sapien vitae finibus mattis.
`;
gql`
  """
  The query type, represents all of the entry points into our object graph
  """
  type Query {
    me: User!
  }

  """
  Test
  """
  type User {
    id: ID!
    name: String!
  }
`;
lorem += `
Praesent suscipit ut sapien ut pellentesque. Curabitur lacinia eget felis et accumsan. Sed condimentum fermentum tellus, vel facilisis risus scelerisque egestas.
`;
gql``;
lorem += `
Pellentesque egestas ante sed eleifend egestas. Nullam sit amet neque tempus ligula tempus porta. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nibh lacus, fermentum nec velit et, condimentum efficitur orci. Donec faucibus nunc ex, at posuere mauris feugiat eu. Pellentesque convallis ornare lacus sit amet efficitur.
`;
gql`
  type User {
    lastName: String!
  }
`;
lorem += `
Integer rhoncus leo eros, at facilisis est finibus ac. Fusce semper purus eget orci blandit, non fringilla justo vestibulum. Ut et semper velit. Aenean sit amet pharetra ex, sed sollicitudin justo. Sed sed dui felis. Quisque pretium risus eu interdum pellentesque. Pellentesque in vestibulum massa. Duis aliquam, augue id mattis tempor, mauris leo gravida dui, a dignissim justo tortor vel ligula. Donec quis aliquet sapien, congue iaculis arcu. Maecenas vel congue urna, at pellentesque ex.
`;
gql`
  query {
    name
  }
`;

lorem += `
Nunc vitae urna magna. Fusce porttitor nibh consequat risus pharetra mattis. Ut finibus eleifend erat id porta. In eu tellus posuere elit rutrum mollis non ac lectus. Nullam est nisl, hendrerit in hendrerit consectetur, fringilla et ligula. Integer ullamcorper nunc sem, ullamcorper dapibus ante semper nec. Nulla scelerisque ut mauris ut egestas.
`;
//prettier-ignore
const veryLongVariableName = gql`type Foo { baaaaaar: String }`;
lorem += `
Vestibulum arcu felis, sollicitudin eu massa et, vulputate mollis velit. Nulla condimentum quam ut justo sodales rhoncus. Sed posuere sem eget nunc tempor blandit. Vestibulum in ante eget elit eleifend porta. Curabitur lobortis nisi nec augue dapibus feugiat. Duis pharetra a mauris vitae auctor.
`;

`#
foo
`;

lorem += `
Aliquam erat volutpat. Sed consequat nisi vel tincidunt vulputate. Proin condimentum, urna sit amet tincidunt elementum, ipsum odio tincidunt nisl, nec euismod neque turpis id massa. Mauris ultrices volutpat quam, at fringilla ante sodales vel. Suspendisse vitae rutrum mauris, ac auctor erat. Sed efficitur nulla quis risus consequat consequat.
`;

foo(/*gql*/ `query {
  foo
  bar
}
`);
lorem += `
Pellentesque tempus ante velit, vitae rutrum mi vehicula ac. Cras quis fringilla risus, eu hendrerit nisl. In hac habitasse platea dictumst. Etiam et nulla nisl. Phasellus eu finibus mi. Cras tempor bibendum tortor at interdum.
`;
gql<"Vehicle">`
  fragment VehicleMake on Vehicle {
    name
  }
`;

lorem += `
Donec nisl dolor, elementum faucibus lacus et, tempor euismod libero. Sed nibh nulla, sollicitudin facilisis sem sed, mattis porta turpis.
`;
gql<"Vehicle">(`
  fragment VehicleMake on Vehicle {
    name
  }
`);
lorem += `
Vivamus aliquam quis diam non mattis. Proin eget ligula fermentum, tincidunt lorem ut, ultrices turpis. Donec fringilla feugiat dictum.
`;
const query = /* GraphQL */ `
  {
    foo
  }
`;
lorem += `
Vestibulum cursus mi sed tellus pellentesque, in rutrum elit egestas. Integer viverra eget ipsum ut consequat. Sed mattis feugiat arcu sit amet pellentesque.
`;
gql(`
        {
          hero {
            ...Hero_character
          }
        }

        ${Hero.fragments.character}

        {
          reviews(episode: NEWHOPE) {
            ...ReviewList_reviews
          }
        }

      ${ReviewList.fragments.reviews}
    `);
