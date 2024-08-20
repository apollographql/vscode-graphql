import { extractGraphQLSources } from "../../document";
import {
  ProtocolNotificationType,
  DidChangeTextDocumentNotification,
  DidOpenTextDocumentNotification,
  DidCloseTextDocumentNotification,
  TextDocumentPositionParams,
  Diagnostic,
  NotificationHandler,
  PublishDiagnosticsParams,
} from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DocumentUri, GraphQLProject } from "../base";
import { generateKeyBetween } from "fractional-indexing";
import { Source } from "graphql";
import {
  findContainedSourceAndPosition,
  rangeInContainingDocument,
} from "../../utilities/source";

export interface FilePart {
  fractionalIndex: string;
  source: Source;
  diagnostics: Diagnostic[];
}

export function handleFilePartUpdates(
  parsed: ReadonlyArray<Source>,
  previousParts: ReadonlyArray<FilePart>,
): ReadonlyArray<FilePart> {
  const newParts: FilePart[] = [];
  let newIdx = 0;
  let oldIdx = 0;
  let offsetCorrection = 0;
  while (newIdx < parsed.length || oldIdx < previousParts.length) {
    const source = parsed[newIdx] as Source | undefined;
    const oldPart = previousParts[oldIdx] as FilePart | undefined;
    if (!source) return newParts;
    const newOffset = source.locationOffset.line;

    if (
      oldPart &&
      (source.body === oldPart.source.body ||
        newOffset === oldPart.source.locationOffset.line + offsetCorrection)
    ) {
      // replacement of chunk
      newParts.push({ ...oldPart, source });
      offsetCorrection =
        source.locationOffset.line - oldPart.source.locationOffset.line;
      newIdx++;
      oldIdx++;
    } else if (
      !oldPart ||
      newOffset < oldPart.source.locationOffset.line + offsetCorrection
    ) {
      // inserted chunk
      const fractionalIndex = generateKeyBetween(
        newParts.length == 0
          ? null
          : newParts[newParts.length - 1].fractionalIndex,
        oldPart ? oldPart.fractionalIndex : null,
      );
      newParts.push({ source, fractionalIndex, diagnostics: [] });
      newIdx++;
      offsetCorrection += source.body.split("\n").length - 1;
    } else {
      // deleted chunk
      oldIdx++;
    }
  }
  return newParts;
}

function getUri(part: FilePart) {
  return part.source.name + "/" + part.fractionalIndex + ".graphql";
}
function splitUri(fullUri: DocumentUri) {
  const result = /^(.*)\/(\w+)\.graphql/.exec(fullUri);
  if (!result) return null;
  const [, uri, fractionalIndex] = result;
  return { uri, fractionalIndex };
}

export class DocumentSynchronization {
  private pendingDocumentChanges = new Map<DocumentUri, TextDocument>();
  private knownFiles = new Map<
    DocumentUri,
    {
      full: TextDocument;
      parts: ReadonlyArray<FilePart>;
    }
  >();

  constructor(
    private sendNotification: <P, RO>(
      type: ProtocolNotificationType<P, RO>,
      params?: P,
    ) => Promise<void>,
    private sendDiagnostics: NotificationHandler<PublishDiagnosticsParams>,
  ) {}

  private documentSynchronizationScheduled = false;
  /**
   * Ensures that only one `syncNextDocumentChange` is queued with the connection at a time.
   * As a result, other, more important, changes can be processed with higher priority.
   */
  private scheduleDocumentSync = async () => {
    if (
      this.pendingDocumentChanges.size === 0 ||
      this.documentSynchronizationScheduled
    ) {
      return;
    }

    this.documentSynchronizationScheduled = true;
    try {
      const next = this.pendingDocumentChanges.values().next();
      if (next.done) return;
      await this.sendDocumentChanges(next.value);
    } finally {
      this.documentSynchronizationScheduled = false;
      setImmediate(this.scheduleDocumentSync);
    }
  };

  private async sendDocumentChanges(
    document: TextDocument,
    previousParts = this.knownFiles.get(document.uri)?.parts || [],
  ) {
    this.pendingDocumentChanges.delete(document.uri);

    const previousObj = Object.fromEntries(
      previousParts.map((p) => [p.fractionalIndex, p]),
    );
    const newParts = handleFilePartUpdates(
      extractGraphQLSources(document) || [],
      previousParts,
    );
    const newObj = Object.fromEntries(
      newParts.map((p) => [p.fractionalIndex, p]),
    );
    this.knownFiles.set(document.uri, { full: document, parts: newParts });

    for (const newPart of newParts) {
      const previousPart = previousObj[newPart.fractionalIndex];
      if (!previousPart) {
        await this.sendNotification(DidOpenTextDocumentNotification.type, {
          textDocument: {
            uri: getUri(newPart),
            languageId: "graphql",
            version: document.version,
            text: newPart.source.body,
          },
        });
      } else if (newPart.source.body !== previousPart.source.body) {
        await this.sendNotification(DidChangeTextDocumentNotification.type, {
          textDocument: {
            uri: getUri(newPart),
            version: document.version,
          },
          contentChanges: [
            {
              text: newPart.source.body,
            },
          ],
        });
      }
    }
    for (const previousPart of previousParts) {
      if (!newObj[previousPart.fractionalIndex]) {
        await this.sendNotification(DidCloseTextDocumentNotification.type, {
          textDocument: {
            uri: getUri(previousPart),
          },
        });
      }
    }
  }

  async resendAllDocuments() {
    for (const file of this.knownFiles.values()) {
      await this.sendDocumentChanges(file.full, []);
    }
  }

  onDidOpenTextDocument: NonNullable<GraphQLProject["onDidOpen"]> = async (
    params,
  ) => {
    this.documentDidChange(params.document);
  };

  onDidCloseTextDocument: NonNullable<GraphQLProject["onDidClose"]> = (
    params,
  ) => {
    const known = this.knownFiles.get(params.document.uri);
    if (!known) {
      return;
    }
    this.knownFiles.delete(params.document.uri);
    return Promise.all(
      known.parts.map((part) =>
        this.sendNotification(DidCloseTextDocumentNotification.type, {
          textDocument: {
            uri: getUri(part),
          },
        }),
      ),
    );
  };

  async documentDidChange(document: TextDocument) {
    if (this.pendingDocumentChanges.has(document.uri)) {
      // this will put the document at the end of the queue again
      // in hopes that we can skip a bit of unnecessary work sometimes
      // when many files change around a lot
      // we will always ensure that a document is synchronized via `synchronizedWithDocument`
      // before we do other operations on the document, so this is safe
      this.pendingDocumentChanges.delete(document.uri);
    }

    this.pendingDocumentChanges.set(document.uri, document);
    this.scheduleDocumentSync();
  }

  async synchronizedWithDocument(documentUri: DocumentUri): Promise<void> {
    const document = this.pendingDocumentChanges.get(documentUri);
    if (document) {
      await this.sendDocumentChanges(document);
    }
  }

  async insideVirtualDocument<T>(
    positionParams: TextDocumentPositionParams,
    cb: (virtualPositionParams: TextDocumentPositionParams) => Promise<T>,
  ): Promise<T | undefined> {
    await this.synchronizedWithDocument(positionParams.textDocument.uri);
    const found = this.knownFiles.get(positionParams.textDocument.uri);
    if (!found) {
      return;
    }
    const match = findContainedSourceAndPosition(
      found.parts,
      positionParams.position,
    );

    if (!match) return;
    return cb({
      textDocument: {
        uri: getUri(match),
      },
      position: match.position,
    });
  }

  handlePartDiagnostics(params: PublishDiagnosticsParams) {
    const uriDetails = splitUri(params.uri);
    if (!uriDetails) {
      return;
    }
    const found = this.knownFiles.get(uriDetails.uri);
    if (!found) {
      return;
    }
    const part = found.parts.find(
      (p) => p.fractionalIndex === uriDetails.fractionalIndex,
    );
    if (!part) {
      return;
    }
    part.diagnostics = params.diagnostics;

    const fullDocumentParams: PublishDiagnosticsParams = {
      uri: found.full.uri,
      version: found.full.version,
      diagnostics: found.parts.flatMap((p) =>
        p.diagnostics.map((diagnostic) => ({
          ...diagnostic,
          range: rangeInContainingDocument(p.source, diagnostic.range),
        })),
      ),
    };

    this.sendDiagnostics(fullDocumentParams);
  }

  get openDocuments() {
    return [...this.knownFiles.values()].map((f) => f.full);
  }

  clearAllDiagnostics() {
    for (const file of this.knownFiles.values()) {
      for (const part of file.parts) {
        part.diagnostics = [];
      }
      this.sendDiagnostics({ uri: file.full.uri, diagnostics: [] });
    }
  }
}
