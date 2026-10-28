import { annotateError } from "../core/diagnostics.js";
import { validateUserId } from "../core/identifiers.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { createSourceIdentity, validateSourceIdentity } from "../core/itemIdentity.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateWorkLimit } from "../core/validation.js";
import { normalizeDataSource, parseDataSource, validateSourceRows } from "../grammar/dataSource.js";
import { dataSourceValueHash, validateDataSourcePayload } from "../grammar/dataSourcePayload.js";
import { dataSourceRequestHash } from "../grammar/dataSourceRequest.js";
import { inspectExpressionV2, normalizeExpressionV2 } from "../grammar/expressionAst.js";
import { parameterEnvironment } from "../grammar/parameter.js";
import { dataInputReference, resolveInputReference } from "../selectors/resources.js";
import { validateInputReference } from "../core/resourceReference.js";

function record(value, required, optional, label) {
  ownRecord(value, label);
  if (required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw new TypeError(`${label} has missing or unsupported fields.`);
  }
  for (const key of Object.keys(value)) if (value[key] === undefined) {
    throw new TypeError(`${label} cannot contain undefined.`);
  }
}

function same(left, right) { return dataSourceValueHash(left) === dataSourceValueHash(right); }
function stale(message, id) {
  throw annotateError(new Error(message), { code: "stale-result", resourceId: id });
}
function absoluteURL(value, label) {
  if (typeof value !== "string" || !value) throw new TypeError(`${label} requires an absolute URL.`);
  validateWorkLimit(value.length, `${label} length`);
  try { return new URL(value).href; } catch { throw new TypeError(`${label} requires an absolute URL.`); }
}
function keyPolicy(options) {
  return createSourceIdentity([], options, { logicalId: "source-policy", allocationId: "source-policy" }).keySpec;
}

export function normalizeDataSourceOptions(source, options = {}) {
  record(options, [], ["baseURL", "keyField", "keyFields"], "Data source options");
  validateSourceRows([{ options }]);
  const normalized = normalizeDataSource(source);
  if (normalized.kind === "url" && typeof normalized.url !== "string") inspectExpressionV2(normalized.url);
  keyPolicy(options);
  return cloneAndFreeze({ source: normalized,
    ...(options.baseURL === undefined ? {} : { baseURL: absoluteURL(options.baseURL, "Data baseURL") }),
    ...(options.keyField === undefined ? {} : { keyField: options.keyField }),
    ...(options.keyFields === undefined ? {} : { keyFields: options.keyFields }) });
}

function parsingOptions(source) {
  return Object.fromEntries(["format", "delimiter", "parse", "schema"]
    .filter(key => Object.hasOwn(source, key)).map(key => [key, source[key]]));
}

export function createDataSourceReceipt(prepared, { sourceId }) {
  validateUserId(sourceId, "Data source id");
  validateDataSourcePayload({ source: prepared.request.source, values: prepared.values,
    schema: prepared.schema, original: prepared.original, provenance: prepared.provenance });
  const source = prepared.request.source;
  return cloneAndFreeze({ sourceId, parsing: parsingOptions(source),
    ...(source.kind === "url" ? { resolvedURL: prepared.request.resolvedURL } : {}),
    ...(source.kind === "named" ? { name: source.name } : {}),
    original: prepared.original, provenance: prepared.provenance });
}

// Receipt validation is independent of live parameters and resource existence.
// Historical snapshots retain their own parsing decisions and actual contents.
export function validateDataSourceReceipt(receipt, dataset) {
  record(receipt, ["sourceId", "parsing", "original", "provenance"], ["resolvedURL", "name"], "Data source receipt");
  validateSourceRows([{ receipt }], { maxDepth: 256 });
  validateUserId(receipt.sourceId, "Data source receipt id");
  record(receipt.parsing, ["parse"], ["format", "delimiter", "schema"], "Data source parsing");
  if (Object.hasOwn(receipt, "resolvedURL") && Object.hasOwn(receipt, "name")) {
    throw new TypeError("A data source receipt cannot identify both a URL and a name.");
  }
  if (receipt.resolvedURL !== undefined && absoluteURL(receipt.resolvedURL, "Resolved data URL") !== receipt.resolvedURL) {
    throw new TypeError("Resolved data URL must be canonical.");
  }
  if (receipt.name !== undefined && (typeof receipt.name !== "string" || !receipt.name)) {
    throw new TypeError("Data source receipt name must be nonempty.");
  }
  const original = receipt.original;
  record(original, original.kind === "rows" ? ["kind", "values"] : ["kind", "text"], [], "Data source original");
  if (!["text", "rows"].includes(original.kind)) throw new TypeError("Unsupported data source original kind.");
  if (original.kind === "rows" && (receipt.resolvedURL !== undefined || receipt.name !== undefined)) {
    throw new TypeError("Authored rows cannot claim a received URL or named payload.");
  }
  const source = normalizeDataSource({ kind: "inline", ...receipt.parsing,
    ...(original.kind === "rows" ? { values: original.values } : { text: original.text }) });
  if (!same(parsingOptions(source), receipt.parsing)) throw new TypeError("Data source parsing must be normalized.");
  const parsed = parseDataSource(source, original.kind === "text" ? original.text : undefined);
  validateDataSourcePayload({ source, ...parsed, original, provenance: receipt.provenance });
  if (dataset !== undefined) {
    if (dataset.source !== undefined || dataset.transform !== undefined) {
      throw new TypeError("Source receipts belong only to original datasets.");
    }
    if (dataset.values !== undefined && (!same(dataset.values, parsed.values) || !same(dataset.schema, parsed.schema))) {
      stale("Dataset values or schema do not match its source receipt.", dataset.id);
    }
  }
  return parsed;
}

// Generic envelope, graph and exact input-reference validation stay in the
// stored-resource owner; this function owns only data-source-specific shape.
export function validateDataSourceResource(resource) {
  record(resource.options, ["source"], ["baseURL", "keyField", "keyFields"], "Data source options");
  const { source, ...options } = resource.options;
  const normalized = normalizeDataSourceOptions(source, options);
  if (!same(normalized, resource.options)) throw new TypeError("Stored data source options must be normalized.");
  record(resource.ownership, ["mode"], [], "Data source ownership");
  if (resource.ownership.mode !== "authored") throw new TypeError("Data sources require authored ownership.");
  ownArray(resource.inputs, "Data source inputs");
  const ids = source.kind === "url" && typeof source.url !== "string" ? inspectExpressionV2(source.url).parameters : [];
  if (resource.inputs.length !== ids.length || resource.inputs.some((ref, index) =>
    ref.kind !== "parameter" || ref.id !== ids[index])) {
    throw new TypeError("Data source inputs must contain every URL parameter in exact occurrence order.");
  }
  record(resource.result, ["data", "inputHash"], [], "Data source result");
  validateInputReference(resource.result.data);
  if (resource.result.data.kind !== "data" || typeof resource.result.inputHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(resource.result.inputHash)) throw new TypeError("Data source result requires an exact output and request hash.");
  record(resource.provenance, ["origin"], [], "Data source provenance");
  if (resource.provenance.origin !== "authored") throw new TypeError("Data source provenance must be authored.");
  return resource;
}

export function createDataSourceResource({ id, revision = 0, options, prepared, dataset }) {
  validateUserId(id, "Data source id");
  if (!Number.isSafeInteger(revision) || revision < 0) throw new TypeError("Data source revision must be a non-negative safe integer.");
  validateSourceIdentity(dataset);
  const resource = cloneAndFreeze({ kind: "data-source", id, revision, algorithmVersion: "1",
    ownership: { mode: "authored" }, inputs: prepared.request.parameterInputs, options,
    result: { data: dataInputReference(dataset), inputHash: prepared.request.inputHash },
    provenance: { origin: "authored" } });
  validateDataSourceResource(resource);
  if (!same(options.source, prepared.request.source) || options.baseURL !== prepared.request.baseURL) {
    throw new TypeError("Data source request does not match its stored intent.");
  }
  return resource;
}

export function dataSourcesForDataset(program, dataset) {
  const reference = dataInputReference(dataset);
  return Object.freeze((program.semanticSpec.resources ?? []).filter(resource =>
    resource.kind === "data-source" && same(resource.result.data, reference)));
}

function validateUnit(program) {
  const receipts = new Map();
  for (const dataset of program.semanticSpec.datasets) if (dataset.sourceReceipt !== undefined) {
    receipts.set(dataset.id, validateDataSourceReceipt(dataset.sourceReceipt, dataset));
  }
  const outputs = new Set();
  for (const resource of program.semanticSpec.resources) {
    if (resource.kind !== "data-source") continue;
    validateDataSourceResource(resource);
    const dataset = resolveInputReference(program, resource.result.data);
    const receipt = dataset.sourceReceipt;
    if (outputs.has(dataset.id)) throw new TypeError("A dataset cannot have multiple live data source bindings.");
    outputs.add(dataset.id);
    if (receipt === undefined || receipt.sourceId !== resource.id || !receipts.has(dataset.id)) {
      stale("Live data source requires its exact original dataset receipt.", resource.id);
    }
    if (!same(dataset.keySpec, keyPolicy(resource.options))) stale("Data source output key policy has changed.", resource.id);
    const source = resource.options.source;
    if (!same(receipt.parsing, parsingOptions(source)) ||
        (source.kind === "url") !== Object.hasOwn(receipt, "resolvedURL") ||
        (source.kind === "named") !== Object.hasOwn(receipt, "name") ||
        (source.kind === "named" && source.name !== receipt.name)) {
      stale("Data source receipt does not match its live source intent.", resource.id);
    }
    if (source.kind === "inline" && !same(receipt.original,
      Object.hasOwn(source, "values") ? { kind: "rows", values: source.values } : { kind: "text", text: source.text })) {
      stale("Inline source original does not match its live source intent.", resource.id);
    }
    let parameters = {};
    if (source.kind === "url" && typeof source.url !== "string") {
      const normalized = normalizeExpressionV2(source.url, { parameters: parameterEnvironment(program.semanticSpec.resources) });
      parameters = Object.fromEntries(normalized.parameters.map(id => [id, normalized.environment.parameters[id]]));
    }
    for (const reference of resource.inputs) resolveInputReference(program, reference);
    const request = { source, parameterInputs: resource.inputs, parameters,
      ...(resource.options.baseURL === undefined ? {} : { baseURL: resource.options.baseURL }),
      ...(receipt.resolvedURL === undefined ? {} : { resolvedURL: receipt.resolvedURL }) };
    if (dataSourceRequestHash(request) !== resource.result.inputHash) stale("Live data source request hash is stale.", resource.id);
  }
}

export function validateDataSourceState(program) {
  const pending = [program];
  let work = 0;
  while (pending.length) {
    const unit = pending.pop();
    validateWorkLimit(++work, "Data source scope work");
    validateUnit(unit);
    pending.push(...Object.values(unit.children ?? {}));
  }
  return program;
}
