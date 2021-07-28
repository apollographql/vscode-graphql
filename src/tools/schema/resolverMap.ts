import { GraphQLFieldResolver } from "graphql";

export interface GraphQLResolverMap<TContext> {
  [typeName: string]: {
    [fieldName: string]:
      | GraphQLFieldResolver<unknown, TContext>
      | {
          requires?: string;
          resolve: GraphQLFieldResolver<unknown, TContext>;
          subscribe?: undefined;
        }
      | {
          requires?: string;
          resolve?: undefined;
          subscribe: GraphQLFieldResolver<unknown, TContext>;
        }
      | {
          requires?: string;
          resolve: GraphQLFieldResolver<unknown, TContext>;
          subscribe: GraphQLFieldResolver<unknown, TContext>;
        };
  };
}
