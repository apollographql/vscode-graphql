import { GraphQLProject } from "./base";

export class RoverProject implements Pick<GraphQLProject, "config"> {
  config: any;
}
