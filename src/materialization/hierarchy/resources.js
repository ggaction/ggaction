import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { validateWorkLimit } from "../../core/validation.js";
import { normalizeHierarchySource, normalizeHierarchyLayout } from "../../grammar/hierarchy/options.js";
import { resolveHierarchyInput, hierarchyInputSources } from "../../grammar/hierarchy/input.js";
import { orderHierarchyModel } from "../../grammar/hierarchy/order.js";
import { layoutHierarchyTree } from "../../grammar/hierarchy/tree.js";
import { layoutHierarchyTreemap } from "../../grammar/hierarchy/treemap.js";
import { layoutHierarchyPartition } from "../../grammar/hierarchy/partition.js";
import { dataInputReference, resolveInputReference } from "../../selectors/resources.js";

export function hierarchyRowReferences(dataset, model) {
  const indices = new Set();
  let work = 0;
  for (const node of model.nodes) {
    validateWorkLimit(work += node.sourceRows.length, "Hierarchy lineage work");
    for (const index of node.sourceRows) indices.add(index);
  }
  return [...indices].sort((a, b) => a - b).map(index => ({ data: dataset.id, logicalDataId: dataset.logicalId,
    revision: dataset.revision, rowKey: dataset.rowKeys[index], role: "hierarchy" }));
}

export function createHierarchyResource({ id, revision = 0, dataset, options }) {
  const normalized = normalizeHierarchySource(options);
  const { model } = resolveHierarchyInput(dataset.values, normalized);
  return cloneAndFreeze({ kind: "hierarchy", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [dataInputReference(dataset)], options: normalized, result: model,
    provenance: { origin: "observed", sourceRows: hierarchyRowReferences(dataset, model) } });
}

function sameValue(a, b) { return canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b)); }

export function hierarchySortValues(program, hierarchy, order) {
  if (order === "input" || order.by === "value") return undefined;
  const dataset = resolveInputReference(program, hierarchy.inputs[0]);
  const sources = hierarchyInputSources(dataset.values, hierarchy.options);
  return hierarchy.result.nodes.map(node => {
    if (node.synthetic) return null;
    const source = sources.get(node.key);
    if (source === undefined) throw new Error("Hierarchy node has no exact authored source.");
    if (order.by === "key") return source.key;
    const objects = source.object === undefined ? source.rows.map(index => dataset.values[index]) : [source.object];
    let value, assigned = false;
    for (const object of objects) {
      ownRecord(object, "Hierarchy field source");
      if (!Object.hasOwn(object, order.field)) throw new Error("Hierarchy order requires its own source field.");
      if (assigned && !sameValue(value, object[order.field])) throw new Error("Hierarchy order field is ambiguous for a node with multiple source rows.");
      value = object[order.field]; assigned = true;
    }
    return value;
  });
}

export function createHierarchyLayoutResource({ id, revision = 0, hierarchy, options, program }) {
  const normalized = normalizeHierarchyLayout(options);
  const { field: _field, ...sort } = normalized.order === "input" ? { by: "input" } : normalized.order;
  const model = orderHierarchyModel(hierarchy.result, { ...sort,
    maxNodes: normalized.options.maxNodes ?? hierarchy.options.maxNodes }, hierarchySortValues(program, hierarchy, normalized.order));
  const result = normalized.method === "tree" ? layoutHierarchyTree(model, normalized.options)
    : normalized.method === "treemap" ? layoutHierarchyTreemap(model, normalized.options)
      : layoutHierarchyPartition(model, normalized.options);
  const { options: _options, ...stored } = result;
  return cloneAndFreeze({ kind: "layout", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [{ kind: "hierarchy", id: hierarchy.id, revision: hierarchy.revision }], options: normalized,
    result: stored, provenance: { origin: "inferred", sourceRows: hierarchy.provenance.sourceRows } });
}
