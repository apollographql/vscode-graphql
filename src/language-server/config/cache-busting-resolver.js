// @ts-check
const { pathToFileURL } = require("node:url");

/** @import { ResolveContext, ResolutionResult, LoadResult, ImportContext } from "./cache-busting-resolver.types" */

/**
 * importAssertions was renamed to importAttributes in newer versions of Node.js.
 *
 * @param {ResolveContext|ImportContext} context
 * @returns {"importAttributes"|"importAssertions"}
 */
function importAttributesKeyName(context) {
  if (!("importAttributes" in context) && "importAssertions" in context) {
    return "importAssertions";
  }
  return "importAttributes";
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
  const importAttributesKey = importAttributesKeyName(context);
  if (context[importAttributesKey].as !== "cachebust") {
    return nextResolve(specifier, context);
  }
  // no need to resolve at all, we have all necessary information
  return {
    url: bustFileName(specifier),
    format: context[importAttributesKey].format,
    [importAttributesKey]: context[importAttributesKey],
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
  const importAttributesKey = importAttributesKeyName(context);
  if (context[importAttributesKey].as !== "cachebust") {
    return nextLoad(url, context);
  }
  return {
    format: context.format || "module",
    shortCircuit: true,
    source: context[importAttributesKey].contents,
  };
}

module.exports = {
  resolve,
  load,
};
