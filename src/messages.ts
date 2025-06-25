import { QuickPickItem } from "vscode";
import { NotificationType, RequestType } from "vscode-jsonrpc";
import { Range } from "vscode-languageclient/node";

export interface TypeStats {
  service?: number;
  client?: number;
  total?: number;
}

export type ProjectStats =
  | {
      type: string;
      loaded: true;
      serviceId?: string;
      types?: TypeStats;
      tag?: string;
      lastFetch?: number;
    }
  | { loaded: false };

export type EngineDecoration =
  | {
      type: "text";
      document: string;
      message: string;
      range: Range;
    }
  | {
      type: "runGlyph";
      document: string;
      range: Range;
      hoverMessage: string;
    };

export const LanguageServerRequests = {
  FileStats: new RequestType<{ uri: string }, ProjectStats, unknown>(
    "apollographql/fileStats",
  ),
  ShowConnectorPanel: new RequestType<
    { connectorId?: string; uri?: string },
    void,
    unknown
  >("apollographql/showConnectorPanel"),
};

/**
 * Notifications sent to the language server
 */
export const LanguageServerCommands = {
  GetStats: new NotificationType<{ uri: string }>("apollographql/getStats"),
  ReloadService: new NotificationType<void>("apollographql/reloadService"),
  TagSelected: new NotificationType<QuickPickItem>("apollographql/tagSelected"),
};

/**
 * Notifications sent from the language server
 */
export const LanguageServerNotifications = {
  StatsLoaded: new NotificationType<ProjectStats>("apollographql/statsLoaded"),
  ConfigFilesFound: new NotificationType<string>(
    "apollographql/configFilesFound",
  ),
  TagsLoaded: new NotificationType<string>("apollographql/tagsLoaded"),
  LoadingComplete: new NotificationType<number>(
    "apollographql/loadingComplete",
  ),
  Loading: new NotificationType<{
    message: string;
    token: number;
  }>("apollographql/loading"),
  EngineDecorations: new NotificationType<{
    decorations: EngineDecoration[];
  }>("apollographql/engineDecorations"),
  ServerDebugMessage: new NotificationType<{
    type: "info" | "warning" | "error" | "errorTelemetry";
    message: string;
    stack?: string;
  }>("serverDebugMessage"),
  RegisterConnector: new NotificationType<{
    id: string;
    uri: string;
  }>("apollographql/registerConnector"),
};
