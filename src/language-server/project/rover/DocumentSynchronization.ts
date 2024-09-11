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
  SemanticTokensRequest,
  ProtocolRequestType,
  SemanticTokensParams,
  SemanticTokens,
  CancellationToken,
} from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DocumentUri, GraphQLProject } from "../base";
import { generateKeyBetween } from "fractional-indexing";
import { Source } from "graphql";
import {
  findContainedSourceAndPosition,
  rangeInContainingDocument,
} from "../../utilities/source";
import { URI } from "vscode-uri";
import { DEBUG } from "./project";

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

function getUri(document: TextDocument, part: FilePart) {
  let uri = URI.parse(part.source.name);
  if (document.languageId !== "graphql") {
    uri = uri.with({ fragment: part.fractionalIndex });
  }

  return uri.toString();
}

function splitUri(fullUri: DocumentUri) {
  const uri = URI.parse(fullUri);
  return {
    uri: uri.with({ fragment: null }).toString(),
    fractionalIndex: uri.fragment || "a0",
  };
}

export class DocumentSynchronization {
  private pendingDocumentChanges = new Map<DocumentUri, TextDocument>();
  private knownFiles = new Map<
    DocumentUri,
    | {
        source: "editor";
        full: TextDocument;
        parts: ReadonlyArray<FilePart>;
      }
    | {
        source: "lsp";
        full: Pick<TextDocument, "uri">;
        parts?: undefined;
        diagnostics?: Diagnostic[];
      }
  >();

  constructor(
    private sendNotification: <P, RO>(
      type: ProtocolNotificationType<P, RO>,
      params?: P,
    ) => Promise<void>,
    private sendRequest: <P, R, PR, E, RO>(
      type: ProtocolRequestType<P, R, PR, E, RO>,
      params: P,
      token?: CancellationToken,
    ) => Promise<R>,
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
    this.knownFiles.set(document.uri, {
      source: "editor",
      full: document,
      parts: newParts,
    });

    for (const newPart of newParts) {
      const previousPart = previousObj[newPart.fractionalIndex];
      if (!previousPart) {
        await this.sendNotification(DidOpenTextDocumentNotification.type, {
          textDocument: {
            uri: getUri(document, newPart),
            languageId: "graphql",
            version: document.version,
            text: newPart.source.body,
          },
        });
      } else if (newPart.source.body !== previousPart.source.body) {
        await this.sendNotification(DidChangeTextDocumentNotification.type, {
          textDocument: {
            uri: getUri(document, newPart),
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
            uri: getUri(document, previousPart),
          },
        });
      }
    }
  }

  async resendAllDocuments() {
    for (const file of this.knownFiles.values()) {
      if (file.source === "editor") {
        await this.sendDocumentChanges(file.full, []);
      }
    }
  }

  onDidOpenTextDocument: NonNullable<GraphQLProject["onDidOpen"]> = async (
    params,
  ) => {
    this.documentDidChange(params.document);
  };

  onDidCloseTextDocument: NonNullable<GraphQLProject["onDidClose"]> = async (
    params,
  ) => {
    const known = this.knownFiles.get(params.document.uri);
    if (!known) {
      return;
    }
    this.knownFiles.delete(params.document.uri);
    if (known.source === "editor") {
      for (const part of known.parts) {
        await this.sendNotification(DidCloseTextDocumentNotification.type, {
          textDocument: {
            uri: getUri(known.full, part),
          },
        });
      }
    }
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
    if (!found || found.source !== "editor") {
      return;
    }
    const match = findContainedSourceAndPosition(
      found.parts,
      positionParams.position,
    );

    if (!match) return;
    return cb({
      textDocument: {
        uri: getUri(found.full, match),
      },
      position: match.position,
    });
  }

  handlePartDiagnostics(params: PublishDiagnosticsParams) {
    DEBUG && console.log("Received diagnostics", params);
    const uriDetails = splitUri(params.uri);
    const found = this.knownFiles.get(uriDetails.uri);
    if (!found || found.source === "lsp") {
      this.knownFiles.set(uriDetails.uri, {
        source: "lsp",
        full: { uri: uriDetails.uri },
        diagnostics: params.diagnostics,
      });
      this.sendDiagnostics(params);
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
    return [...this.knownFiles.values()]
      .filter((f) => f.source === "editor")
      .map((f) => f.full);
  }

  clearAllDiagnostics() {
    for (const file of this.knownFiles.values()) {
      if (file.source === "editor") {
        for (const part of file.parts) {
          part.diagnostics = [];
        }
      } else {
        file.diagnostics = [];
      }
      this.sendDiagnostics({ uri: file.full.uri, diagnostics: [] });
    }
  }

  /**
   * Receives semantic tokens for all sub-documents and glues them together.
   * See https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_semanticTokens
   * TLDR: The tokens are a flat array of numbers, where each token is represented by 5 numbers.
   * The first two numbers represent the token's delta line and delta start character and might need adjusing
   * relative to the start of a sub-document in relation to the position of the last token of the previous sub-document.
   *
   * There is also an "incremental" version of this request, but we don't support it yet.
   * This is complicated enough as it is.
   */
  async getFullSemanticTokens(
    params: SemanticTokensParams,
    cancellationToken: CancellationToken,
  ): Promise<SemanticTokens | null> {
    await this.synchronizedWithDocument(params.textDocument.uri);
    const found = this.knownFiles.get(params.textDocument.uri);
    if (!found || found.source !== "editor") {
      return null;
    }
    const allParts = await Promise.all(
      found.parts.map(async (part) => {
        return {
          part,
          tokens: await this.sendRequest(
            SemanticTokensRequest.type,
            {
              textDocument: { uri: getUri(found.full, part) },
            },
            cancellationToken,
          ),
        };
      }),
    );
    let line = 0,
      char = 0,
      lastLine = 0,
      lastChar = 0;
    const combinedTokens = [];
    for (const { part, tokens } of allParts) {
      if (!tokens) {
        continue;
      }
      line = part.source.locationOffset.line - 1;
      char = part.source.locationOffset.column - 1;
      for (let i = 0; i < tokens.data.length; i += 5) {
        const deltaLine = tokens.data[i],
          deltaStartChar = tokens.data[i + 1];

        // We need to run this loop fully to correctly calculate the `lastLine` and `lastChar`
        // so for the next incoming tokens, we can adjust the delta correctly.
        line = line + deltaLine;
        char = deltaLine === 0 ? char + deltaStartChar : deltaStartChar;
        // we just need to adjust the deltas only for the first token
        if (i === 0) {
          tokens.data[0] = line - lastLine;
          tokens.data[1] = line === lastLine ? lastChar - char : char;
        }
      }
      combinedTokens.push(...tokens.data);
      lastLine = line;
      lastChar = char;
    }
    return {
      data: combinedTokens,
    };
  }
}
