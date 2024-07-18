import { DataSourceConfig } from "apollo-datasource";
import { ApolloLink, execute, GraphQLRequest } from "@apollo/client/link/core";
import { toPromise as makePromise } from "@apollo/client/link/utils";
import { onError } from "@apollo/client/link/error";
import { setContext } from "@apollo/client/link/context";
import { createHttpLink } from "@apollo/client/link/http";
import to from "await-to-js";
import { GraphQLError } from "graphql";
class ApolloError extends Error {
  public extensions?: Record<string, any>;

  constructor(message: string, code?: string) {
    super(message);
    if (code) {
      this.extensions = { code };
    }
    Object.defineProperty(this, "name", { value: "ApolloError" });
  }
}
export class AuthenticationError extends ApolloError {
  constructor(message: string) {
    super(message, "UNAUTHENTICATED");

    Object.defineProperty(this, "name", { value: "AuthenticationError" });
  }
}

export class ForbiddenError extends ApolloError {
  constructor(message: string) {
    super(message, "FORBIDDEN");

    Object.defineProperty(this, "name", { value: "ForbiddenError" });
  }
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}
export class GraphQLDataSource<TContext = any> {
  public baseURL!: string;
  public context!: TContext;

  public initialize(config: DataSourceConfig<TContext>): void {
    this.context = config.context;
  }

  // XXX can we kill the casting here?
  public async execute<T>(
    operation: GraphQLRequest,
  ): Promise<GraphQLResponse<T>> {
    return this.executeSingleOperation(operation) as Promise<
      GraphQLResponse<T>
    >;
  }

  protected willSendRequest?(request: any): any;

  private composeLinks(): ApolloLink {
    const uri = this.resolveUri();

    return ApolloLink.from([
      this.onErrorLink(),
      this.onRequestLink(),
      createHttpLink({ uri }),
    ]);
  }

  private didEncounterError(error: any) {
    const status = error.statusCode ? error.statusCode : null;
    const message = error.bodyText
      ? error.bodyText
      : error.message
      ? error.message
      : null;

    let apolloError: ApolloError;

    switch (status) {
      case 401:
        apolloError = new AuthenticationError(message);
        break;
      case 403:
        apolloError = new ForbiddenError(message);
        break;
      default:
        apolloError = new ApolloError(message);
    }

    throw apolloError;
  }

  private async executeSingleOperation(operation: GraphQLRequest) {
    const link = this.composeLinks();

    const [error, response] = await to(makePromise(execute(link, operation)));

    if (error) {
      this.didEncounterError(error);
    }

    return response;
  }

  private resolveUri(): string {
    const baseURL = this.baseURL;

    if (!baseURL) {
      throw new ApolloError(
        "Cannot make request to GraphQL API, missing baseURL",
      );
    }

    return baseURL;
  }

  private onRequestLink() {
    return setContext((_, request) => {
      if (this.willSendRequest) {
        this.willSendRequest(request);
      }

      return request;
    });
  }

  private onErrorLink() {
    return onError(({ graphQLErrors, networkError, operation }) => {
      const { result, response } = operation.getContext();
      if (graphQLErrors) {
        graphQLErrors.map((graphqlError) =>
          console.error(`[GraphQL error]: ${graphqlError.message}`),
        );
      }

      if (networkError) {
        console.log(`[Network Error]: ${networkError}`);
      }

      if (response && response.status >= 400) {
        console.log(`[Network Error] ${response.bodyText}`);
      }
    });
  }
}
