import { canonicalJSON, contentDigest } from "../core/contentDigest.js";
import { annotateError } from "../core/diagnostics.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { encodeValue } from "../core/valueEncoding.js";
import { validateWorkLimit } from "../core/validation.js";
import { normalizeDataSource, parseDataSource, validateSourceRows } from "../grammar/dataSource.js";
import { normalizeExpressionV2 } from "../grammar/expressionAst.js";
import { evaluateExpressionV2 } from "../grammar/expressionEvaluate.js";

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new TypeError(`${label} contains unsupported properties.`);
}

function abort(signal) {
  if (signal?.aborted) {
    const error = new Error("Data source preparation was aborted.");
    error.name = "AbortError"; throw error;
  }
}

function hash(value) { return contentDigest(canonicalJSON(encodeValue(value))); }

function requestHash(request) {
  const { inputHash: _hash, requestToken: _token, ...input } = request;
  return hash(input);
}

// The request is captured before asynchronous host work. Its explicit token
// distinguishes identical inputs that were removed and recreated meanwhile.
export function createDataSourceRequest(source, options = {}) {
  exact(options, ["baseURL", "parameters", "parameterInputs", "requestToken", "load", "resolveNamed", "signal"], "Data source host options");
  if (typeof options.requestToken !== "string" || !options.requestToken) throw new TypeError("Data source requires a nonempty requestToken.");
  validateWorkLimit(options.requestToken.length, "Data request token length");
  const normalized = normalizeDataSource(source);
  let url = normalized.url, ids = [], parameters = {};
  if (normalized.kind === "url" && typeof url !== "string") {
    const expression = normalizeExpressionV2(url, { parameters: options.parameters ?? {} });
    ids = expression.parameters;
    url = evaluateExpressionV2(expression.expression, [{}], { parameters: expression.environment.parameters }).values[0];
    if (typeof url !== "string" || !url) throw new TypeError("Data URL expression must produce a nonempty string.");
    parameters = Object.fromEntries(ids.map(id => [id, expression.environment.parameters[id]]));
  }
  const inputs = options.parameterInputs ?? [];
  ownArray(inputs, "Data source parameter inputs");
  if (inputs.length !== ids.length) throw new TypeError("Data source parameter inputs do not match all expression dependencies.");
  inputs.forEach((ref, index) => {
    exact(ref, ["kind", "id", "revision"], "Data source parameter input");
    if (Object.keys(ref).length !== 3 || ref.kind !== "parameter" || ref.id !== ids[index] || !Number.isSafeInteger(ref.revision) || ref.revision < 0) {
      throw new TypeError("Data source parameter inputs require exact ordered identities and revisions.");
    }
  });
  let resolvedURL;
  if (normalized.kind === "url") {
    if (options.baseURL !== undefined && (typeof options.baseURL !== "string" || !options.baseURL)) throw new TypeError("Data baseURL must be a nonempty absolute URL.");
    if (options.baseURL !== undefined) validateWorkLimit(options.baseURL.length, "Data baseURL length");
    try { resolvedURL = new URL(url, options.baseURL).href; }
    catch { throw new TypeError("Relative data URL requires an explicit absolute baseURL."); }
  }
  const request = { source: normalized, requestToken: options.requestToken, parameterInputs: inputs, parameters,
    ...(resolvedURL === undefined ? {} : { resolvedURL }) };
  return cloneAndFreeze({ ...request, inputHash: requestHash(request) });
}

function utf8Text(text) {
  validateWorkLimit(text.length, "Data source text length");
  const bytes = new TextEncoder().encode(text);
  if (new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) !== text) throw new TypeError("Data source text contains invalid Unicode.");
  return { text, byteLength: bytes.length };
}

function decodeResponse(response, format) {
  exact(response, ["text", "bytes", "mimeType", "encoding"], "Data source response");
  if (response.encoding !== "utf-8") throw new TypeError("Data source response requires utf-8 encoding.");
  if (typeof response.mimeType !== "string") throw new TypeError("Data source response requires MIME type.");
  const parts = response.mimeType.toLowerCase().split(";").map(part => part.trim());
  const mimeType = parts[0];
  const validMime = format === "csv" ? ["text/csv", "application/csv"].includes(mimeType)
    : mimeType === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(mimeType);
  if (!validMime || parts.slice(1).some(part => part !== "charset=utf-8" && part !== 'charset="utf-8"')) throw new TypeError("Data source MIME type or charset does not match its declared format.");
  if (Object.hasOwn(response, "text") === Object.hasOwn(response, "bytes")) throw new TypeError("Data source response requires exactly one of text or bytes.");
  let decoded;
  if (Object.hasOwn(response, "text")) {
    if (typeof response.text !== "string") throw new TypeError("Data source response text must be a string.");
    decoded = utf8Text(response.text);
  } else {
    if (!(response.bytes instanceof Uint8Array)) throw new TypeError("Data source response bytes must be Uint8Array.");
    validateWorkLimit(response.bytes.byteLength, "Data source byte length");
    const bytes = new Uint8Array(response.bytes);
    try { decoded = { text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes), byteLength: bytes.length }; }
    catch { throw new TypeError("Data source bytes contain invalid UTF-8."); }
  }
  return { ...decoded, mimeType };
}

export async function prepareDataSource(source, options = {}) {
  const request = createDataSourceRequest(source, options);
  const { signal, load, resolveNamed } = options;
  abort(signal);
  const normalized = request.source;
  let decoded, original;
  if (Object.hasOwn(normalized, "values")) {
    original = { kind: "rows", values: normalized.values };
  } else if (normalized.kind === "inline") {
    decoded = { ...utf8Text(normalized.text), mimeType: normalized.format === "csv" ? "text/csv" : "application/json" };
  } else {
    const loader = normalized.kind === "url" ? load : resolveNamed;
    if (typeof loader !== "function") throw new TypeError(`Data source requires explicit host ${normalized.kind === "url" ? "load" : "resolveNamed"} callback.`);
    const response = await loader(Object.freeze({ ...(normalized.kind === "url" ? { url: request.resolvedURL } : { name: normalized.name }), ...(signal === undefined ? {} : { signal }) }));
    abort(signal);
    decoded = decodeResponse(response, normalized.format);
  }
  const parsed = parseDataSource(normalized, decoded?.text);
  original ??= { kind: "text", text: decoded.text };
  const provenance = decoded === undefined
    ? { parserVersion: "rows@1", format: "rows", contentHash: hash(original.values), hashKind: "encoded-rows" }
    : { parserVersion: `${normalized.format}@1`, format: normalized.format, contentHash: contentDigest(decoded.text),
      hashKind: "utf8-bytes", mimeType: decoded.mimeType, encoding: "utf-8", byteLength: decoded.byteLength };
  return cloneAndFreeze({ request, ...parsed, original, provenance });
}

// Commit/restore boundaries can validate this without re-fetching anything.
// The caller supplies the current request identity, never a global cache.
export function validatePreparedDataSource(prepared, expected) {
  exact(prepared, ["request", "values", "schema", "original", "provenance"], "Prepared data source");
  exact(expected, ["requestToken", "inputHash"], "Expected data request");
  validateSourceRows([{ prepared }], { maxDepth: 256 });
  const { request, original, provenance } = prepared;
  if (typeof expected.requestToken !== "string" || typeof expected.inputHash !== "string" ||
      request.requestToken !== expected.requestToken || request.inputHash !== expected.inputHash || requestHash(request) !== request.inputHash) {
    throw annotateError(new Error("Prepared data source is stale or its request has changed."), { code: "stale-result" });
  }
  const replay = parseDataSource(request.source, original.kind === "text" ? original.text : undefined);
  if (hash(replay.values) !== hash(prepared.values) || hash(replay.schema) !== hash(prepared.schema)) throw new Error("Prepared data values or schema do not match retained source.");
  if (original.kind === "text") {
    const decoded = decodeResponse({ text: original.text, mimeType: provenance.mimeType, encoding: provenance.encoding }, request.source.format);
    if (provenance.hashKind !== "utf8-bytes" || provenance.parserVersion !== `${request.source.format}@1` || provenance.format !== request.source.format ||
        provenance.contentHash !== contentDigest(decoded.text) || provenance.byteLength !== decoded.byteLength) throw new Error("Prepared data source text provenance is invalid.");
  } else if (original.kind !== "rows" || provenance.hashKind !== "encoded-rows" || provenance.format !== "rows" || provenance.parserVersion !== "rows@1" ||
      hash(original.values) !== hash(request.source.values) || provenance.contentHash !== hash(original.values)) throw new Error("Prepared data source row provenance is invalid.");
  return prepared;
}
