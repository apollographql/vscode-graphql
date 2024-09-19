// @ts-check
const { pathToFileURL } = require("node:url");

/** @import { ResolveContext, ResolutionResult, LoadResult, ImportContext } from "./cache-busting-resolver.types" */

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
  if (context.importAttributes.as !== "cachebust") {
    return nextResolve(specifier, context);
  }
  // no need to resolve at all, we have all necessary information
  return {
    url: bustFileName(specifier),
    format: context.importAttributes.format,
    importAttributes: context.importAttributes,
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
  if (context.importAttributes.as !== "cachebust") {
    return nextLoad(url, context);
  }
  return {
    format: context.format || "module",
    shortCircuit: true,
    source: context.importAttributes.contents,
  };
}

module.exports = {
  resolve,
  load,
};
