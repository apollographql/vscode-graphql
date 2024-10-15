// @ts-check
const { pathToFileURL } = require("node:url");

/** @import { ResolveContext, ResolutionResult, LoadResult, ImportContext } from "./cache-busting-resolver.types" */

/**
 * importAssertions was renamed to importAttributes in newer versions of Node.js.
 *
 * @param {ResolveContext|ImportContext} context
 * @returns {boolean}
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
 * @param {ResolveContext|ImportContext} context
 * @returns {ImportAttributes}
 */
function resolveImportAttributes(context) {
  if (isImportAttributesAvailable(context)) {
    return context.importAttributes;
  }
  return context.importAssertions;
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
  const [as, format] = importAttributes.as.split(":");
  if (as !== "cachebust") {
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
  const [as, format] = importAttributes.as.split(":");
  if (as !== "cachebust") {
    return nextLoad(url, context);
  }
  const contents =
    "contents" in importAttributes
      ? importAttributes.contents
      : Object.keys(importAttributes)[1];
  return {
    format: format || "module",
    shortCircuit: true,
    source: contents,
  };
}

module.exports = {
  resolve,
  load,
};
