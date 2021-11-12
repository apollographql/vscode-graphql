import { GraphQLDataSource } from "./GraphQLDataSource";
import { DefaultEngineConfig } from "../config";
import { SCHEMA_TAGS_AND_FIELD_STATS } from "./operations/schemaTagsAndFieldStats";
import {
  FrontendUrlRootQuery,
  SchemaTagsAndFieldStatsQuery,
} from "../graphqlTypes";
import { FRONTEND_URL_ROOT } from "./operations/frontendUrlRoot";

export interface ClientIdentity {
  name?: string;
  version?: string;
  referenceID?: string;
}

export type ServiceID = string;
export type ClientID = string;
export type SchemaTag = string;
export type ServiceIDAndTag = [ServiceID, SchemaTag?];
export type ServiceSpecifier = string;
// Map from parent type name to field name to latency in ms.
export type FieldLatenciesMS = Map<string, Map<string, number | null>>;

export function noServiceError(service: string | undefined, endpoint?: string) {
  return `Could not find graph ${
    service ? service : ""
  } from Apollo at ${endpoint}. Please check your API key and graph ID`;
}

export class ApolloEngineClient extends GraphQLDataSource {
  constructor(
    private engineKey: string,
    engineEndpoint: string = DefaultEngineConfig.endpoint,
    private clientIdentity?: ClientIdentity
  ) {
    super();
    this.baseURL = engineEndpoint;
  }

  // XXX fix typings on base package
  willSendRequest(request: any) {
    if (!request.headers) request.headers = {};
    request.headers["x-api-key"] = this.engineKey;
    if (this.clientIdentity && this.clientIdentity.name) {
      request.headers["apollo-client-name"] = this.clientIdentity.name;
      request.headers["apollo-client-reference-id"] =
        this.clientIdentity.referenceID;
      request.headers["apollo-client-version"] = this.clientIdentity.version;
      return;
    }

    // default values
    request.headers["apollo-client-name"] = "Apollo Language Server";
    request.headers["apollo-client-reference-id"] =
      "146d29c0-912c-46d3-b686-920e52586be6";
    request.headers["apollo-client-version"] =
      require("../../package.json").version;
  }

  async loadSchemaTagsAndFieldLatencies(serviceID: string) {
    const { data, errors } = await this.execute<SchemaTagsAndFieldStatsQuery>({
      query: SCHEMA_TAGS_AND_FIELD_STATS,
      variables: {
        id: serviceID,
      },
    });

    if (!(data && data.service && data.service.schemaTags) || errors) {
      throw new Error(
        errors
          ? errors.map((error) => error.message).join("\n")
          : "No service returned. Make sure your service name and API key match"
      );
    }

    const schemaTags: string[] = data.service.schemaTags.map(
      ({ tag }: { tag: string }) => tag
    );

    const fieldLatenciesMS: FieldLatenciesMS = new Map();

    data.service.stats.fieldLatencies.forEach((fieldLatency) => {
      const { parentType, fieldName } = fieldLatency.groupBy;

      if (!parentType || !fieldName) {
        return;
      }
      const fieldsMap =
        fieldLatenciesMS.get(parentType) ||
        fieldLatenciesMS.set(parentType, new Map()).get(parentType)!;

      fieldsMap.set(fieldName, fieldLatency.metrics.fieldHistogram.durationMs);
    });

    return { schemaTags, fieldLatenciesMS };
  }

  async loadFrontendUrlRoot() {
    const { data } = await this.execute<FrontendUrlRootQuery>({
      query: FRONTEND_URL_ROOT,
    });

    return data?.frontendUrlRoot;
  }
}
