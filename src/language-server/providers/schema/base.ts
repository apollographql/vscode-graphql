import { GraphQLSchema } from "graphql";
import { NotificationHandler } from "vscode-languageserver";

export interface SchemaResolveConfig {
  tag?: string;
  force?: boolean;
}
export type SchemaChangeUnsubscribeHandler = () => void;
export interface GraphQLSchemaProvider {
  resolveSchema(config?: SchemaResolveConfig): Promise<GraphQLSchema>;
  onSchemaChange(
    handler: NotificationHandler<GraphQLSchema>,
  ): SchemaChangeUnsubscribeHandler;
  resolveFederatedServiceSDL(): Promise<string | void>;
}
