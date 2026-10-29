import { closedAction } from "../../core/action.js";
import { requireLayer } from "../../selectors/layers.js";
import { activeGraphFilter, graphRecomputeOwners } from "../../selectors/graphFilters.js";
import { normalizeMarkSelector } from "../../grammar/markSelection.js";
import { validateGraphPlotDefinition } from "../../grammar/graph/plot.js";
import { normalizeGraphSubsetTransform, deriveGraphSubsetRows } from "../../grammar/graph/subset.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { createInferredGraphResource } from "../../materialization/graph/inferredResource.js";
import { prepareGraphResource, writePreparedGraphResource } from "../graphs/layouts.js";
import { withPreviewDerivedDataset } from "../primitives/semanticAction.js";
import { requireMaterializedDataset, hasDataset } from "../../selectors/datasets.js";
import { resolveGraphLayerResources } from "../../selectors/graphs.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";


function withView(program, layer, view) {
  const { view: _previous, ...base } = program.markConfigs[layer.id].graphPlot;
  const graphPlot = view === undefined ? base : { ...base, view };
  validateGraphPlotDefinition(graphPlot, layer.graphLabels);
  return program._withMarkConfig(layer.id, { ...program.markConfigs[layer.id], graphPlot });
}

function writeView(program, layer, view) {
  const next = withView(program, layer, view);
  resolveGraphPlot(next, layer, next.markConfigs[layer.id].graphPlot);
  return next.materializeGraphPlot({ id: layer.id });
}

function inferredRevision(program, graph, data) {
  return createInferredGraphResource({ program, id: graph.id, revision: graph.revision + 1, data,
    candidate: graph.inputs.length === 2 ? resolveInputReference(program, graph.inputs[1]) : undefined,
    definition: graph.options.definition });
}

function nextSubsetId(program, layer) {
  const base = `${layer.id}GraphSubset`;
  if (!hasDataset(program, base)) return base;
  let revision = 2;
  while (hasDataset(program, `${base}${revision}`)) revision++;
  return `${base}${revision}`;
}

function recomputeView(program, layer, selectors) {
  const previous = activeGraphFilter(program, layer)?.recompute;
  const { graph, nodesData } = resolveGraphLayerResources(program, layer);
  if (graph.provenance.origin !== "inferred") throw new TypeError("filterMarks recompute requires an inferred graph.");
  if (graphRecomputeOwners(program, graph.id).some(other => other.id !== layer.id)) throw new TypeError("A graph can have only one recompute filter owner.");
  const source = previous === undefined ? nodesData : requireMaterializedDataset(program, previous.source);
  // Resolve selectors against the unfiltered source topology and its baseline
  // appearance, including replacement/compose after an earlier recomputation.
  let baseline = withView(program, layer, { selectors });
  if (previous !== undefined) baseline = prepareGraphResource(baseline, inferredRevision(baseline, graph, source)).preview;
  const baseLayer = requireLayer(baseline, layer.id);
  const selected = resolveGraphPlot(baseline, baseLayer, baseline.materializationConfigs.marks[layer.id].graphPlot);
  const transform = normalizeGraphSubsetTransform(graph.options.definition.nodeKey,
    selected.items.filter(item => item.role === "node").map(item => item.fields.key));
  const id = nextSubsetId(program, layer), values = deriveGraphSubsetRows(source.values, transform);
  let preview = withPreviewDerivedDataset(program, { id, source: source.id, transform, values });
  preview = withView(preview, layer, { selectors, recompute: { source: source.id, dataset: id } });
  const plan = prepareGraphResource(preview, inferredRevision(preview, graph, requireMaterializedDataset(preview, id)));
  let next = program.createDerivedData({ id, source: source.id, transform: [transform] }).materializeGraphSubsetData({ id });
  next = withView(next, layer, { selectors, recompute: { source: source.id, dataset: id } });
  next = writePreparedGraphResource(next, plan);
  if (previous !== undefined) next = next.releaseDerivedData({ id: previous.dataset });
  return next;
}

function restoreView(program, layer, view) {
  const owner = activeGraphFilter(program, layer)?.recompute;
  if (owner === undefined) return writeView(program, layer, view);
  const { graph } = resolveGraphLayerResources(program, layer);
  const next = withView(program, layer, view), resource = inferredRevision(next, graph, requireMaterializedDataset(next, owner.source));
  return writePreparedGraphResource(next, prepareGraphResource(next, resource)).releaseDerivedData({ id: owner.dataset })._withContext({ currentData: owner.source });
}

function filterGraphPlot(program, layer, selector, mode, recompute) {
  const normalized = normalizeMarkSelector(selector), previous = activeGraphFilter(program, layer);
  const enabled = recompute ?? (previous?.recompute !== undefined);
  const same = previous !== undefined && canonicalJSON(encodeValue(previous.selectors.at(-1))) === canonicalJSON(encodeValue(normalized));
  if (same && enabled === (previous.recompute !== undefined)) return program;
  if (previous !== undefined && !same && mode === undefined) throw new Error('Repeated filterMarks requires mode "replace" or "compose".');
  const selectors = previous === undefined || mode === "replace" ? [normalized] : same ? previous.selectors : [...previous.selectors, normalized];
  return enabled ? recomputeView(program, layer, selectors) : restoreView(program, layer, { selectors });
}

function removeGraphFilter(program, layer) {
  return restoreView(program, layer, undefined);
}

export const filterGraphPlotView = /* @__PURE__ */ closedAction(
  { op: "filterGraphPlotView", description: "Apply an induced or recomputed graph node view." },
  ["target", "selector", "mode", "recompute"], function ({ target, selector, mode, recompute } = {}) {
    return filterGraphPlot(this, requireLayer(this, target), selector, mode, recompute);
  });
export const restoreGraphPlotView = /* @__PURE__ */ closedAction(
  { op: "restoreGraphPlotView", description: "Restore the graph source and release its owned subset." },
  ["target"], function ({ target } = {}) { return removeGraphFilter(this, requireLayer(this, target)); });
