import { canonicalJSON, contentDigest } from "../core/contentDigest.js";
import { ownRecord } from "../core/ownData.js";
import { encodeValue } from "../core/valueEncoding.js";
import { validateWorkLimit } from "../core/validation.js";
import { parseDataSource, validateSourceRows } from "./dataSource.js";

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw new TypeError(`${label} requires its exact stored fields.`);
  }
}

export function dataSourceValueHash(value) {
  return contentDigest(canonicalJSON(encodeValue(value)));
}

export function utf8DataText(text) {
  if (typeof text !== "string") throw new TypeError("Data source text must be a string.");
  validateWorkLimit(text.length, "Data source text length");
  const bytes = new TextEncoder().encode(text);
  if (new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) !== text) {
    throw new TypeError("Data source text contains invalid Unicode.");
  }
  return { text, byteLength: bytes.length };
}

export function decodeDataPayload(response, format) {
  ownRecord(response, "Data source response");
  if (Object.keys(response).some(key => !["text", "bytes", "mimeType", "encoding"].includes(key))) {
    throw new TypeError("Data source response contains unsupported properties.");
  }
  if (response.encoding !== "utf-8") throw new TypeError("Data source response requires utf-8 encoding.");
  if (typeof response.mimeType !== "string") throw new TypeError("Data source response requires MIME type.");
  const parts = response.mimeType.toLowerCase().split(";").map(part => part.trim());
  const mimeType = parts[0];
  const validMime = format === "csv" ? ["text/csv", "application/csv"].includes(mimeType)
    : format === "json" && (mimeType === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(mimeType));
  if (!validMime || parts.slice(1).some(part => part !== "charset=utf-8" && part !== 'charset="utf-8"')) {
    throw new TypeError("Data source MIME type or charset does not match its declared format.");
  }
  if (Object.hasOwn(response, "text") === Object.hasOwn(response, "bytes")) {
    throw new TypeError("Data source response requires exactly one of text or bytes.");
  }
  let decoded;
  if (Object.hasOwn(response, "text")) decoded = utf8DataText(response.text);
  else {
    if (!(response.bytes instanceof Uint8Array)) throw new TypeError("Data source response bytes must be Uint8Array.");
    validateWorkLimit(response.bytes.byteLength, "Data source byte length");
    const bytes = new Uint8Array(response.bytes);
    try {
      decoded = { text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes), byteLength: bytes.length };
    } catch {
      throw new TypeError("Data source bytes contain invalid UTF-8.");
    }
  }
  return { ...decoded, mimeType };
}

// This boundary consumes retained values only. It never evaluates URL
// expressions, invokes a loader, or materializes a chart.
export function validateDataSourcePayload(payload) {
  exact(payload, ["source", "values", "schema", "original", "provenance"], "Data source payload");
  validateSourceRows([{ payload }], { maxDepth: 256 });
  const { source, values, schema, original, provenance } = payload;
  exact(original, original.kind === "text" ? ["kind", "text"] : ["kind", "values"], "Data source original");
  if (!["text", "rows"].includes(original.kind)) throw new TypeError("Unsupported data source original kind.");
  const replay = parseDataSource(source, original.kind === "text" ? original.text : undefined);
  if (dataSourceValueHash(replay.values) !== dataSourceValueHash(values) ||
      dataSourceValueHash(replay.schema) !== dataSourceValueHash(schema)) {
    throw new Error("Prepared data values or schema do not match retained source.");
  }
  if (original.kind === "text") {
    exact(provenance, ["parserVersion", "format", "contentHash", "hashKind", "mimeType", "encoding", "byteLength"], "Data source text provenance");
    const decoded = decodeDataPayload({ text: original.text, mimeType: provenance.mimeType, encoding: provenance.encoding }, source.format);
    if (Object.hasOwn(source, "values") || provenance.hashKind !== "utf8-bytes" ||
        provenance.parserVersion !== `${source.format}@1` || provenance.format !== source.format ||
        provenance.mimeType !== decoded.mimeType || provenance.contentHash !== contentDigest(decoded.text) ||
        provenance.byteLength !== decoded.byteLength) {
      throw new Error("Prepared data source text provenance is invalid.");
    }
  } else {
    exact(provenance, ["parserVersion", "format", "contentHash", "hashKind"], "Data source row provenance");
    if (source.kind !== "inline" || !Object.hasOwn(source, "values") ||
        provenance.hashKind !== "encoded-rows" || provenance.format !== "rows" || provenance.parserVersion !== "rows@1" ||
        dataSourceValueHash(original.values) !== dataSourceValueHash(source.values) ||
        provenance.contentHash !== dataSourceValueHash(original.values)) {
      throw new Error("Prepared data source row provenance is invalid.");
    }
  }
  return payload;
}
