import { contentDigest } from "../core/contentDigest.js";
import { annotateError } from "../core/diagnostics.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { parseDataSource, validateSourceRows } from "../grammar/dataSource.js";
import { createDataSourceRequest, dataSourceRequestHash } from "../grammar/dataSourceRequest.js";
import { dataSourceValueHash, utf8DataText, decodeDataPayload, validateDataSourcePayload } from "../grammar/dataSourcePayload.js";

export { createDataSourceRequest } from "../grammar/dataSourceRequest.js";

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} contains unsupported properties.`);
}

export function checkDataSourceAbort(signal) {
  if (signal === undefined) return;
  const getter = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "aborted").get;
  if (getter.call(signal)) {
    const error = new Error("Data source preparation was aborted.");
    error.name = "AbortError"; throw error;
  }
}

export async function prepareDataSource(source, options = {}) {
  const request = createDataSourceRequest(source, options);
  return prepareDataSourceRequest(request, options);
}

// Public preparation fixes every source request before starting host I/O.
export async function prepareDataSourceRequest(request, options) {
  const { signal, load, resolveNamed } = options;
  checkDataSourceAbort(signal);
  const normalized = request.source;
  let decoded, original;
  if (Object.hasOwn(normalized, "values")) {
    original = { kind: "rows", values: normalized.values };
  } else if (normalized.kind === "inline") {
    decoded = { ...utf8DataText(normalized.text), mimeType: normalized.format === "csv" ? "text/csv" : "application/json" };
  } else {
    const loader = normalized.kind === "url" ? load : resolveNamed;
    if (typeof loader !== "function") throw new TypeError(`Data source requires explicit host ${normalized.kind === "url" ? "load" : "resolveNamed"} callback.`);
    const response = await loader(Object.freeze({ ...(normalized.kind === "url" ? { url: request.resolvedURL } : { name: normalized.name }), ...(signal === undefined ? {} : { signal }) }));
    checkDataSourceAbort(signal);
    decoded = decodeDataPayload(response, normalized.format);
  }
  const parsed = parseDataSource(normalized, decoded?.text);
  original ??= { kind: "text", text: decoded.text };
  const provenance = decoded === undefined
    ? { parserVersion: "rows@1", format: "rows", contentHash: dataSourceValueHash(original.values), hashKind: "encoded-rows" }
    : { parserVersion: `${normalized.format}@1`, format: normalized.format, contentHash: contentDigest(decoded.text),
      hashKind: "utf8-bytes", mimeType: decoded.mimeType, encoding: "utf-8", byteLength: decoded.byteLength };
  checkDataSourceAbort(signal);
  return cloneAndFreeze({ request, ...parsed, original, provenance });
}

export function validatePreparedDataSource(prepared, expected) {
  exact(prepared, ["request", "values", "schema", "original", "provenance"], "Prepared data source");
  exact(expected, ["requestToken", "inputHash"], "Expected data request");
  validateSourceRows([{ prepared }], { maxDepth: 256 });
  const { request, original, provenance } = prepared;
  if (typeof expected.requestToken !== "string" || typeof expected.inputHash !== "string" ||
      request.requestToken !== expected.requestToken || request.inputHash !== expected.inputHash || dataSourceRequestHash(request) !== request.inputHash) {
    throw annotateError(new Error("Prepared data source is stale or its request has changed."), { code: "stale-result" });
  }
  validateDataSourcePayload({ source: request.source, values: prepared.values, schema: prepared.schema, original, provenance });
  return prepared;
}
