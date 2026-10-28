import { recoverPartitionFocus } from "../../grammar/hierarchy/partitionView.js";
import { hierarchyLayoutModel } from "../../grammar/hierarchy/model.js";
import { prunePartitionSelections } from "./partition.js";
import { ownRecord } from "../../core/ownData.js";
import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { HIERARCHY_SOURCE_FIELDS, normalizeHierarchySource } from "../../grammar/hierarchy/options.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { resolveHierarchyDataset, resolveHierarchyResource } from "../../selectors/hierarchy.js";
import { createHierarchyResource, createHierarchyLayoutResource } from "../../materialization/hierarchy/resources.js";
import { withPreparedResourceResults } from "../primitives/preparedResourceContext.js";
import { mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { resolveHierarchyPlot } from "../../materialization/hierarchy/plot.js";

function preflightLayouts(program, resources, layouts) {
  const replacements = new Map(layouts.map(layout => [layout.id, layout]));
  const views = new Map();
  const originals = new Map(program.semanticSpec.resources.filter(resource => resource.kind === "layout").map(resource => [resource.id, resource]));
  for (const layer of program.semanticSpec.layers) {
    if (layer.mark.type !== "partition" || layer.partitionView.focusKey === null) continue;
    const replacement = replacements.get(layer.hierarchyBinding.layout.id);
    if (!replacement) continue;
    const previous = originals.get(replacement.id);
    const recovery = recoverPartitionFocus(hierarchyLayoutModel(previous.result), hierarchyLayoutModel(replacement.result), layer.partitionView.focusKey);
    if (recovery.reason === "retained") continue;
    const focusKey = recovery.reason === "ancestor" ? recovery.focusKey : null;
    views.set(layer.id, { ...layer.partitionView, focusKey, recovery: { previousFocusKey: recovery.previousFocusKey, reason: recovery.reason } });
  }
  const proposedLayers = program.semanticSpec.layers.map(layer => views.has(layer.id) ? { ...layer, partitionView: views.get(layer.id) } : layer);
  const layers = mapLayerResourceBindings(proposedLayers, ref => {
    const replacement = ref.kind === "layout" ? replacements.get(ref.id) : undefined;
    return replacement === undefined ? ref : { ...ref, revision: replacement.revision };
  });
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources, layers } };
  for (const layer of layers) if (replacements.has(layer.hierarchyBinding?.layout.id)) {
    resolveHierarchyPlot(preview, layer, program.materializationConfigs.marks[layer.id].hierarchyPlot);
  }
  return views;
}

function applyPartitionViews(program, views) {
  let next = program;
  for (const [id, view] of views) next = next.editSemantic({ property: `layer[${id}].partitionView`, value: view });
  return next;
}

function requireMissing(program, kind, id) {
  validateUserId(id, `${kind} id`);
  if (findStoredResource(program, kind, id)) throw annotateError(new Error(`${kind} already exists.`), { code: "duplicate-id", resourceId: id });
}
function patchOptions(args, omitted) {
  const patch = Object.fromEntries(Object.entries(args).filter(([key]) => !omitted.includes(key)));
  if (!Object.keys(patch).length) throw new TypeError("Hierarchy edit requires a nonempty patch.");
  if (Object.values(patch).some(value => value === undefined)) throw new TypeError("Hierarchy edits cannot contain undefined; omission preserves intent.");
  return patch;
}

export function writeHierarchyResource(program, resource) {
  const layouts = program.semanticSpec.resources.filter(candidate => candidate.kind === "layout" &&
    candidate.inputs.length === 1 && candidate.inputs[0].kind === "hierarchy" && candidate.inputs[0].id === resource.id);
  const preview = { ...program, semanticSpec: { ...program.semanticSpec, resources: program.semanticSpec.resources.map(candidate =>
    candidate.kind === "hierarchy" && candidate.id === resource.id ? resource : candidate) } };
  const replacements = layouts.map(layout => ({ previous: { kind: "layout", id: layout.id, revision: layout.revision },
    resource: createHierarchyLayoutResource({ id: layout.id, revision: layout.revision + 1, hierarchy: resource, options: layout.options, program: preview }) }));
  const nextLayouts = new Map(replacements.map(({ resource }) => [resource.id, resource]));
  const views = preflightLayouts(program, preview.semanticSpec.resources.map(candidate => candidate.kind === "layout"
    ? nextLayouts.get(candidate.id) ?? candidate : candidate), [...nextLayouts.values()]);
  const entered = applyPartitionViews(program, views);
  const next = withPreparedResourceResults(entered, { property: `resource[hierarchy:${resource.id}]`, value: resource }, replacements,
    args => entered.editSemantic(args));
  return materializeLayouts(next, new Set(layouts.map(layout => layout.id)), program);
}

export const createHierarchyData = /* @__PURE__ */ closedAction(
  { op: "createHierarchyData", description: "Create validated hierarchy data." }, ["id", "data", ...HIERARCHY_SOURCE_FIELDS], function (args = {}) {
    requireMissing(this, "hierarchy", args.id);
    const { id, data, ...options } = args, dataset = resolveHierarchyDataset(this, data);
    const resource = createHierarchyResource({ id, dataset, options });
    return this.editSemantic({ property: `resource[hierarchy:${id}]`, value: resource });
  });

export const editHierarchyData = /* @__PURE__ */ closedAction(
  { op: "editHierarchyData", description: "Revise hierarchy data and its dependent layouts." }, ["target", "data", ...HIERARCHY_SOURCE_FIELDS], function (args = {}) {
    const previous = resolveHierarchyResource(this, "hierarchy", args.target);
    const { data, ...patch } = patchOptions(args, ["target"]);
    const dataset = data === undefined ? resolveInputReference(this, previous.inputs[0]) : resolveHierarchyDataset(this, data);
    const options = normalizeHierarchySource(patch, previous.options);
    const resource = createHierarchyResource({ id: previous.id, revision: previous.revision + 1, dataset, options });
    return writeHierarchyResource(this, resource);
  });

export const layoutHierarchy = /* @__PURE__ */ closedAction(
  { op: "layoutHierarchy", description: "Compute and store an explicit hierarchy layout." }, ["id", "hierarchy", "method", "order", "options"], function (args = {}) {
    requireMissing(this, "layout", args.id);
    const hierarchy = resolveHierarchyResource(this, "hierarchy", args.hierarchy);
    const resource = createHierarchyLayoutResource({ id: args.id, hierarchy, program: this,
      options: { method: args.method, ...(args.order === undefined ? {} : { order: args.order }), ...(args.options === undefined ? {} : { options: args.options }) } });
    return this.editSemantic({ property: `resource[layout:${args.id}]`, value: resource });
  });

export const editLayout = /* @__PURE__ */ closedAction(
  { op: "editLayout", description: "Revise a stored hierarchy layout." }, ["target", "order", "options"], function (args = {}) {
    const previous = resolveHierarchyResource(this, "layout", args.target), patch = patchOptions(args, ["target"]);
    if (patch.options !== undefined) ownRecord(patch.options, "Hierarchy layout options");
    const priorOptions = { ...previous.options.options };
    if (patch.options?.orientation !== undefined && patch.options.orientation !== "radial") {
      for (const key of ["radius", "startAngle", "sweep"]) delete priorOptions[key];
    }
    const options = { ...previous.options, ...patch, options: { ...priorOptions, ...patch.options } };
    const resource = createHierarchyLayoutResource({ id: previous.id, revision: previous.revision + 1,
      hierarchy: resolveInputReference(this, previous.inputs[0]), options, program: this });
    const views = preflightLayouts(this, this.semanticSpec.resources.map(candidate => candidate === previous ? resource : candidate), [resource]);
    return materializeLayouts(applyPartitionViews(this, views).editSemantic({ property: `resource[layout:${resource.id}]`, value: resource }), new Set([resource.id]), this);
  });

export function registerHierarchyResourceActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createHierarchyData, editHierarchyData, layoutHierarchy, editLayout });
}

export function reviseHierarchyInputs(program, replacements) {
  let next = program;
  for (const resource of program.semanticSpec.resources) {
    if (resource.kind !== "hierarchy") continue;
    const data = replacements.get(resource.inputs[0].id);
    if (data !== undefined) next = next.editHierarchyData({ target: resource.id, data });
  }
  return next;
}

function materializeLayouts(program, ids, previousProgram) {
  let next = program;
  for (const layer of program.semanticSpec.layers) if (ids.has(layer.hierarchyBinding?.layout.id)) {
    next = next[layer.mark.type === "tree" ? "materializeTreePlot" : layer.mark.type === "partition" ? "materializePartitionPlot" : "materializeTreemapPlot"]({ id: layer.id });
    if (layer.mark.type === "partition") next = prunePartitionSelections(next, layer.id, resolveHierarchyPlot(next, layer, next.markConfigs[layer.id].hierarchyPlot), previousProgram);
  }
  return next;
}
