import { findDataset } from "./selectors/datasets.js";
import { requireLayer } from "./selectors/layers.js";
import { statisticalReferenceContributions, statisticalRows } from "./materialization/statisticalPopulation.js";
import { validateLegacyValues } from "./persistence/legacyValues.js";
import { ChartProgram } from "./ChartProgram.js";
import { BasicChartProgram } from "./BasicChartProgram.js";
import { cloneAndFreeze, freezeOwned } from "./core/immutable.js";
import { hasRegisteredExtension, isBuiltinProgramClass } from "./core/extensionRegistry.js";
import { packageVersion } from "./version.js";
import { decodeValue, encodeValue, encodeSharedValue, invalidSnapshot } from "./persistence/codec.js";
import { exactKeys, requireObject, STATE_KEYS, validateGraphic, validateProgramState, validateTrace } from "./persistence/validation.js";
import {
  deriveTransformSchema,
  datasetSchemaContext,
  inferDatasetSchema,
  validateDatasetSchema
} from "./grammar/datasetSchema.js";
import { restoreResolvedScaleBindings } from "./actions/scales/preview.js";
import { createSourceIdentity } from "./core/itemIdentity.js";
import { canonicalJSON, contentDigest } from "./core/contentDigest.js";
import { derivedIdentityBase, deriveRowLineage } from "./grammar/rowLineage.js";
import { prepareSelectionState } from "./actions/selection/resources.js";

function canonicalState(program, extensions, path = "payload") {
  if (!(program instanceof ChartProgram || program instanceof BasicChartProgram) || !isBuiltinProgramClass(program.constructor)) {
    throw invalidSnapshot(`Cannot persist an unregistered program class at ${path}.`, path);
  }
  if (program.actionStack.length !== 0) throw invalidSnapshot("Cannot persist an open actionStack.", `${path}.actionStack`);
  const state = Object.fromEntries(STATE_KEYS.map(key => [key, program[key]]));
  state.children = Object.fromEntries(Object.entries(program.children).map(([id, child]) => [id, canonicalState(child, extensions, `${path}.children.${id}`)]));
  validateTrace(program.trace, program.constructor, extensions, `${path}.trace`);
  validateProgramState(program, path);
  return state;
}

function envelope(kind, payload, extensions = []) {
  return JSON.stringify({ schemaVersion: kind === "editable" ? 4 : 1, kind, packageVersion, extensions, payload: kind === "editable" ? encodeSharedValue(payload) : encodeValue(payload) });
}

function readEnvelope(text, kind) {
  if (typeof text !== "string") throw invalidSnapshot("Snapshot must be a JSON string.", "snapshot");
  let value;
  try { value = JSON.parse(text); } catch { throw invalidSnapshot("Snapshot must be valid JSON.", "snapshot"); }
  exactKeys(value, ["schemaVersion", "kind", "packageVersion", "extensions", "payload"], "snapshot");
  const versions = kind === "editable" ? [1, 2, 3, 4] : [1];
  if (!versions.includes(value.schemaVersion) || value.kind !== kind) {
    throw invalidSnapshot(
      `Unsupported snapshot schema or kind; expected schema ${versions.join(" or ")} ${kind}.`,
      "snapshot"
    );
  }
  if (typeof value.packageVersion !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value.packageVersion)) throw invalidSnapshot("Invalid snapshot packageVersion.", "snapshot.packageVersion");
  if (!Array.isArray(value.extensions) || new Set(value.extensions).size !== value.extensions.length ||
      value.extensions.some(name => typeof name !== "string" || !hasRegisteredExtension(name)) || (kind === "graphic" && value.extensions.length)) {
    throw invalidSnapshot("Snapshot requires unknown, duplicate, or inapplicable extensions.", "snapshot.extensions");
  }
  if (value.schemaVersion < 3 && value.payload?.[0] === "shared") {
    throw invalidSnapshot("Shared array payloads require editable snapshot version 3.", "snapshot.payload");
  }
  return { ...value, ...(kind === "editable" && value.schemaVersion < 4
    ? { migrationNamespace: contentDigest(canonicalJSON(value)) } : {}), payload: decodeValue(value.payload) };
}

function restoreState(state, extensions, path = "payload", { requireSchemas = false, legacy = false } = {}) {
  exactKeys(state, STATE_KEYS, path);
  if (!Array.isArray(state.actionStack) || state.actionStack.length) throw invalidSnapshot("Snapshot actionStack must be empty.", `${path}.actionStack`);
  requireObject(state.children, `${path}.children`);
  validateTrace(state.trace, ChartProgram, extensions, `${path}.trace`);
  const children = Object.fromEntries(Object.entries(state.children).map(([id, child]) => [id, restoreState(
    child,
    extensions,
    `${path}.children.${id}`,
    { requireSchemas, legacy }
  )]));
  const program = new ChartProgram({ ...state, children });
  validateProgramState(program, path, { allowMissingLookupSchemas: !requireSchemas, legacy });
  if (requireSchemas) {
    for (const dataset of program.semanticSpec.datasets) {
      if (dataset.schema === undefined) {
        throw invalidSnapshot(`Dataset "${dataset.id}" requires schema in editable snapshot version 2 or later.`, `${path}.semanticSpec.datasets`);
      }
      validateDatasetSchema(dataset.schema);
    }
  }
  return legacy ? program : restoreResolvedScaleBindings(program);
}

function migrateStateSchemas(state) {
  const datasets = state.semanticSpec.datasets;
  const byId = new Map(datasets.map(dataset => [dataset.id, dataset]));
  const schemas = new Map();
  const active = new Set();
  function schemaFor(id) {
    if (schemas.has(id)) return schemas.get(id);
    if (active.has(id)) throw invalidSnapshot(`Cyclic data source "${id}".`, "payload.semanticSpec.datasets");
    active.add(id);
    const dataset = byId.get(id);
    let schema;
    if (dataset.schema !== undefined) {
      schema = validateDatasetSchema(dataset.schema);
    } else if (dataset.source === undefined) {
      schema = inferDatasetSchema(dataset.values ?? []);
    } else {
      const sourceSchema = schemaFor(dataset.source);
      schema = deriveTransformSchema(
        sourceSchema,
        dataset.transform?.[0] ?? {},
        dataset.values,
        datasetSchemaContext({...byId.get(dataset.source),schema:sourceSchema},dataset.transform?.[0]??{},dataset.id,
          input=>({...byId.get(input),schema:schemaFor(input)}))
      );
    }
    active.delete(id);
    schemas.set(id, schema);
    return schema;
  }
  const semanticSpec = {
    ...state.semanticSpec,
    datasets: datasets.map(dataset => ({ ...dataset, schema: schemaFor(dataset.id) }))
  };
  return {
    ...state,
    semanticSpec,
    children: Object.fromEntries(Object.entries(state.children).map(
      ([id, child]) => [id, migrateStateSchemas(child)]
    ))
  };
}

export function serializeProgram(program) {
  const extensions = new Set();
  return envelope("editable", canonicalState(program, extensions), [...extensions].sort());
}

function migrateStateIdentities(state, namespace, childPath = []) {
  const byId = new Map(state.semanticSpec.datasets.map(dataset => [dataset.id, dataset]));
  const migrated = new Map(), active = new Set();
  function migrate(id) {
    if (migrated.has(id)) return migrated.get(id);
    if (active.has(id)) throw invalidSnapshot("Cyclic dataset identity migration.", "payload.semanticSpec.datasets");
    active.add(id);
    const dataset = byId.get(id);
    if (dataset === undefined) throw invalidSnapshot("Missing dataset during identity migration.", "payload.semanticSpec.datasets");
    let result = dataset;
    if (dataset.source === undefined && Array.isArray(dataset.values)) {
      const identity = `legacy:${contentDigest(JSON.stringify([namespace, childPath, dataset.id]))}`;
      result = { ...dataset, ...createSourceIdentity(dataset.values, {}, { logicalId: identity, allocationId: identity }) };
    } else if (dataset.source !== undefined) {
      const source = migrate(dataset.source), transform = dataset.transform?.[0];
      result = { ...dataset, ...derivedIdentityBase(source, dataset.id) };
      if (dataset.values !== undefined) {
        if (transform.type === "statisticalReference") {
          const config = state.materializationConfigs.marks[transform.target].statisticalReference;
          const layer = requireLayer(state, config.source);
          migrate(layer.data);
        }
        const snapshotView = { ...state, markConfigs: state.materializationConfigs.marks,
          semanticSpec: { ...state.semanticSpec, datasets: state.semanticSpec.datasets.map(dataset => {
            if (migrated.has(dataset.id)) return migrated.get(dataset.id);
            const { values: _unmigrated, ...definition } = dataset;
            return definition;
          }) } };
        const view = migrateSelectionState(snapshotView, state.materializationConfigs.selections, { partial: true });
        const lookup = transform.type === "lookup" ? migrate(transform.lookup.data) : undefined;
        validateLegacyValues(dataset, source, { lookup,
          indices: state.materializationConfigs.rowProvenance?.[id]?.indices,
          regressionFit: state.materializationConfigs.regressionFits?.[source.id],
          referenceValues: transform.type === "statisticalReference" ? statisticalRows(view, transform.target) : undefined });
        result = { ...result, ...deriveRowLineage(source, dataset.values, transform, {
        indices: state.materializationConfigs.rowProvenance?.[id]?.indices,
        lookup: transform.type === "lookup" ? migrate(transform.lookup.data) : undefined,
        reference: state.materializationConfigs.marks?.[transform.target]?.statisticalReference,
        referenceRows: transform.type === "statisticalReference" ? statisticalReferenceContributions(view, transform.target) : undefined
      }) };
      }
    }
    active.delete(id); migrated.set(id, result);
    return result;
  }
  const migratedState = {
    ...state,
    semanticSpec: { ...state.semanticSpec, resources: [], datasets: state.semanticSpec.datasets.map(dataset => migrate(dataset.id)) },
    children: Object.fromEntries(Object.entries(state.children).map(([id, child]) =>
      [id, migrateStateIdentities(child, namespace, [...childPath, id])]))
  };
  return migrateSelectionState(migratedState, state.materializationConfigs.selections);
}

function migrateSelectionState(migratedState, oldSelections, { partial = false } = {}) {
  if (oldSelections === undefined) return migratedState;
  const selections = {}, resources = [];
  for (const [id, definition] of Object.entries(oldSelections)) {
    if (definition.sourceSelection) continue;
    if (partial && definition.selector.rows && !findDataset(migratedState, definition.selector.rows.data)?.rowKeys) continue;
    const prepared = prepareSelectionState(migratedState, id, definition.target, definition.selector);
    resources.push(prepared.resource); Object.defineProperty(selections, id, { value: prepared.definition, enumerable: true });
  }
  for (const [id, definition] of Object.entries(oldSelections)) {
    if (!definition.sourceSelection) continue;
    const owner = selections[definition.sourceSelection];
    if (partial && owner === undefined) continue;
    Object.defineProperty(selections, id, { enumerable: true, value: {
      target: definition.target, grain: definition.selector.grain, resource: owner.resource,
      projection: definition.selector.rows ? { data: definition.selector.rows.data } : {}, sourceSelection: definition.sourceSelection
    } });
  }
  return { ...migratedState, semanticSpec: { ...migratedState.semanticSpec, resources },
    materializationConfigs: { ...migratedState.materializationConfigs, selections,
      ...(partial ? { highlights: Object.fromEntries(Object.entries(migratedState.materializationConfigs.highlights ?? {})
        .filter(([, config]) => Object.hasOwn(selections, config.selection))) } : {}) } };
}

// Decoding creates fresh plain containers. Own them once across the whole graph
// so child constructors retain shared immutable data instead of copying each pool.
function ownDecodedState(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const child of Object.values(value)) ownDecodedState(child, seen);
  freezeOwned(value);
}

export function deserializeProgram(text) {
  const stored = readEnvelope(text, "editable");
  const extensions = new Set();
  let payload = stored.payload;
  if (stored.schemaVersion < 4) {
    // Validate the historical state before adding any inferred metadata. Migration
    // must never repair an invalid reference graph or malformed payload.
    restoreState(payload, new Set(), "payload", { requireSchemas: stored.schemaVersion >= 2, legacy: true });
    if (stored.schemaVersion === 1) payload = migrateStateSchemas(payload);
    payload = migrateStateIdentities(payload, stored.migrationNamespace);
  }
  ownDecodedState(payload);
  const program = restoreState(payload, extensions, "payload", { requireSchemas: true });
  if (extensions.size !== stored.extensions.length || stored.extensions.some(name => !extensions.has(name))) {
    throw invalidSnapshot("Snapshot extensions must exactly match its action traces.", "snapshot.extensions");
  }
  return program;
}

export function serializeGraphic(program) {
  validateGraphic(program?.graphicSpec);
  return envelope("graphic", program.graphicSpec);
}

export function deserializeGraphic(text) {
  const { payload } = readEnvelope(text, "graphic");
  validateGraphic(payload);
  return cloneAndFreeze({ graphicSpec: payload });
}
