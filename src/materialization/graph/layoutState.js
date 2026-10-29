import { validateGraphRecomputeView } from "./filterState.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { normalizeGraphLayout, graphLayoutKernelOptions, GRAPH_COORDINATE_FIELDS } from "../../grammar/graph/layoutOptions.js";
import { polarToCartesian } from "../../grammar/polar.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { validateGraphPlotDefinition } from "../../grammar/graph/plot.js";
import { validateRowSelectionDataset } from "../../grammar/markSelection.js";
import { findDataset } from "../../selectors/datasets.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
function exact(value, fields, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) throw new TypeError(`${label} requires its exact stored fields.`);
}
function validateStored(resource) {
  if (resource.kind !== "layout" || resource.inputs.length !== 1 || resource.inputs[0].kind !== "graph" ||
      !same(resource.ownership, { mode: "authored" }) || resource.provenance.origin !== "inferred") throw new TypeError("Graph layout requires an authored resource with one exact graph input.");
  exact(resource.options, ["method", "options"], "Graph layout intent");
  const { method, options } = resource.options;
  if (!same(normalizeGraphLayout(method, options), resource.options)) throw new TypeError("Graph layout options must store resolved defaults.");
  exact(resource.result, ["nodes", "algorithm", "packing"], "Graph layout result");
  if (resource.result.algorithm !== (method === "force" ? "exact-pair-spring@1" : `${method}@1`)) throw new TypeError("Graph layout algorithm is incompatible.");
  ownArray(resource.result.nodes, "Graph layout nodes");
  const keys = new Set();
  for (const node of resource.result.nodes) {
    exact(node, ["key", "x", "y"], "Graph layout node");
    if (typeof node.key !== "string" || !node.key || keys.has(node.key) || !Number.isFinite(node.x) || !Number.isFinite(node.y)) throw new TypeError("Graph layout nodes require unique keys and finite coordinates.");
    keys.add(node.key);
  }
  if (method !== "force") {
    if (resource.result.packing !== null) throw new TypeError("Only force layouts have component packing.");
  } else validatePacking(resource);
}

function validatePacking(resource) {
  const { nodes, packing } = resource.result, options = resource.options.options;
  exact(packing, ["method", "gap", "components"], "Graph packing");
  if (packing.method !== "horizontal" || packing.gap !== options.componentGap) throw new TypeError("Graph packing disagrees with its layout intent.");
  ownArray(packing.components, "Graph components");
  const seen = new Set();
  let priorFirst = -1;
  for (const component of packing.components) {
    exact(component, ["nodeIndices", "pinned", "bounds"], "Graph component");
    ownArray(component.nodeIndices, "Graph component indices");
    if (!component.nodeIndices.length || typeof component.pinned !== "boolean" || component.nodeIndices[0] <= priorFirst) throw new TypeError("Graph components require stable nonempty membership.");
    priorFirst = component.nodeIndices[0];
    let prior = -1, left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const index of component.nodeIndices) {
      if (!Number.isSafeInteger(index) || index <= prior || index >= nodes.length || seen.has(index)) throw new TypeError("Graph component membership must cover each node once.");
      prior = index; seen.add(index);
      const node = nodes[index], r = options.collisionRadius;
      left = Math.min(left, node.x - r); right = Math.max(right, node.x + r);
      top = Math.min(top, node.y - r); bottom = Math.max(bottom, node.y + r);
    }
    exact(component.bounds, ["left", "right", "top", "bottom"], "Graph component bounds");
    if (![left, right, top, bottom].every(Number.isFinite) || !same(component.bounds, { left, right, top, bottom })) throw new TypeError("Graph component bounds disagree with the stored coordinates.");
  }
  if (seen.size !== nodes.length) throw new TypeError("Graph component membership must cover every node.");
}

function validateBindings(program, resource) {
  const graph = resolveInputReference(program, resource.inputs[0]), model = graph.result.model;
  const nodes = resource.result.nodes, { method, options } = resource.options;
  validateGeneratedItemLimit(model.nodes.length, "Graph layout nodes", options.maxNodes);
  validateGeneratedItemLimit(model.edges.length, "Graph layout edges", options.maxEdges);
  if (nodes.length !== model.nodes.length || nodes.some((node, index) => node.key !== model.nodes[index].key)) throw new TypeError("Graph layout node membership or order is stale.");
  if (!same(resource.provenance.sourceRows, graph.provenance.sourceRows)) throw new TypeError("Graph layout source provenance is stale.");
  for (const layer of program.semanticSpec.layers) {
    if (layer.graphBinding?.layout.id !== resource.id) continue;
    exact(layer, ["id", "mark", "graphBinding", "graphLabels"], "Graph plot layer");
    exact(layer.mark, ["type"], "Graph plot mark");
    exact(layer.graphBinding, ["layout"], "Graph plot binding");
    if (layer.mark.type !== "graph") throw new TypeError("Graph layout binding requires a graph mark.");
    const config = program.materializationConfigs.marks?.[layer.id];
    exact(config, ["graphPlot"], "Graph mark configuration");
    validateGraphPlotDefinition(config.graphPlot, layer.graphLabels);
    validateGraphRecomputeView(program, layer, graph, config.graphPlot.view);
    for (const selector of config.graphPlot.view?.selectors ?? []) {
      if (selector.rows !== undefined) validateRowSelectionDataset(selector.rows, findDataset(program, selector.rows.data));
    }
    if (layer.graphLabels !== false && Object.hasOwn(layer.graphLabels, "field")) {
      const field = layer.graphLabels.field;
      if (!graph.options.definition.attributes.includes(field) || model.nodes.some(node => node.attributes[field] !== null &&
          !["undefined", "string", "number", "boolean", "bigint"].includes(typeof node.attributes[field]))) throw new TypeError("Graph labels require a retained scalar attribute.");
    }
  }
  const byKey = new Map(nodes.map(node => [node.key, node]));
  const activeOptions = graphLayoutKernelOptions(resource.options, { nodeKeys: byKey.keys(), retainedCoordinates: GRAPH_COORDINATE_FIELDS });
  const completePositions = positions => {
    if (positions.length !== nodes.length) throw new TypeError("Graph layout initial positions must cover current nodes.");
  };
  if (method === "fixed") {
    completePositions(activeOptions.positions);
    for (const position of activeOptions.positions) {
      const node = byKey.get(position.key);
      if (node.x !== position.x || node.y !== position.y) throw new TypeError("Fixed graph coordinates disagree with stored intent.");
    }
  } else if (method === "circular") {
    const frame = { centerX: options.center[0], centerY: options.center[1], availableRadius: options.radius };
    nodes.forEach((node, index) => {
      const expected = nodes.length === 1 || options.radius === 0 ? { x: options.center[0], y: options.center[1] }
        : polarToCartesian({ theta: options.startAngle + 360 * (index / nodes.length), radius: options.radius, frame });
      if (node.x !== expected.x || node.y !== expected.y) throw new TypeError("Circular graph coordinates disagree with stored intent.");
    });
  } else {
    if (activeOptions.initialPositions) completePositions(activeOptions.initialPositions);
    const pins = new Set();
    for (const pin of activeOptions.pinned) {
      const key = pin.key, node = byKey.get(key); pins.add(key);
      if (!node || node.x !== pin.fx || node.y !== pin.fy) throw new TypeError("Force graph pins disagree with stored coordinates.");
    }
    const indices = new Map(nodes.map((node, index) => [node.key, index]));
    for (const component of resource.result.packing.components) {
      const members = new Set(component.nodeIndices), visited = new Set([component.nodeIndices[0]]), pending = [component.nodeIndices[0]];
      if (component.pinned !== component.nodeIndices.some(index => pins.has(nodes[index].key))) throw new TypeError("Graph component pin status is stale.");
      for (let cursor = 0; cursor < pending.length; cursor++) for (const key of model.adjacency[pending[cursor]].neighbors) {
        const index = indices.get(key);
        if (!members.has(index)) throw new TypeError("Graph component splits connected nodes.");
        if (!visited.has(index)) { visited.add(index); pending.push(index); }
      }
      if (visited.size !== members.size) throw new TypeError("Graph component joins disconnected nodes.");
    }
  }
}
export const graphLayoutResourceHandler = Object.freeze({ validateStored, validateBindings });
