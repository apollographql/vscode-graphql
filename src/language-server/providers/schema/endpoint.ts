// IntrospectionSchemaProvider (http => IntrospectionResult => schema)
import { NotificationHandler } from "vscode-languageserver/node";

import { execute as linkExecute } from "@apollo/client/link/core";
import { toPromise } from "@apollo/client/link/utils";
import { createHttpLink, HttpOptions } from "@apollo/client/link/http";
import {
  GraphQLSchema,
  buildClientSchema,
  getIntrospectionQuery,
  ExecutionResult,
  IntrospectionQuery,
  parse,
} from "graphql";
import { Agent as HTTPSAgent } from "https";
import { RemoteServiceConfig } from "../../config";
import { GraphQLSchemaProvider, SchemaChangeUnsubscribeHandler } from "./base";
import { Debug } from "../../utilities";
import { isString } from "util";
import { Agent } from "undici";
export class EndpointSchemaProvider implements GraphQLSchemaProvider {
  private schema?: GraphQLSchema;
  private federatedServiceSDL?: string;

  constructor(private config: Exclude<RemoteServiceConfig, "name">) {}
  async resolveSchema() {
    if (this.schema) return this.schema;
    const { skipSSLValidation, url, headers } = this.config;
    const options: HttpOptions = {
      uri: url,
    };

    if (url.startsWith("https:") && skipSSLValidation) {
      options.fetchOptions = {
        // see https://github.com/nodejs/undici/issues/1489#issuecomment-1543856261
        dispatcher: new Agent({
          connect: {
            rejectUnauthorized: false,
          },
        }),
      } satisfies import("undici").RequestInit;
    }

    const { data, errors } = (await toPromise(
      linkExecute(createHttpLink(options), {
        query: parse(getIntrospectionQuery()),
        context: { headers },
      }),
    ).catch((e) => {
      // html response from introspection
      if (isString(e.message) && e.message.includes("token <")) {
        throw new Error(
          "Apollo tried to introspect a running GraphQL service at " +
            url +
            "\nIt expected a JSON schema introspection result, but got an HTML response instead." +
            "\nYou may need to add headers to your request or adjust your endpoint url.\n" +
            "-----------------------------\n" +
            "For more information, please refer to: https://go.apollo.dev/t/config \n\n" +
            "The following error occurred:\n-----------------------------\n" +
            e.message,
        );
      }

      // 404 with a non-default url
      if (isString(e.message) && e.message.includes("ECONNREFUSED")) {
        throw new Error(
          "Failed to connect to a running GraphQL endpoint at " +
            url +
            "\nThis may be because you didn't start your service or the endpoint URL is incorrect.",
        );
      }
      throw new Error(e);
    })) as ExecutionResult<IntrospectionQuery>;

    if (errors && errors.length) {
      // XXX better error handling of GraphQL errors
      throw new Error(errors.map(({ message }: Error) => message).join("\n"));
    }

    if (!data) {
      throw new Error("No data received from server introspection.");
    }

    this.schema = buildClientSchema(data);
    return this.schema;
  }

  onSchemaChange(
    _handler: NotificationHandler<GraphQLSchema>,
  ): SchemaChangeUnsubscribeHandler {
    throw new Error("Polling of endpoint not implemented yet");
    return () => {};
  }

  async resolveFederatedServiceSDL() {
    if (this.federatedServiceSDL) return this.federatedServiceSDL;

    const { skipSSLValidation, url, headers } = this.config;
    const options: HttpOptions = {
      uri: url,
      fetch,
    };
    if (url.startsWith("https:") && skipSSLValidation) {
      options.fetchOptions = {
        agent: new HTTPSAgent({ rejectUnauthorized: false }),
      };
    }

    const getFederationInfoQuery = `
      query getFederationInfo {
        _service {
          sdl
        }
      }
    `;

    const { data, errors } = (await toPromise(
      linkExecute(createHttpLink(options), {
        query: parse(getFederationInfoQuery),
        context: { headers },
      }),
    )) as ExecutionResult<{ _service: { sdl: string } }>;

    if (errors && errors.length) {
      return Debug.error(
        errors.map(({ message }: Error) => message).join("\n"),
      );
    }

    if (!data || !data._service) {
      return Debug.error(
        "No data received from server when querying for _service.",
      );
    }

    this.federatedServiceSDL = data._service.sdl;
    return data._service.sdl;
  }

  // public async isFederatedSchema() {
  //   const schema = this.schema || (await this.resolveSchema());
  //   return false;
  // }
}
