// @ts-check
const { pathToFileURL } = require("node:url");

/** @import { ResolveContext, ResolutionResult, LoadResult, ImportContext, ImportAttributes, ImportAssertions, LegacyResolveContext, LegacyImportContext, Format } from "./cache-busting-resolver.types" */

/**
 * importAssertions was renamed to importAttributes after following versions of Node.js.
 * Once we hit a minimum of 1.92, we can remove the legacy check and
 * use `importAttributes` directly.
 *
 * - v21.0.0
 * - v20.10.0
 * - v18.19.0
 *
 * @see https://github.com/apollographql/vscode-graphql/issues/225
 * @see https://nodejs.org/docs/latest/api/module.html#resolvespecifier-context-nextresolve
 *
 * @param {ResolveContext|ImportContext|LegacyResolveContext|LegacyImportContext} context
 * @returns {context is ResolveContext|ImportContext}
 */
function isImportAttributesAvailable(context) {
  return "importAttributes" in context;
}

/**
 * @param {ResolveContext|ImportContext} context
 * @returns {"importAttributes"|"importAssertions"}
 */
function resolveImportAttributesKeyName(context) {
  if (isImportAttributesAvailable(context)) {
    return "importAttributes";
  }
  return "importAssertions";
}

/**
 * @param {ResolveContext|ImportContext|LegacyResolveContext|LegacyImportContext} context
 * @returns {ImportAttributes|ImportAssertions}
 */
function resolveImportAttributes(context) {
  if (isImportAttributesAvailable(context)) {
    return context.importAttributes;
  }
  return context.importAssertions;
}

/**
 * @param {ImportAttributes|ImportAssertions} importAttributes
 * @returns {Format|null}
 */
function resolveConfigFormat(importAttributes) {
  const [as, format] = importAttributes.as
    ? importAttributes.as.split(":")
    : [];
  if (as === "cachebust" && format) {
    return /** @type {Format} */ (format);
  }
  return null;
}

/**
 * @param {string} specifier
 * @returns {string}
 */
function bustFileName(specifier) {
  const url = pathToFileURL(specifier);
  url.pathname = url.pathname + "." + Date.now() + ".js";
  return url.toString();
}

/**
 *
 * @param {string} specifier
 * @param {ResolveContext} context
 * @param {(specifier: string,context: ResolveContext) => Promise<ResolutionResult>} nextResolve
 * @returns {Promise<ResolutionResult>}
 */
async function resolve(specifier, context, nextResolve) {
  const importAttributes = resolveImportAttributes(context);
  const format = resolveConfigFormat(importAttributes);
  if (!format) {
    return nextResolve(specifier, context);
  }
  // no need to resolve at all, we have all necessary information
  return {
    url: bustFileName(specifier),
    format,
    [resolveImportAttributesKeyName(context)]: importAttributes,
    shortCircuit: true,
  };
}

/**
 *
 * @param {string} url
 * @param {ImportContext} context
 * @param {(url: string, context: ImportContext) => Promise<LoadResult>} nextLoad
 * @returns {Promise<LoadResult>}
 */
async function load(url, context, nextLoad) {
  const importAttributes = resolveImportAttributes(context);
  const format = resolveConfigFormat(importAttributes);
  if (!format) {
    return nextLoad(url, context);
  }
  const contents =
    "contents" in importAttributes
      ? importAttributes.contents
      : Object.keys(importAttributes)[1];
  return {
    format,
    shortCircuit: true,
    source: contents,
  };
}

module.exports = {
  resolve,
  load,
};
