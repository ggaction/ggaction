export { validateConditionalDependencies } from "./conditionalState.js";
import { validateRowReference } from "../core/rowReference.js";
import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { annotateError } from "../core/diagnostics.js";
import { validateUserId } from "../core/identifiers.js";
import { validateWorkLimit } from "../core/validation.js";
import { canonicalJSON, contentDigest } from "../core/contentDigest.js";
import { normalizeSelectionSelector, validateSelectionExpression } from "../grammar/selectionExpression.js";
import { inspectPredicateExpression } from "../grammar/expressionAst.js";
import { validateExpressionParameterInputs } from "../grammar/expressionInputs.js";
import { encodeValue } from "../core/valueEncoding.js";
import { resolveInputReference, resolveRowReference } from "../selectors/resources.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateParameterResource, parameterEnvironment } from "../grammar/parameter.js";
import { validateDataSourceResource } from "./dataSourceState.js";
import { STORED_RESOURCE_KINDS, validateInputReference, validateResourceRevision } from "../core/resourceReference.js";
import { getBuiltinResourceKindHandler } from "./resourceKinds.js";
import { layerResourceBindings, coordinateResourceBindings, fontMetricResourceBindings } from "../core/resourceReferences.js";
import { normalizeFontMetricProfile } from "../core/textMetricProfile.js";

export { STORED_RESOURCE_KINDS, validateInputReference } from "../core/resourceReference.js";
const identity = ref => JSON.stringify([ref.kind, ref.id]);

function error(message, code = "invalid-value", details = {}) {
  return annotateError(new Error(message), { code, ...details });
}

function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw error(`${label} requires its exact stored fields.`);
  }
}

export function validateStoredResource(resource, ProgramClass) {
  exact(resource, ["kind", "id", "revision", "algorithmVersion", "ownership", "inputs", "options", "result", "provenance"], "Resource");
  if (!STORED_RESOURCE_KINDS.includes(resource.kind)) throw error("Unsupported resource kind.", "unsupported-format");
  validateUserId(resource.id, "Resource id"); validateResourceRevision(resource.revision);
  if (resource.algorithmVersion !== "1") throw error("Unsupported resource algorithm version.", "unsupported-format");
  const ownership = resource.ownership;
  ownRecord(ownership, "Resource ownership");
  exact(ownership, ownership?.mode === "generated" ? ["mode", "owner"] : ["mode"], "Resource ownership");
  if (!["authored", "generated"].includes(ownership.mode)) throw error("Unsupported resource ownership.");
  if (ownership.mode === "generated") validateInputReference(ownership.owner);
  if (!Array.isArray(resource.inputs)) throw error("Resource inputs must be an array.");
  ownArray(resource.inputs, "Resource inputs");
  resource.inputs.forEach(validateInputReference);
  if (new Set(resource.inputs.map(identity)).size !== resource.inputs.length) throw error("Duplicate resource input.", "ambiguous-identity");
  if (resource.kind === "parameter") return validateParameterResource(resource);
  if (resource.kind === "data-source") return validateDataSourceResource(resource);
  if (resource.kind !== "persistent-selection") {
    const handler = getBuiltinResourceKindHandler(ProgramClass, resource.kind);
    if (handler === undefined) throw error("Resource kind is not registered for this program constructor.", "unsupported-format");
    validateResourceProvenance(resource);
    handler.validateStored(resource);
    return resource;
  }
  exact(resource.result, [], "Persistent selection result");
  const options = resource.options;
  if (options?.mode === "item-keys") {
    exact(options, ["mode", "itemKeys", "empty", ...(Object.hasOwn(options, "screenPolygon") ? ["screenPolygon"] : []), ...(Object.hasOwn(options, "screenAngles") ? ["screenAngles"] : [])], "Logical item selection");
    const selector = { items: options.itemKeys, empty: options.empty, ...(Object.hasOwn(options, "screenPolygon") ? { screenPolygon: options.screenPolygon } : {}), ...(Object.hasOwn(options, "screenAngles") ? { screenAngles: options.screenAngles } : {}) };
    const { grain: _grain, ...normalized } = normalizeSelectionSelector(selector);
    if (canonicalJSON(normalized) !== canonicalJSON(selector)) {
      throw error("Selection item keys and empty policy must be normalized.");
    }
  } else if (options?.mode === "predicate") {
    exact(options, ["mode", "predicate"], "Predicate selection");
    if (Object.hasOwn(options.predicate, "grain") || Object.hasOwn(options.predicate, "rows") || Object.hasOwn(options.predicate, "items") || Object.hasOwn(options.predicate, "empty")) throw error("Selection projection belongs to its target configuration.");
    const { grain: _grain, ...normalized } = normalizeSelectionSelector(options.predicate);
    if (canonicalJSON(normalized) !== canonicalJSON(options.predicate)) throw error("Selection predicate must be normalized.");
    if (Object.hasOwn(normalized, "where")) validateExpressionParameterInputs(resource.inputs,
      inspectPredicateExpression(normalized.where).parameters, "Selection expression");
  } else if (options?.mode === "row-keys") {
    exact(options, ["mode", "logicalDataId", "rowKeys"], "Row-key selection");
    if (typeof options.logicalDataId !== "string" || !options.logicalDataId || !Array.isArray(options.rowKeys) ||
        options.rowKeys.some(key => typeof key !== "string" || !key) || new Set(options.rowKeys).size !== options.rowKeys.length) {
      throw error("Selection requires unique row keys and logical data identity.");
    }
  } else throw error("Unsupported persistent selection mode.");
  validateResourceProvenance(resource);
  return resource;
}

function validateResourceProvenance(resource) {
  exact(resource.provenance, Object.hasOwn(resource.provenance ?? {}, "sourceRows") ? ["origin", "sourceRows"] : ["origin"], "Resource provenance");
  if (!["authored", "observed", "inferred"].includes(resource.provenance.origin)) throw error("Unsupported resource provenance origin.");
  if (resource.provenance.sourceRows !== undefined && !Array.isArray(resource.provenance.sourceRows)) throw error("Resource sourceRows must be an array.");
  resource.provenance.sourceRows?.forEach(validateRowReference);
}

export function resourceDependencies(resource) {
  return [...resource.inputs, ...(resource.ownership.mode === "generated" ? [resource.ownership.owner] : [])];
}

export function validateResourceGraph(program, ProgramClass = program.constructor) {
  if (program.materializationConfigs?.textMetrics?.schemaVersion === 2) normalizeFontMetricProfile(program.materializationConfigs?.textMetrics);
  const resources = program.semanticSpec.resources;
  if (!Array.isArray(resources)) throw error("Semantic resources must be an array.");
  validateWorkLimit(resources.length, "Resource count");
  const byId = new Map();
  for (const resource of resources) {
    validateStoredResource(resource, ProgramClass);
    if (resource.kind === "data-source") resolveInputReference(program, resource.result.data);
    resource.provenance.sourceRows?.forEach(ref => resolveRowReference(program, ref));
    const key = identity(resource);
    if (byId.has(key)) throw error("Duplicate resource identity.", "duplicate-id", { resourceId: resource.id });
    byId.set(key, resource);
  }
  let work = 0;
  for (const resource of resources) for (const ref of resourceDependencies(resource)) {
    validateWorkLimit(++work, "Resource dependency work");
    resolveInputReference(program, ref);
  }
  for (const resource of resources) {
    if (resource.kind === "persistent-selection" && resource.options.mode === "predicate" &&
        Object.hasOwn(resource.options.predicate, "where")) {
      validateSelectionExpression(resource.options.predicate.where, parameterEnvironment(resource.inputs.map(ref =>
        resolveInputReference(program, ref))));
    }
  }
  orderResourceDependencies(resources);
  for (const layer of program.semanticSpec.layers ?? []) for (const { kind, ref } of layerResourceBindings(layer)) {
    validateWorkLimit(++work, "Resource dependency work");
    validateInputReference(ref);
    if (ref.kind !== kind) throw error("Layer binding has an incompatible resource kind.", "incompatible-resource", { ownerId: layer.id });
    resolveInputReference(program, ref);
  }
  for (const { ref } of fontMetricResourceBindings(program)) resolveInputReference(program, ref);
  const geographicCoordinates = new Set();
  for (const coordinate of program.semanticSpec.coordinates ?? []) for (const { kind, ref } of coordinateResourceBindings(coordinate)) {
    validateWorkLimit(++work, "Resource dependency work");
    exact(coordinate, ["id", "type", "projection"], "Geo coordinate");
    if (coordinate.type !== "geo") throw error("Projection bindings require a Geo coordinate.");
    validateInputReference(ref);
    if (ref.kind !== kind) throw error("Geo coordinate requires a projection reference.");
    resolveInputReference(program, ref);
    geographicCoordinates.add(coordinate.id);
  }
  for (const layer of program.semanticSpec.layers ?? []) {
    if (geographicCoordinates.has(layer.coordinate) !== (layer.mark?.type === "geo")) throw error("Geo coordinates require geographic marks and exact coordinate bindings.");
  }
  for (const resource of resources) getBuiltinResourceKindHandler(ProgramClass, resource.kind)?.validateBindings(program, resource);
}

// Iterative postorder keeps a valid deep DAG within the work budget and avoids
// host call-stack limits during restoration and atomic revision planning.
export function orderResourceDependencies(resources) {
  const byId = new Map(resources.map(resource => [identity(resource), resource]));
  const visited = new Set(), active = new Set(), ordered = [];
  let work = 0;
  for (const root of resources) {
    const stack = [{ resource: root, done: false }];
    while (stack.length) {
      const { resource, done } = stack.pop(), key = identity(resource);
      if (visited.has(key)) continue;
      if (done) { active.delete(key); visited.add(key); ordered.push(resource); continue; }
      if (active.has(key)) throw error("Cyclic resource dependency.", "cyclic-dependency", { ownerId: resource.id });
      active.add(key); stack.push({ resource, done: true });
      for (const ref of resourceDependencies(resource)) {
        validateWorkLimit(++work, "Resource dependency work");
        const dependency = ref.kind === "data" ? undefined : byId.get(identity(ref));
        if (dependency) stack.push({ resource: dependency, done: false });
      }
    }
  }
  return ordered;
}

function inputFingerprint(program, refs) {
  return contentDigest(canonicalJSON(encodeValue(refs.map(ref => resolveInputReference(program, ref)))));
}

export function prepareResourceResult(program, resource) {
  validateStoredResource(resource, program.constructor);
  const sourceRevisionVector = cloneAndFreeze(resourceDependencies(resource));
  const inputHash = inputFingerprint(program, sourceRevisionVector);
  getBuiltinResourceKindHandler(program.constructor, resource.kind)?.validateBindings(program, resource);
  return cloneAndFreeze({ resource, sourceRevisionVector, inputHash });
}

export function validatePreparedResource(program, prepared) {
  validateStoredResource(prepared.resource, program.constructor);
  if (canonicalJSON(resourceDependencies(prepared.resource)) !== canonicalJSON(prepared.sourceRevisionVector)) {
    throw error("Prepared resource dependency vector does not match its inputs.", "stale-result", { ownerId: prepared.resource.id });
  }
  if (inputFingerprint(program, prepared.sourceRevisionVector) !== prepared.inputHash) {
    throw error("Prepared resource inputs have changed.", "stale-result", { ownerId: prepared.resource.id });
  }
  getBuiltinResourceKindHandler(program.constructor, prepared.resource.kind)?.validateBindings(program, prepared.resource);
  return prepared.resource;
}

// Facet and repeat retain source snapshots in their child units. Concat child
// resources have independent namespaces and are deliberately not traversed.
export function collectParameterInputReferences(program) {
  const references = [], pending = [{ program, scope: [] }];
  let work = 0;
  while (pending.length) {
    const { program: unit, scope } = pending.pop();
    validateWorkLimit(++work, "Parameter dependency work");
    for (const [resourceIndex, resource] of unit.semanticSpec.resources.entries()) {
      validateWorkLimit(++work, "Parameter dependency work");
      if (resource.kind !== "data-source") continue;
      for (const [inputIndex, ref] of resource.inputs.entries()) {
        validateWorkLimit(++work, "Parameter dependency work");
        validateInputReference(ref);
        references.push(freezeOwned({ ...ref, ownerId: resource.id, ownerKind: "data-source", scope: freezeOwned([...scope]),
          path: freezeOwned(["semanticSpec", "resources", resourceIndex, "inputs", inputIndex]) }));
      }
    }
    for (const [datasetIndex, dataset] of unit.semanticSpec.datasets.entries()) {
      validateWorkLimit(++work, "Parameter dependency work");
      for (const [transformIndex, transform] of (dataset.transform ?? []).entries()) {
        for (const [inputIndex, ref] of (transform.parameterInputs ?? []).entries()) {
          validateWorkLimit(++work, "Parameter dependency work");
          validateInputReference(ref);
          if (ref.kind !== "parameter") throw error("Expression parameter inputs require parameter references.");
          references.push(freezeOwned({ ...ref, ownerId: dataset.id, scope: freezeOwned([...scope]),
            path: freezeOwned(["semanticSpec", "datasets", datasetIndex, "transform", transformIndex, "parameterInputs", inputIndex]) }));
        }
      }
    }
    for (const [layerIndex, layer] of unit.semanticSpec.layers.entries()) {
      for (const [channel, definition] of Object.entries(layer.conditionals ?? {})) {
        for (const [inputIndex, ref] of definition.parameterInputs.entries()) {
          validateWorkLimit(++work, "Parameter dependency work");
          validateInputReference(ref);
          references.push(freezeOwned({ ...ref, ownerId: layer.id, scope: freezeOwned([...scope]),
            path: freezeOwned(["semanticSpec", "layers", layerIndex, "conditionals", channel, "parameterInputs", inputIndex]) }));
        }
      }
    }
    if (unit.compositionSpec?.type === "facet") {
      for (const id of [...unit.compositionSpec.children].reverse()) {
        const child = unit.children[id];
        if (child !== undefined) pending.push({ program: child, scope: [...scope, id] });
      }
    }
  }
  return freezeOwned(references);
}

export function planStoredResourceRemoval(program, requested, { cascade = false } = {}) {
  for (const coordinate of program.semanticSpec.coordinates ?? []) if (coordinateResourceBindings(coordinate).some(({ ref }) => ref?.kind === requested.kind && ref.id === requested.id)) {
    throw error("Resource is referenced by a live coordinate.", "resource-in-use", { resourceId: requested.id, dependencies: [coordinate.id] });
  }
  if (fontMetricResourceBindings(program).some(({ ref }) => ref.kind === requested.kind && ref.id === requested.id)) {
    throw error("Resource is referenced by an active font metric profile.", "resource-in-use", { resourceId: requested.id });
  }
  if (requested.kind === "parameter") {
    const references = collectParameterInputReferences(program).filter(ref => ref.id === requested.id);
    if (references.length) throw error("Parameter is referenced by live expression datasets.", "resource-in-use", {
      resourceId: requested.id, dependencies: [...new Set(references.map(ref => [...ref.scope, ref.ownerId].join("/")))].slice(0, 16)
    });
  }
  for (const layer of program.semanticSpec.layers) {
    if (Object.values(layer.conditionals ?? {}).some(definition =>
      definition.selectionInputs.some(input => input.kind === requested.kind && input.id === requested.id))) {
      throw error("Resource is referenced by a live conditional encoding.", "resource-in-use", { resourceId: requested.id });
    }
  }
  const remove = new Set([identity(requested)]), resources = program.semanticSpec.resources;
  let changed, work = 0;
  do {
    changed = false;
    for (const resource of resources) {
      validateWorkLimit(++work, "Resource removal work");
      if (remove.has(identity(resource))) continue;
      if (!resourceDependencies(resource).some(ref => remove.has(identity(ref)))) continue;
      if (!cascade || resource.ownership.mode !== "generated" || !remove.has(identity(resource.ownership.owner))) {
        throw error("Resource is referenced by a live dependent.", "resource-in-use", { resourceId: requested.id, dependencies: [resource.id] });
      }
      remove.add(identity(resource)); changed = true;
    }
  } while (changed);
  for (const layer of program.semanticSpec.layers) {
    if (layerResourceBindings(layer).some(({ ref }) => remove.has(identity(ref)))) {
      throw error("Resource is referenced by a live mark.", "resource-in-use", { resourceId: requested.id, dependencies: [layer.id] });
    }
  }
  return resources.filter(resource => remove.has(identity(resource)));
}

export { validateMarkVisibilityState } from "./markVisibility.js";
