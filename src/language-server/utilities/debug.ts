import { LanguageServerNotifications as Notifications } from "../../messages";
import { Connection, TraceValues } from "vscode-languageserver/node";
import { format } from "util";

/**
 * for errors (and other logs in debug mode) we want to print
 * a stack trace showing where they were thrown. This uses an
 * Error's stack trace, removes the three frames regarding
 * this file (since they're useless) and returns the rest of the trace.
 */
const createAndTrimStackTrace = () => {
  let stack: string | undefined = new Error().stack;
  // remove the lines in the stack from _this_ function and the caller (in this file) and shorten the trace
  return stack && stack.split("\n").length > 2
    ? stack.split("\n").slice(3, 7).join("\n")
    : stack;
};

type Logger = (message?: any, minLevel?: TraceLevel) => void;
export enum TraceLevel {
  "off" = 0,
  "messages" = 1,
  "verbose" = 2,
}

export class Debug {
  private static _traceLevel: TraceLevel = TraceLevel.off;
  public static get traceLevel(): TraceLevel {
    return Debug._traceLevel;
  }
  public static set traceLevel(value: TraceValues | undefined) {
    if (value === "compact") {
      // we do not handle "compact" and it's not possible to set in settings, but it doesn't hurt to at least map
      // it to another value
      this._traceLevel = TraceLevel.messages;
    } else {
      this._traceLevel = TraceLevel[value || "off"];
    }
  }
  private static connection?: Connection;
  private static infoLogger: Logger = (message) =>
    console.log("[INFO] " + message);
  private static warningLogger: Logger = (message) =>
    console.warn("[WARNING] " + message);
  private static errorLogger: Logger = (message) =>
    console.error("[ERROR] " + message);

  /**
   * Setting a connection overrides the default info/warning/error
   * loggers to pass a notification to the connection
   */
  public static SetConnection(conn: Connection) {
    Debug.connection = conn;
    Debug.infoLogger = (message) =>
      Debug.connection!.sendNotification(Notifications.ServerDebugMessage, {
        type: "info",
        message: message,
      });
    Debug.warningLogger = (message) =>
      Debug.connection!.sendNotification(Notifications.ServerDebugMessage, {
        type: "warning",
        message: message,
      });
    Debug.errorLogger = (message) =>
      Debug.connection!.sendNotification(Notifications.ServerDebugMessage, {
        type: "error",
        message: message,
      });
  }

  /**
   * Allow callers to set their own error logging utils.
   * These will default to console.log/warn/error
   */
  public static SetLoggers({
    info,
    warning,
    error,
  }: {
    info?: Logger;
    warning?: Logger;
    error?: Logger;
  }) {
    if (info) Debug.infoLogger = info;
    if (warning) Debug.warningLogger = warning;
    if (error) Debug.errorLogger = error;
  }

  public static info(message: string, ...param: any[]) {
    Debug.infoLogger(format(message, ...param));
  }

  public static error(message: string, ...param: any[]) {
    const stack = createAndTrimStackTrace();
    Debug.errorLogger(`${format(message, ...param)}\n${stack}`);
  }

  public static warning(message: string, ...param: any[]) {
    Debug.warningLogger(format(message, ...param));
  }

  public static traceMessage(
    short: string,
    verbose = short,
    ...verboseParams: any[]
  ) {
    if (Debug.traceLevel >= TraceLevel.verbose) {
      // directly logging to `console` because
      // we don't want to send yet another notification that will be traced
      console.info(verbose, ...verboseParams);
    } else if (Debug.traceLevel >= TraceLevel.messages) {
      console.info(short);
    }
  }

  public static traceVerbose(message: string, ...params: any[]) {
    if (Debug.traceLevel >= TraceLevel.verbose) {
      // directly logging to `console` because
      // we don't want to send yet another notification that will be traced
      console.info(message, ...params);
    }
  }

  public static sendErrorTelemetry(message: string) {
    Debug.connection &&
      Debug.connection.sendNotification(Notifications.ServerDebugMessage, {
        type: "errorTelemetry",
        message: message,
      });
  }
}
