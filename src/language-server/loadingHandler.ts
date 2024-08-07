import { LanguageServerNotifications as Notifications } from "../messages";
import { Connection, NotificationType } from "vscode-languageserver/node";

// XXX I think we want to combine this into an interface
// with the errors tooling as well

export interface LoadingHandler {
  handle<T>(message: string, value: Promise<T>): Promise<T>;
  handleSync<T>(message: string, value: () => T): T;
  showError(message: string): void;
}

export class LanguageServerLoadingHandler implements LoadingHandler {
  constructor(private connection: Connection) {}
  private latestLoadingToken = 0;
  async handle<T>(message: string, value: Promise<T>): Promise<T> {
    const token = this.latestLoadingToken;
    this.latestLoadingToken += 1;
    this.connection.sendNotification(Notifications.Loading, { message, token });
    try {
      const ret = await value;
      this.connection.sendNotification(Notifications.LoadingComplete, token);
      return ret;
    } catch (e) {
      this.connection.sendNotification(Notifications.LoadingComplete, token);
      this.showError(`Error in "${message}": ${e}`);
      throw e;
    }
  }
  handleSync<T>(message: string, value: () => T): T {
    const token = this.latestLoadingToken;
    this.latestLoadingToken += 1;
    this.connection.sendNotification(Notifications.Loading, { message, token });
    try {
      const ret = value();
      this.connection.sendNotification(Notifications.LoadingComplete, token);
      return ret;
    } catch (e) {
      Notifications.LoadingComplete,
        this.showError(`Error in "${message}": ${e}`);
      throw e;
    }
  }
  showError(message: string) {
    this.connection.window.showErrorMessage(message);
  }
}
