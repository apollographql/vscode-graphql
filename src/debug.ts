import { OutputChannel } from "vscode";
import { TraceValues } from "vscode-languageclient";
import { format } from "node:util";

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

export class Debug {
  private static outputConsole?: OutputChannel;

  public static SetOutputConsole(outputConsole: OutputChannel) {
    this.outputConsole = outputConsole;
  }

  private static _traceLevel: Exclude<TraceValues, "compact"> = "off";
  public static get traceLevel(): TraceValues {
    return Debug._traceLevel;
  }
  public static set traceLevel(value: TraceValues | undefined) {
    console.log("setting trace level to", value);
    if (value === "compact") {
      // we do not handle "compact" and it's not possible to set in settings, but it doesn't hurt to at least map
      // it to another value
      this._traceLevel = "messages";
    } else {
      this._traceLevel = value || "off";
    }
  }

  /**
   * Displays an info message prefixed with [INFO]
   */
  public static info(message: string, _stack?: string) {
    // we check for the output console in every function
    // since these are static functions and can be
    // theoretically called before the output console is set
    // (although that shouldn't technically be possible)
    if (!this.outputConsole) return;
    this.outputConsole.appendLine(`[INFO] ${message}`);
  }

  /**
   * Displays and error message prefixed with [ERROR]
   * Creates and shows a truncated stack trace
   */
  public static error(message: string, stack?: string) {
    if (!this.outputConsole) return;
    const stackTrace = stack || createAndTrimStackTrace();
    Debug.showConsole();
    this.outputConsole.appendLine(`[ERROR] ${message}`);
    stackTrace && this.outputConsole.appendLine(stackTrace);
  }

  /**
   * Displays and warning message prefixed with [WARN]
   * Does not open the output window, since these
   * are less urgent
   */
  public static warning(message: string, _stack?: string) {
    if (!this.outputConsole) return;
    this.outputConsole.appendLine(`[WARN] ${message}`);
  }

  public static traceMessage(
    short: string,
    verbose = short,
    ...verboseParams: any[]
  ) {
    if (!this.outputConsole) return;
    if (Debug.traceLevel === "verbose") {
      this.outputConsole.appendLine(
        `[Trace] ${format(verbose, ...verboseParams)}`,
      );
    } else if (Debug.traceLevel === "messages") {
      this.outputConsole.appendLine(`[Trace] ${short}`);
    }
  }

  public static traceVerbose(message: string, ...params: any[]) {
    if (!this.outputConsole) return;
    if (Debug.traceLevel === "verbose") {
      this.outputConsole.appendLine(`[Trace] ${format(message, ...params)}`);
    }
  }

  /**
   * TODO: enable error reporting and telemetry
   */
  // public static sendErrorTelemetry(message: string) {
  //   if (Config.enableErrorTelemetry) {
  //     let encoded = new Buffer(message).toString("base64");
  //     http.get("" + encoded, function () {});
  //   }
  // }

  public static clear() {
    if (!this.outputConsole) return;
    this.outputConsole.clear();
    this.outputConsole.dispose();
  }

  private static showConsole() {
    if (!this.outputConsole) return;
    this.outputConsole.show();
  }
}
