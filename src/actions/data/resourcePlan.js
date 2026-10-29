import { requireLayer } from "../../selectors/layers.js";
import { layerResourceBindings, mapLayerResourceBindings } from "../../core/resourceReferences.js";
import { orderResourceDependencies, validateResourceGraph } from "../../materialization/resourceState.js";
import { createHierarchyResource, createHierarchyLayoutResource } from "../../materialization/hierarchy/resources.js";
import { createObservedGraphResource } from "../../materialization/graph/resources.js";
import { createInferredGraphResource } from "../../materialization/graph/inferredResource.js";
import { createFlowResource, flowSourceDefinition } from "../../materialization/flow/resources.js";
import { createGraphLayoutResource } from "../../materialization/graph/layoutResource.js";
import { GRAPH_COORDINATE_FIELDS } from "../../grammar/graph/layoutOptions.js";
import { createContourResource } from "../../materialization/contour/resources.js";
import { createCalendarResource } from "../../materialization/calendar/resources.js";
import { resolveHierarchyPlot } from "../../materialization/hierarchy/plot.js";
import { applyMaterializationPlan, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { orderConditionalMarkIds } from "../../materialization/conditionalState.js";
import { requireMaterializedDataset, requireDataset } from "../../selectors/datasets.js";
import { dataInputReference, resolveInputReference } from "../../selectors/resources.js";
import { graphRecomputeOwners } from "../../selectors/graphFilters.js";
import { preflightHierarchyLayouts, applyPartitionViews } from "../hierarchy/resources.js";
import { prunePartitionSelections } from "../hierarchy/partition.js";
import { previewGraphLayouts } from "../graphs/layouts.js";
import { preflightContourConsumers } from "../contours/closure.js";
import { preflightCalendarConsumers } from "../calendar/closure.js";
import { withPreparedDataResourceResults } from "../primitives/preparedResourceContext.js";

const key = ref => JSON.stringify([ref.kind, ref.id]);

// Full-only orchestration. Numeric factories retain their own validation and
// budgets; this owner determines only dependency order and the final union.
export function planSourceResourceRevision(program, dataReplacements) {
  const revised = new Map(), entries = [];
  const source = ref => dataReplacements.has(ref.id)
    ? requireMaterializedDataset(program, dataReplacements.get(ref.id)) : resolveInputReference(program, ref);
  const resourceInput = ref => revised.get(key(ref)) ?? resolveInputReference(program, ref);
  for (const previous of orderResourceDependencies(program.semanticSpec.resources)) {
    const changed = previous.inputs.some(ref => ref.kind === "data" ? dataReplacements.has(ref.id) : revised.has(key(ref)));
    if (!changed || !["hierarchy", "graph", "geometry", "layout"].includes(previous.kind)) continue;
    const identity = { id: previous.id, revision: previous.revision + 1 };
    let resource;
    if (previous.kind === "hierarchy") {
      resource = createHierarchyResource({ ...identity, dataset: source(previous.inputs[0]), options: previous.options });
    } else if (previous.kind === "graph") {
      const nodes = source(previous.inputs[previous.options.roles.nodes]);
      if (previous.provenance.origin === "inferred") {
        for (const owner of graphRecomputeOwners(program, previous.id)) {
          if (program.markConfigs[owner.id].graphPlot.view.recompute.dataset !== nodes.id) throw new TypeError("Graph source revision must preserve its recompute dataset.");
        }
        resource = createInferredGraphResource({ ...identity, program, data: nodes, definition: previous.options.definition,
          ...(previous.inputs.length === 2 ? { candidate: resourceInput(previous.inputs[1]) } : {}) });
      } else {
        const inputs = { ...identity, nodes, edges: source(previous.inputs[previous.options.roles.edges]) };
        resource = previous.options.flow === undefined
          ? createObservedGraphResource({ ...inputs, definition: previous.options.definition })
          : createFlowResource({ ...inputs, definition: flowSourceDefinition(previous) });
      }
    } else if (previous.kind === "geometry") {
      resource = createContourResource({ ...identity, dataset: source(previous.inputs[0]),
        definition: previous.options.definition, thresholds: previous.options.thresholds });
    } else if (previous.inputs[0].kind === "hierarchy") {
      resource = createHierarchyLayoutResource({ ...identity, program, hierarchy: resourceInput(previous.inputs[0]), options: previous.options });
    } else if (previous.inputs[0].kind === "graph") {
      resource = createGraphLayoutResource({ ...identity, graph: resourceInput(previous.inputs[0]),
        intent: previous.options, retainedCoordinates: GRAPH_COORDINATE_FIELDS });
    } else {
      resource = createCalendarResource({ ...identity, dataset: source(previous.inputs[0]),
        definition: { ...previous.options.fields, ...previous.options.options } });
    }
    // A source revision preserves the exact authored intent, including key order.
    resource = Object.freeze({ ...resource, options: previous.options });
    revised.set(key(resource), resource);
    entries.push({ previous: { kind: previous.kind, id: previous.id, revision: previous.revision }, resource });
  }
  if (entries.length === 0) return { entries, marks: [], views: new Map() };
  const resources = program.semanticSpec.resources.map(resource => revised.get(key(resource)) ?? resource);
  const layouts = entries.map(entry => entry.resource).filter(resource => resource.kind === "layout");
  const views = preflightHierarchyLayouts(program, resources, layouts);
  const layers = mapLayerResourceBindings(program.semanticSpec.layers.map(layer => views.has(layer.id)
    ? { ...layer, partitionView: views.get(layer.id) } : layer), ref => revised.has(key(ref))
    ? { ...ref, revision: revised.get(key(ref)).revision } : ref);
  const preview = { ...program, markConfigs: program.markConfigs, semanticSpec: { ...program.semanticSpec, resources, layers } };
  validateResourceGraph(preview, program.constructor);
  previewGraphLayouts(preview, resources, layouts);
  preflightContourConsumers(preview, entries.map(entry => entry.resource).filter(resource => resource.kind === "geometry"));
  preflightCalendarConsumers(preview, layouts.filter(resource => resource.options.method === "calendar"));
  const marks = layers.filter(layer => layerResourceBindings(layer).some(({ ref }) => revised.has(key(ref)))).map(layer => layer.id);
  return { entries, views, marks };
}

export function reviseSourceResourceInputs(program, replacements, nativeMarks) {
  const plan = planSourceResourceRevision(program, replacements);
  let next = applyPartitionViews(program, plan.views);
  if (plan.entries.length > 0) {
    const [first, ...dependent] = plan.entries;
    const dataReplacements = [...replacements].map(([from, to]) => ({
      previous: dataInputReference(requireDataset(program, from)), next: dataInputReference(requireDataset(program, to))
    }));
    const entered = next;
    next = withPreparedDataResourceResults(entered,
      { property: `resource[${first.resource.kind}:${first.resource.id}]`, value: first.resource }, dependent,
      args => entered.editSemantic(args), dataReplacements);
  }
  next = applyMaterializationPlan(next, planLayersDataRematerialization(next,
    orderConditionalMarkIds(next, [...nativeMarks, ...plan.marks])));
  for (const id of plan.marks) {
    const layer = requireLayer(next, id);
    if (layer.mark.type === "partition") next = prunePartitionSelections(next, id,
      resolveHierarchyPlot(next, layer, next.markConfigs[id].hierarchyPlot), program);
  }
  return next;
}
