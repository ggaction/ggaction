import { actionSource } from "../core/action.js";
import { ChartProgram } from "../core/ChartProgram.js";
import { annotateError } from "../core/diagnostics.js";
import { validateUserId } from "../core/identifiers.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { createSourceIdentity } from "../core/itemIdentity.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateKeys, validateWorkLimit } from "../core/validation.js";
import { normalizeDataSource } from "../grammar/dataSource.js";
import { createDataSourceRequest } from "../grammar/dataSourceRequest.js";
import { normalizeExpressionV2 } from "../grammar/expressionAst.js";
import { normalizeParameterEditOptions, parameterEnvironment } from "../grammar/parameter.js";
import { normalizeDataSourceOptions, validateDataSourceState } from "../materialization/dataSourceState.js";
import { hasDataset, hasDatasetOwner } from "../selectors/datasets.js";
import { findStoredResource, requireStoredResource } from "../selectors/resources.js";
import { newDatasetNamespace } from "../actions/primitives/datasetIdentity.js";
import { checkDataSourceAbort, prepareDataSourceRequest, validatePreparedDataSource } from "./resolveData.js";

const preparedUpdates = new WeakMap();

function record(value, keys, required, label) {
  ownRecord(value, label);
  validateKeys(value, keys, label);
  if (required.some(key => !Object.hasOwn(value, key)) || Object.values(value).some(item => item === undefined)) {
    throw new TypeError(`${label} has missing or undefined properties.`);
  }
}

function normalizeRequest(request, allowEdits) {
  ownRecord(request, "Data update request");
  if (request.kind === "create") {
    record(request, ["kind", "id", "source", "keyField", "keyFields"], ["kind", "id", "source"], "Data update request");
    const id = validateUserId(request.id, "Data update dataset id");
    const keyOptions = {
      ...(Object.hasOwn(request, "keyField") ? { keyField: request.keyField } : {}),
      ...(Object.hasOwn(request, "keyFields") ? { keyFields: request.keyFields } : {})
    };
    // Reuse the canonical key policy validation before any host callback.
    createSourceIdentity([], keyOptions, { logicalId: "preflight", allocationId: "preflight" });
    return cloneAndFreeze({ kind: "create", id, source: normalizeDataSource(request.source), ...keyOptions });
  }
  if (!allowEdits) throw new TypeError("Basic data preparation supports only create requests.");
  if (request.kind === "revise") {
    record(request, ["kind", "target", "id", "rowMap"], ["kind", "target", "id"], "Data update request");
    validateUserId(request.target, "Data update target");
    validateUserId(request.id, "Data update dataset id");
    if (Object.hasOwn(request, "rowMap")) {
      ownArray(request.rowMap, "Data update rowMap");
      validateWorkLimit(request.rowMap.length, "Data update rowMap length");
      if (request.rowMap.some(index => index !== null && (!Number.isSafeInteger(index) || index < 0))) {
        throw new TypeError("Data update rowMap requires nonnegative indexes or null.");
      }
    }
    return cloneAndFreeze(request);
  }
  if (request.kind === "parameter") {
    record(request, ["kind", "target", "value"], ["kind", "target", "value"], "Data update request");
    return cloneAndFreeze({ kind: "parameter", ...normalizeParameterEditOptions({ target: request.target, value: request.value }) });
  }
  throw new TypeError("Unsupported data update request kind.");
}

export function normalizeDataUpdatePreparation(program, request, host, allowEdits = false) {
  if (!(program instanceof ChartProgram)) throw new TypeError("Data preparation requires a ChartProgram.");
  const normalized = normalizeRequest(request, allowEdits);
  record(host, ["requestToken", "baseURL", "load", "resolveNamed", "signal"], ["requestToken"], "Data update host");
  if (typeof host.requestToken !== "string" || !host.requestToken) throw new TypeError("Data update requires a nonempty requestToken.");
  validateWorkLimit(host.requestToken.length, "Data request token length");
  for (const key of ["load", "resolveNamed"]) {
    if (Object.hasOwn(host, key) && typeof host[key] !== "function") throw new TypeError(`Data update ${key} must be a callback.`);
  }
  let baseURL;
  if (Object.hasOwn(host, "baseURL")) {
    if (typeof host.baseURL !== "string" || !host.baseURL) throw new TypeError("Data baseURL must be an absolute URL.");
    validateWorkLimit(host.baseURL.length, "Data baseURL length");
    try { baseURL = new URL(host.baseURL).href; }
    catch { throw new TypeError("Data baseURL must be an absolute URL."); }
  }
  checkDataSourceAbort(host.signal);
  validateDataSourceState(program);
  return { request: normalized, host: Object.freeze({ ...host, ...(baseURL === undefined ? {} : { baseURL }) }) };
}

export function prepareDataUpdateSourceRequest(source, resources, host, baseURL) {
  const parameters = parameterEnvironment(resources);
  const ids = source.kind === "url" && typeof source.url !== "string"
    ? normalizeExpressionV2(source.url, { parameters }).parameters : [];
  const scope = { semanticSpec: { resources } };
  const parameterInputs = ids.map(id => {
    const resource = requireStoredResource(scope, { kind: "parameter", id });
    return { kind: "parameter", id, revision: resource.revision };
  });
  const options = Object.freeze({ ...host, parameters, parameterInputs,
    baseURL });
  const request = createDataSourceRequest(source, options);
  if (source.kind === "url" && typeof host.load !== "function" ||
      source.kind === "named" && typeof host.resolveNamed !== "function") {
    throw new TypeError(`Data source requires explicit host ${source.kind === "url" ? "load" : "resolveNamed"} callback.`);
  }
  return { request, options };
}

export function createPreparedDataUpdate(base, request, host, payload) {
  checkDataSourceAbort(host.signal);
  const descriptor = request.kind === "create"
    ? { kind: request.kind, id: request.id, sourceKind: request.source.kind,
      ...(request.source.format === undefined ? {} : { format: request.source.format }) }
    : { kind: request.kind, target: request.target, ...(request.kind === "revise" ? { id: request.id } : {}) };
  const handle = cloneAndFreeze({ kind: "data-update", request: descriptor });
  preparedUpdates.set(handle, Object.freeze({ base, request, requestToken: host.requestToken,
    ...(host.signal === undefined ? {} : { signal: host.signal }), ...payload }));
  return handle;
}

export function readPreparedDataUpdate(enteredProgram, prepared, requestToken) {
  const payload = preparedUpdates.get(prepared);
  if (payload === undefined) throw new TypeError("Expected an authentic prepared data update.");
  if (payload.base !== actionSource(enteredProgram) || payload.requestToken !== requestToken) {
    throw annotateError(new Error("Prepared data update is stale for the current program or request token."), { code: "stale-result" });
  }
  checkDataSourceAbort(payload.signal);
  const sources = payload.prepared === undefined ? payload.plan.sources.map(source => source.prepared) : [payload.prepared];
  for (const source of sources) validatePreparedDataSource(source, {
    requestToken, inputHash: source.request.inputHash
  });
  return payload;
}

// Basic imports this create-only module. Full revision planners stay in the
// separate Full preparation entry and never enter the Basic dependency graph.
export async function prepareDataUpdate(program, request, host) {
  const normalized = normalizeDataUpdatePreparation(program, request, host);
  const input = normalized.request, options = normalized.host;
  if (program.compositionSpec !== undefined) throw new Error("Create a data source in an explicit unit chart scope.");
  if (hasDataset(program, input.id) || hasDatasetOwner(program, input.id) || findStoredResource(program, "data-source", input.id)) {
    throw new Error(`Data source or dataset "${input.id}" already exists.`);
  }
  const sourceOptions = normalizeDataSourceOptions(input.source, {
    ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
    ...(input.keyField === undefined ? {} : { keyField: input.keyField }),
    ...(input.keyFields === undefined ? {} : { keyFields: input.keyFields })
  });
  const sourceRequest = prepareDataUpdateSourceRequest(sourceOptions.source, program.semanticSpec.resources, options, sourceOptions.baseURL);
  const prepared = await prepareDataSourceRequest(sourceRequest.request, sourceRequest.options);
  checkDataSourceAbort(options.signal);
  const identity = createSourceIdentity(prepared.values, input, {
    logicalId: newDatasetNamespace(), allocationId: newDatasetNamespace()
  });
  return createPreparedDataUpdate(program, input, options, { prepared, identity, options: sourceOptions });
}
