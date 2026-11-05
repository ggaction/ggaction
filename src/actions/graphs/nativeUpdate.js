import { editLayout, resolveLayoutRouteUpdate, prepareLayoutRouteUpdate } from "../layouts/index.js";
import { editGraphData, editedObservedGraphResource } from "./resources.js";
import { editInferredGraphData, nativeInferenceResource } from "./inference.js";
import { editFlowData, editedFlowResource } from "../flow/resources.js";
import { editHierarchyData, editedHierarchyResource, planHierarchyResourceStages } from "../hierarchy/resources.js";
import { prepareGraphResourceStages } from "./layouts.js";
import { HIERARCHY_SOURCE_FIELDS } from "../../grammar/hierarchy/options.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateKeys } from "../../core/validation.js";
import { resolveGraphResource } from "../../selectors/graphs.js";
import { resolveHierarchyResource } from "../../selectors/hierarchy.js";
import { normalizeInferenceRequest } from "../../materialization/graph/inferenceRequest.js";
import { orderResourceDependencies } from "../../materialization/resourceState.js";
import { reviseData } from "../data/revise.js";
import { editDerivedData, EDIT_DERIVED_DATA_ACTIONS } from "../data/edit.js";
import { editBin2DData } from "../data/bin2d.js";
import { editRegressionStatisticsData } from "../data/regressionStatistics.js";
import { editParameter } from "../parameters/edit.js";
import { editCanvas } from "../canvas/actions.js";
import { fitCanvas } from "../canvas/fitting.js";
import { navigateProjection } from "../geo/camera.js";
import { applyDataUpdate } from "../data/sourceEdit.js";
import { filterMarks, removeMarkFilter } from "../data/filter.js";
import { requireLayer } from "../../selectors/layers.js";
import { preparedDataUpdateTarget } from "../../resources/dataUpdate.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { findDataset, requireDataset } from "../../selectors/datasets.js";
import { reviseSourceIdentity } from "../../core/itemIdentity.js";
import { newDatasetNamespace } from "../primitives/datasetIdentity.js";

// Every focused derived-data editor, keyed by its public action name.
const DERIVED_ALIASES = Object.freeze({ ...Object.fromEntries(Object.entries(EDIT_DERIVED_DATA_ACTIONS).filter(([name]) => name !== "editDerivedData")),
  editBin2DData, editRegressionStatisticsData });
// A derived owner's dataset and its current materialized revision.
function derivedSeeds(program, target) {
  if (target === undefined) return typeof program.context.currentData === "string" ? [program.context.currentData] : [];
  const ids = findDataset(program, target) === undefined ? [] : [target];
  for (const family of Object.values(program.materializationConfigs.data ?? {})) {
    const current = family !== null && typeof family === "object" && Object.hasOwn(family, target) ? family[target]?.current : undefined;
    if (typeof current === "string") ids.push(current);
  }
  return ids;
}
const REPLAYED = new Set([reviseData, editDerivedData, ...Object.values(DERIVED_ALIASES), editParameter, editCanvas, fitCanvas, navigateProjection, applyDataUpdate, filterMarks, removeMarkFilter]);

// Full owns this exact snapshot boundary. Only the existing inference registry
// may recognize its immutable handle; arbitrary objects are always deep-copied.
export function snapshotNativeRouteEdit(program, edit) {
  ownRecord(edit, "Native route edit");
  rejectUnknownProperties(edit, ["action", "args"], "native route edit");
  ownRecord(edit.args, "Native route action arguments");
  if (edit.action === "applyDataUpdate") {
    // The original data update registry owns this immutable handle identity.
    validateKeys(edit.args, ["prepared", "requestToken"], edit.action);
    preparedDataUpdateTarget(program, edit.args.prepared, edit.args.requestToken);
    return Object.freeze({ action: edit.action, args: Object.freeze({ prepared: edit.args.prepared, requestToken: edit.args.requestToken }) });
  }
  if (edit.action === "editInferredGraphData" && Object.hasOwn(edit.args, "prepared")) {
    nativeInferenceResource(program, edit.args);
    return Object.freeze({ action: edit.action, args: Object.freeze({ prepared: edit.args.prepared, requestToken: edit.args.requestToken }) });
  }
  const pending = [edit], seen = new WeakSet();
  while (pending.length) {
    const value = pending.pop();
    if (value === null || typeof value !== "object" || seen.has(value)) continue;
    if (Array.isArray(value)) ownArray(value, "Native route edit array", false);
    else ownRecord(value, "Native route edit record");
    seen.add(value); for (const child of Object.values(value)) pending.push(child);
  }
  return cloneAndFreeze(edit);
}

// Full binds this closed native owner; graph preparation imports no assembly.
export function resolveNativeRouteUpdate(program, edit) {
  let native, previous, identity, seeds = [];
  switch (edit.action) {
    case "editLayout": native = editLayout; previous = resolveLayoutRouteUpdate(program, edit.args); break;
    case "editGraphData":
      validateKeys(edit.args, ["target", "nodes", "edges", "definition"], edit.action);
      native = editGraphData; previous = resolveGraphResource(program, edit.args.target, "observed", false); break;
    case "editFlowData":
      validateKeys(edit.args, ["target", "nodes", "edges", "definition"], edit.action);
      native = editFlowData; previous = resolveGraphResource(program, edit.args.target, "observed", true); break;
    case "editHierarchyData":
      validateKeys(edit.args, ["target", "data", ...HIERARCHY_SOURCE_FIELDS], edit.action);
      native = editHierarchyData; previous = resolveHierarchyResource(program, "hierarchy", edit.args.target); break;
    case "editInferredGraphData": {
      validateKeys(edit.args, ["target", "data", "candidateGraph", "definition", "prepared", "requestToken"], edit.action);
      native = editInferredGraphData;
      const target = Object.hasOwn(edit.args, "prepared") ? nativeInferenceResource(program, edit.args).id : normalizeInferenceRequest(program, edit.args, true).id;
      previous = resolveGraphResource(program, target, "inferred"); break;
    }
    case "reviseData": {
      validateKeys(edit.args, ["source", "id", "values", "schema", "keys", "rowMap"], edit.action);
      native = reviseData;
      if (program.compositionSpec !== undefined) throw new TypeError("Native route reviseData requires a completed unit receiver.");
      const original = requireDataset(program, edit.args.source);
      previous = { kind: "data", id: original.id };
      // One row namespace for every preflight run and the final application.
      if (Array.isArray(original.values) && original.source === undefined) identity = reviseSourceIdentity(original, edit.args.values, edit.args, newDatasetNamespace());
      break;
    }
    case "editDerivedData": {
      validateKeys(edit.args, ["target", "definition", "dependents"], edit.action);
      native = editDerivedData;
      if (program.compositionSpec !== undefined) throw new TypeError("Native route editDerivedData requires a completed unit receiver.");
      seeds = derivedSeeds(program, edit.args.target);
      break;
    }
    case "editParameter": {
      validateKeys(edit.args, ["target", "value"], edit.action);
      native = editParameter;
      if (program.compositionSpec !== undefined) throw new TypeError("Native route editParameter requires a completed unit receiver.");
      previous = { kind: "parameter", id: requireStoredResource(program, { kind: "parameter", id: edit.args.target }).id };
      break;
    }
    case "editCanvas": case "fitCanvas":
      native = edit.action === "editCanvas" ? editCanvas : fitCanvas;
      if (program.compositionSpec !== undefined) throw new TypeError(`Native route ${edit.action} requires a completed unit receiver.`);
      break;
    case "navigateProjection":
      validateKeys(edit.args, ["target", "operation"], edit.action);
      native = navigateProjection;
      if (program.compositionSpec !== undefined) throw new TypeError("Native route navigateProjection requires a completed unit receiver.");
      break;
    case "filterMarks": case "removeMarkFilter": {
      native = edit.action === "filterMarks" ? filterMarks : removeMarkFilter;
      if (program.compositionSpec !== undefined) throw new TypeError(`Native route ${edit.action} requires a completed unit receiver.`);
      if (typeof edit.args.target !== "string") throw new TypeError(`Native route ${edit.action} requires an explicit target.`);
      // Only a recomputing graph filter revises the routes behind its plot.
      previous = requireLayer(program, edit.args.target).graphBinding?.layout;
      break;
    }
    case "applyDataUpdate":
      native = applyDataUpdate;
      if (program.compositionSpec !== undefined) throw new TypeError("Native route applyDataUpdate requires a completed unit receiver.");
      previous = preparedDataUpdateTarget(program, edit.args.prepared, edit.args.requestToken);
      break;
    default:
      // Focused derived-data aliases keep their own wrappers and option checks.
      if (Object.hasOwn(DERIVED_ALIASES, edit.action)) {
        native = DERIVED_ALIASES[edit.action];
        if (program.compositionSpec !== undefined) throw new TypeError(`Native route ${edit.action} requires a completed unit receiver.`);
        seeds = derivedSeeds(program, edit.args.target);
        break;
      }
      throw new TypeError("Native route updates require editLayout, editGraphData, editFlowData, editHierarchyData, editInferredGraphData, reviseData, editDerivedData, editParameter, editCanvas, fitCanvas, navigateProjection, applyDataUpdate, filterMarks or removeMarkFilter.");
  }
  if (program[edit.action] !== native) throw new TypeError("Native route action was replaced.");
  const key = ref => JSON.stringify([ref.kind, ref.id]), routes = [];
  const affected = new Set([...(previous === undefined ? [] : [key(previous)]), ...seeds.map(id => key({ kind: "data", id }))]);
  // Derived datasets carry their source and parameter inputs, in dependency order.
  for (const dataset of program.semanticSpec.datasets) {
    if (dataset.source !== undefined && affected.has(key({ kind: "data", id: dataset.source })) ||
        (dataset.transform ?? []).some(step => (step.parameterInputs ?? []).some(ref => affected.has(key(ref))))) affected.add(key({ kind: "data", id: dataset.id }));
  }
  // Canvas edits, fits and camera resizes can move every screen-space route's viewport.
  const movesViewport = native === editCanvas || native === fitCanvas || native === navigateProjection && edit.args.operation?.type === "resize";
  for (const resource of orderResourceDependencies(program.semanticSpec.resources)) {
    if (!affected.has(key(resource)) && (resource.inputs.some(ref => affected.has(key(ref))) ||
        movesViewport && resource.kind === "edge-route" && resource.options.coordinateSpace === "screen")) affected.add(key(resource));
    if (resource.kind === "edge-route" && affected.has(key(resource))) routes.push(resource);
  }
  const bounded = routes.filter(resource => Object.hasOwn(resource.options.options, "execution"));
  if (!bounded.length) throw new TypeError(`This resource has no bounded edge route update; use ${edit.action} directly.`);
  // A replayed action reaches its routes inside one synchronous native call.
  return { native, edit, previous, routes, bounded, ...(REPLAYED.has(native) ? { replayed: true, identity } : {}) };
}

export function* prepareNativeRouteUpdate(program, resolved, scope) {
  const { edit, previous } = resolved;
  if (edit.action === "editLayout") {
    const result = yield* prepareLayoutRouteUpdate(program, edit.args, scope);
    return { ...result, routeEntries: result.plan.routes.entries };
  }
  if (edit.action === "editHierarchyData") {
    const resource = editedHierarchyResource(program, edit.args, previous);
    const plan = yield* planHierarchyResourceStages(program, resource, scope);
    return { previous, plan, routeEntries: plan.routes.entries };
  }
  const resource = edit.action === "editGraphData" ? editedObservedGraphResource(program, edit.args, previous)
    : edit.action === "editFlowData" ? editedFlowResource(program, edit.args, previous)
      : nativeInferenceResource(program, edit.args);
  const plan = yield* prepareGraphResourceStages(program, resource, undefined, scope);
  return { previous, plan, routeEntries: plan.replacements };
}
