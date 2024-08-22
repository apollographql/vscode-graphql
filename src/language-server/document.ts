import { parse, Source, DocumentNode } from "graphql";
import { SourceLocation, getLocation } from "graphql/language/location";

import {
  Position,
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver/node";

import { getRange as rangeOfTokenAtLocation } from "graphql-language-service";

import {
  positionFromSourceLocation,
  rangeInContainingDocument,
} from "./utilities/source";
import { TextDocument } from "vscode-languageserver-textdocument";

declare global {
  interface RegExpExecArray {
    indices?: Array<[number, number]>;
  }
}
export class GraphQLDocument {
  ast?: DocumentNode;
  syntaxErrors: Diagnostic[] = [];

  constructor(public source: Source) {
    try {
      this.ast = parse(source);
    } catch (error: any) {
      // Don't add syntax errors when GraphQL has been commented out
      if (maybeCommentedOut(source.body)) return;

      // A GraphQL syntax error only has a location and no node, because we don't have an AST
      // So we use the online parser to get the range of the token at that location
      const range = rangeInContainingDocument(
        source,
        rangeOfTokenAtLocation(error.locations[0], source.body),
      );
      this.syntaxErrors.push({
        severity: DiagnosticSeverity.Error,
        message: error.message,
        source: "GraphQL: Syntax",
        range,
      });
    }
  }

  containsPosition(position: Position): boolean {
    if (position.line < this.source.locationOffset.line - 1) return false;
    const end = positionFromSourceLocation(
      this.source,
      getLocation(this.source, this.source.body.length),
    );
    return position.line <= end.line;
  }
}

export function extractGraphQLSources(
  document: TextDocument,
  tagName: string = "gql",
): Source[] | null {
  switch (document.languageId) {
    case "graphql":
      return [new Source(document.getText(), document.uri)];
    case "javascript":
    case "javascriptreact":
    case "typescript":
    case "typescriptreact":
    case "vue":
    case "svelte":
      return extractGraphQLSourcesFromJSTemplateLiterals(document, tagName);
    case "python":
      return extractGraphQLSourcesFromPythonStrings(document, tagName);
    case "ruby":
      return extractGraphQLSourcesFromRubyStrings(document, tagName);
    case "dart":
      return extractGraphQLSourcesFromDartStrings(document, tagName);
    case "reason":
      return extractGraphQLSourcesFromReasonStrings(document, tagName);
    case "elixir":
      return extractGraphQLSourcesFromElixirStrings(document, tagName);
    default:
      return null;
  }
}

export function extractGraphQLDocuments(
  document: TextDocument,
  tagName: string = "gql",
): GraphQLDocument[] | null {
  const sources = extractGraphQLSources(document, tagName);
  if (!sources) return null;
  return sources.map((source) => new GraphQLDocument(source));
}

const parts = [
  // normal tagged template literals
  /TAG_NAME\s*(?:<.*?>\s*)?`(.*?)`/,
  // template string starting with a #TAG_NAME, #graphql or #GraphQL comment
  /`(\s*#[ ]*(?:TAG_NAME|graphql|GraphQL).*?)`/,
  // template string preceeded by a /* TAG_NAME */, /* graphql */ or /* GraphQL */ comment
  /\/\*\s*(?:TAG_NAME|graphql|GraphQL)\s*\*\/\s?`(.*?)`/,
  // function call to TAG_NAME with a single template string argument
  /TAG_NAME\s*(?:<.*?>\s*)?\(\s*`(.*?)`\s*\)/,
].map((r) => r.source);

function extractGraphQLSourcesFromJSTemplateLiterals(
  document: TextDocument,
  tagName: string,
): Source[] | null {
  const text = document.getText();

  const sources: Source[] = [];

  const regExp = new RegExp(
    parts.map((r) => r.replace("TAG_NAME", tagName)).join("|"),
    // g: global search
    // s: treat `.` as any character, including newlines
    // d: save indices
    "gsd",
  );

  let result;
  while ((result = regExp.exec(text)) !== null) {
    // we have multiple alternative capture groups in the regexp, and only one of them will have a result
    // so we need the index for that
    const groupIndex = result.findIndex(
      (part, index) => index != 0 && part != null,
    );
    const contents = replacePlaceholdersWithWhiteSpace(result[groupIndex]);
    const position = document.positionAt(result.indices![groupIndex][0]);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    if (source.body.trim().length > 0) {
      sources.push(source);
    }
  }

  if (sources.length < 1) return null;

  return sources;
}

function extractGraphQLSourcesFromPythonStrings(
  document: TextDocument,
  tagName: string,
): Source[] | null {
  const text = document.getText();

  const sources: Source[] = [];

  const regExp = new RegExp(
    `\\b(${tagName}\\s*\\(\\s*[bfru]*("(?:"")?|'(?:'')?))([\\s\\S]+?)\\2\\s*\\)`,
    "gm",
  );

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[3]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    sources.push(source);
  }

  if (sources.length < 1) return null;

  return sources;
}

function extractGraphQLSourcesFromRubyStrings(
  document: TextDocument,
  tagName: string,
): Source[] | null {
  const text = document.getText();

  const sources: Source[] = [];

  const regExp = new RegExp(`(<<-${tagName})([\\s\\S]+?)${tagName}`, "gm");

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[2]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    sources.push(source);
  }

  if (sources.length < 1) return null;

  return sources;
}

function extractGraphQLSourcesFromDartStrings(
  document: TextDocument,
  tagName: string,
): Source[] | null {
  const text = document.getText();

  const sources: Source[] = [];

  const regExp = new RegExp(
    `\\b(${tagName}\\(\\s*r?("""|'''))([\\s\\S]+?)\\2\\s*\\)`,
    "gm",
  );

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[3]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    sources.push(source);
  }

  if (sources.length < 1) return null;

  return sources;
}

function extractGraphQLSourcesFromReasonStrings(
  document: TextDocument,
  tagName: string,
): Source[] | null {
  const text = document.getText();

  const sources: Source[] = [];

  const reasonFileFilter = new RegExp(/(\[%(graphql|relay\.))/g);

  if (!reasonFileFilter.test(text)) {
    return sources;
  }

  const reasonRegexp = new RegExp(
    /(?<=\[%(graphql|relay\.\w*)[\s\S]*{\|)[.\s\S]+?(?=\|})/gm,
  );

  let result;
  while ((result = reasonRegexp.exec(text)) !== null) {
    const contents = result[0];
    const position = document.positionAt(result.index);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    sources.push(source);
  }

  if (sources.length < 1) return null;

  return sources;
}

function extractGraphQLSourcesFromElixirStrings(
  document: TextDocument,
  tagName: string,
): Source[] | null {
  const text = document.getText();
  const sources: Source[] = [];

  const regExp = new RegExp(
    `\\b(${tagName}\\(\\s*r?("""))([\\s\\S]+?)\\2\\s*\\)`,
    "gm",
  );

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[3]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    sources.push(source);
  }

  if (sources.length < 1) return null;

  return sources;
}

function replacePlaceholdersWithWhiteSpace(content: string) {
  return content.replace(/\$\{([\s\S]+?)\}/gm, (match) => {
    return Array(match.length).join(" ");
  });
}

function maybeCommentedOut(content: string) {
  return (
    (content.indexOf("/*") > -1 && content.indexOf("*/") > -1) ||
    content.split("//").length > 1
  );
}
