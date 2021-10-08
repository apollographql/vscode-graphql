import { MarkdownString } from "vscode";
import type {
  LanguageClient as GenericLanguageClient,
  NotificationHandler,
  NotificationHandler0,
  NotificationType,
  NotificationType0,
  Range,
} from "vscode-languageclient";
import type { IConnection as GenericConnection } from "vscode-languageserver";

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

type Messages = {
  "apollographql/statsLoaded": ProjectStats;
  "apollographql/configFilesFound": string;
  "apollographql/tagsLoaded": string;
  "apollographql/loadingComplete": number;
  "apollographql/loading": { message: string; token: number };
  "apollographql/engineDecorations": { decorations: EngineDecoration[] };
  serverDebugMessage: {
    type: "info" | "warning" | "error" | "errorTelemetry";
    message: string;
  };
};

export type LanguageClient = Omit<GenericLanguageClient, "onNotification"> & {
  // Don't allow passing of generic string messages, restrict to only those
  // listed in the Message type
  onNotification<MessageType extends keyof Messages>(
    messageType: MessageType,
    handler: (value: Messages[MessageType]) => void
  ): void;
  // Allow other notification types
  onNotification<RO>(
    type: NotificationType0<RO>,
    handler: NotificationHandler0
  ): void;
  onNotification<P, RO>(
    type: NotificationType<P, RO>,
    handler: NotificationHandler<P>
  ): void;
};

export type Connection = Omit<GenericConnection, "sendNotification"> & {
  // Don't allow passing of generic string messages, restrict to only those
  // listed in the Message type
  sendNotification<MessageType extends keyof Messages>(
    messageType: MessageType,
    value: Messages[MessageType]
  ): void;
  // Allow other notification types
  sendNotification<RO>(type: NotificationType0<RO>): void;
  sendNotification<P, RO>(type: NotificationType<P, RO>, params: P): void;
};
