import { validatePartitionPlotDefinition } from "../../grammar/hierarchy/partitionPlot.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { polarToCartesian } from "../../grammar/polar.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { hierarchyInputSources } from "../../grammar/hierarchy/input.js";
import { stableFiniteSum } from "../../grammar/numeric.js";
import { validateHierarchyPlotDefinition } from "../../grammar/hierarchy/plot.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateWorkLimit, validateGeneratedItemLimit } from "../../core/validation.js";
import { indexHierarchyModel, hierarchyLayoutModel } from "../../grammar/hierarchy/model.js";
import { normalizeHierarchySource, normalizeHierarchyLayout } from "../../grammar/hierarchy/options.js";
import { resolveInputReference } from "../../selectors/resources.js";
import { hierarchyRowReferences } from "./resources.js";

function exact(value, required, optional, label) {
  ownRecord(value, label);
  if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw new TypeError(`${label} requires its exact stored fields.`);
  }
}
function same(a, b) { return canonicalJSON(a) === canonicalJSON(b); }
function envelope(resource, kind, inputKind, origin) {
  if (resource.kind !== kind || resource.inputs.length !== 1 || resource.inputs[0].kind !== inputKind ||
      resource.ownership.mode !== "authored" || resource.provenance.origin !== origin || !Array.isArray(resource.provenance.sourceRows)) {
    throw new TypeError(`Stored ${kind} requires its authored ownership, exact input and source provenance.`);
  }
}
function rect(value) {
  exact(value, ["x0", "y0", "x1", "y1"], [], "Hierarchy rectangle");
  if (!Object.values(value).every(Number.isFinite) || value.x1 < value.x0 || value.y1 < value.y0) throw new TypeError("Hierarchy rectangle must be finite and ordered.");
}
function contained(inner, outer) {
  if (inner.x0 < outer.x0 || inner.x1 > outer.x1 || inner.y0 < outer.y0 || inner.y1 > outer.y1) throw new TypeError("Hierarchy rectangle is outside its parent.");
}
const MODEL_KEYS = Object.freeze(["key", "parentKey", "childrenKeys", "depth", "ownValue", "totalValue", "residual", "sourceRows", "synthetic"]);

function validateHierarchyStored(resource) {
  envelope(resource, "hierarchy", "data", "observed");
  if (!same(normalizeHierarchySource(resource.options), resource.options)) throw new TypeError("Stored hierarchy options must be normalized.");
  indexHierarchyModel(resource.result, resource.options.maxNodes);
}
function validateHierarchyBindings(program, resource) {
  const dataset = resolveInputReference(program, resource.inputs[0]);
  if (!Array.isArray(dataset.values) || resource.result.nodes.some(node => node.sourceRows.some(index => index >= dataset.values.length))) {
    throw new TypeError("Hierarchy requires exact materialized source rows.");
  }
  const sources = hierarchyInputSources(dataset.values, resource.options);
  const authored = resource.result.nodes.filter(node => !node.synthetic), synthetic = resource.result.nodes[0]?.synthetic === true;
  const expectsForest = resource.options.format === "groups" || resource.options.forest;
  if (sources.size !== authored.length || synthetic !== (expectsForest && sources.size > 0) || resource.result.valueMode !== resource.options.valueMode) throw new TypeError("Hierarchy source topology or value mode is stale.");
  const ignored = new Map(resource.result.diagnostics.ignoredInternalValues.map(entry => [entry.key, entry.value]));
  for (const node of authored) {
    const source = sources.get(node.key);
    const expectedParent = source?.parentKey === null ? (synthetic ? resource.result.rootKey : null) : source === undefined ? undefined : encodeRowKey(source.parentKey);
    if (!source || node.parentKey !== expectedParent || !same(node.sourceRows, source.rows ?? [source.row])) throw new TypeError("Hierarchy node source membership is stale.");
    const internal = node.childrenKeys.length > 0, hasValue = source.object !== undefined && Object.hasOwn(source.object, resource.options.value);
    const value = source.object === undefined ? (internal ? undefined : stableFiniteSum(source.rows.map(index => dataset.values[index][resource.options.value]), "Hierarchy stored leaf total", { compensated: true })) : source.object[resource.options.value];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) throw new TypeError("Hierarchy source weight is invalid.");
    if (resource.options.valueMode === "inclusive") {
      if (!hasValue || value !== node.totalValue) throw new TypeError("Hierarchy inclusive total is stale.");
    } else if (resource.options.valueMode === "leaf-sum" && internal) {
      if (ignored.has(node.key) !== hasValue || hasValue && ignored.get(node.key) !== value) throw new TypeError("Hierarchy ignored source value is stale.");
    } else if ((!internal && value === undefined) || node.ownValue !== (value ?? 0)) throw new TypeError("Hierarchy own source value is stale.");
  }
  if (!same(hierarchyRowReferences(dataset, resource.result), resource.provenance.sourceRows)) throw new TypeError("Hierarchy source row provenance is stale.");
}

function validateLayoutStored(resource) {
  envelope(resource, "layout", "hierarchy", "inferred");
  exact(resource.options, ["method", "order", "options"], [], "Hierarchy layout intent");
  if (!same(normalizeHierarchyLayout(resource.options), resource.options)) throw new TypeError("Stored hierarchy layout options must be normalized.");
  const method = resource.options.method, result = resource.result;
  exact(result, method === "tree" ? ["nodes"] : ["nodes", "rootKey", "valueMode", "totalValue", "diagnostics"], [], "Hierarchy layout result");
  ownArray(result.nodes, "Hierarchy layout nodes");
  validateWorkLimit(result.nodes.length * 64, "Hierarchy layout validation work");
  validateGeneratedItemLimit(result.nodes.length, "Hierarchy layout node count", resource.options.options.maxNodes);
  const ids = new Set();
  if (method === "tree") {
    for (const node of result.nodes) {
      exact(node, ["key", "parentKey", "depth", "x", "y"], ["synthetic", ...(resource.options.options.orientation === "radial" ? ["theta", "radius"] : [])], "Hierarchy tree node");
      if (typeof node.key !== "string" || !node.key || ids.has(node.key) || ![node.x, node.y].every(Number.isFinite) || !Number.isSafeInteger(node.depth) || node.depth < 0 ||
          node.parentKey !== null && typeof node.parentKey !== "string" || node.synthetic !== undefined && node.synthetic !== true) throw new TypeError("Hierarchy tree node is invalid.");
      if (resource.options.options.orientation === "radial" && (![node.theta, node.radius].every(Number.isFinite) || node.radius < 0 || node.radius > resource.options.options.radius)) throw new TypeError("Hierarchy radial tree node is invalid.");
      ids.add(node.key);
    }
    return;
  }
  const model = hierarchyLayoutModel(resource.result), { indexes } = indexHierarchyModel(model, resource.options.options.maxNodes);
  for (const node of result.nodes) {
    const extra = method === "partition" ? ["u0", "u1", "residualStart"] : ["rect", "content", "residualRect", "childOrder", "area"];
    exact(node, [...MODEL_KEYS.filter(key => key !== "synthetic"), ...extra], ["synthetic"], "Hierarchy layout node");
    const parent = node.parentKey === null ? undefined : result.nodes[indexes.get(node.parentKey)];
    if (method === "partition") {
      if (![node.u0, node.u1, node.residualStart].every(Number.isFinite) || node.u0 < 0 || node.u1 > 1 || node.u0 > node.residualStart || node.residualStart > node.u1 ||
          parent && (node.u0 < parent.u0 || node.u1 > parent.u1)) throw new TypeError("Hierarchy partition interval is invalid.");
      let previous = node.u0;
      for (const key of node.childrenKeys) {
        const child = result.nodes[indexes.get(key)];
        if (child.u0 !== previous) throw new TypeError("Hierarchy partition children must be contiguous.");
        previous = child.u1;
      }
      if (previous !== node.residualStart || node.residual === 0 && node.childrenKeys.length && node.residualStart !== node.u1) throw new TypeError("Hierarchy partition residual is inconsistent.");
    } else {
      rect(node.rect); rect(node.content); rect(node.residualRect);
      contained(node.content, node.rect); contained(node.residualRect, node.content);
      if (parent) contained(node.rect, parent.content);
      if (!Number.isFinite(node.area) || node.area !== (node.rect.x1 - node.rect.x0) * (node.rect.y1 - node.rect.y0)) throw new TypeError("Hierarchy treemap area is inconsistent.");
      ownArray(node.childOrder, "Hierarchy treemap child order");
      const children = new Set(node.childrenKeys);
      if (node.childOrder.length !== node.childrenKeys.length || new Set(node.childOrder).size !== node.childOrder.length || node.childOrder.some(key => !children.has(key))) throw new TypeError("Hierarchy treemap child order is inconsistent.");
    }
  }
}
function validateLayoutBindings(program, resource) {
  const hierarchy = resolveInputReference(program, resource.inputs[0]), model = hierarchy.result;
  if (!same(resource.provenance.sourceRows, hierarchy.provenance.sourceRows)) throw new TypeError("Hierarchy layout provenance is stale.");
  const inputNodes = new Map(model.nodes.map(node => [node.key, node]));
  if (resource.result.nodes.length !== model.nodes.length) throw new TypeError("Hierarchy layout node count is stale.");
  for (const layer of program.semanticSpec.layers) {
    if (layer.hierarchyBinding?.layout.id !== resource.id) continue;
    exact(layer, ["id", "mark", "hierarchyBinding", "hierarchyLabels", ...(layer.mark.type === "partition" ? ["coordinate", "partitionView"] : [])], [], "Hierarchy plot layer");
    exact(layer.mark, ["type"], [], "Hierarchy plot mark");
    exact(layer.hierarchyBinding, ["layout"], [], "Hierarchy plot binding");
    if (!["tree", "treemap", "partition"].includes(layer.mark.type) || layer.mark.type !== resource.options.method) throw new TypeError("Hierarchy plot layout method is incompatible.");
    const config = program.materializationConfigs.marks?.[layer.id];
    exact(config, ["hierarchyPlot"], [], "Hierarchy mark configuration");
    if (layer.mark.type === "partition") {
      if (!["cartesian", "polar"].includes(requireCoordinate(program, layer.coordinate).type)) throw new TypeError("Partition requires Cartesian or polar coordinates.");
      validatePartitionPlotDefinition(config.hierarchyPlot, layer.hierarchyLabels, layer.partitionView, model);
    } else validateHierarchyPlotDefinition(layer.mark.type, config.hierarchyPlot, layer.hierarchyLabels);
  }
  const maxDepth = model.nodes.reduce((maximum, node) => Math.max(maximum, node.depth), 0), options = resource.options.options;
  for (const node of resource.result.nodes) {
    const source = inputNodes.get(node.key);
    if (!source || source.parentKey !== node.parentKey || source.depth !== node.depth || source.synthetic !== node.synthetic) throw new TypeError("Hierarchy layout topology is stale.");
    if (resource.options.method === "tree") {
      if (options.orientation === "radial") {
        const radius = maxDepth === 0 ? 0 : options.radius * (node.depth / maxDepth);
        const position = polarToCartesian({ theta: node.theta, radius, frame: { centerX: 0, centerY: 0, availableRadius: options.radius } });
        if (node.radius !== radius || node.theta < options.startAngle || node.theta > options.startAngle + options.sweep || node.x !== position.x || node.y !== position.y) throw new TypeError("Hierarchy radial tree coordinates disagree with their stored polar meaning.");
      } else {
        const depthCoordinate = options.orientation === "vertical" ? node.y : node.x;
        if (depthCoordinate !== node.depth * (options.nodeSize[1] + options.depthGap)) throw new TypeError("Hierarchy tree depth coordinates disagree with the layout intent.");
      }
    }
    if (resource.options.method === "treemap") {
      if (node.parentKey === null && !same(node.rect, { x0: 0, y0: 0, x1: options.size[0], y1: options.size[1] })) throw new TypeError("Hierarchy treemap root size disagrees with the layout intent.");
      const px = Math.min(options.padding, (node.rect.x1 - node.rect.x0) / 2), py = Math.min(options.padding, (node.rect.y1 - node.rect.y0) / 2);
      if (!same(node.content, { x0: node.rect.x0 + px, y0: node.rect.y0 + py, x1: node.rect.x1 - px, y1: node.rect.y1 - py })) throw new TypeError("Hierarchy treemap padding disagrees with the layout intent.");
    }
    if (resource.options.method !== "tree") {
      for (const key of ["ownValue", "totalValue", "residual", "sourceRows"]) if (!same(node[key], source[key])) throw new TypeError("Hierarchy layout values or lineage are stale.");
    }
  }
}

export const hierarchyResourceHandler = Object.freeze({ validateStored: validateHierarchyStored, validateBindings: validateHierarchyBindings });
export const hierarchyLayoutResourceHandler = Object.freeze({ validateStored: validateLayoutStored, validateBindings: validateLayoutBindings });
