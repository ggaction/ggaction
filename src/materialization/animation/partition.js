import { cloneAndFreeze } from "../../core/immutable.js";
import { validateWorkLimit } from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveGraphicScope, resolveGraphicLineage } from "../../selectors/resources.js";
import { namespaceItemKey, unnamespaceItemKey } from "../../grammar/schemas/graphicIdentity.js";
import { createPartitionAnimationState } from "../../grammar/animation/partitionState.js";
import { resolveCoordinatePolarFrame } from "../coordinateBounds.js";
import { resolvePartitionPlot } from "../hierarchy/partitionPlot.js";

const geometry = new Set(["x", "y", "width", "height", "commands", "fillBounds"]);
const geometryOf = graphic => Object.fromEntries(Object.entries(graphic.properties).filter(([key]) => geometry.has(key)));
const scopedKey = (key, namespaces) => namespaces.reduceRight((value, namespace) => namespaceItemKey(value, namespace), key);
function prepareGroup(program, layer, namespaces, id) {
  const config = program.markConfigs[layer.id].hierarchyPlot, resolved = resolvePartitionPlot(program, layer, config);
  const coordinate = requireCoordinate(program, layer.coordinate), keys = new Map(resolved.items.map(item => [item.node.key, scopedKey(item.key, namespaces)]));
  const cells = new Map(resolved.view.nodes.map(node => [node.key, node]));
  const nodes = resolved.items.map(item => {
    const cell = cells.get(item.node.key), visible = cell?.visible === true;
    return { key: keys.get(item.node.key), parentKey: keys.get(item.node.parentKey) ?? null,
      u0: visible ? cell.u0 : 0, u1: visible ? cell.u1 : 0, v0: visible ? cell.v0 : 0, v1: visible ? cell.v1 : 0, visible };
  });
  const polar = coordinate.type === "polar" ? resolveCoordinatePolarFrame(program, coordinate.id) : undefined;
  const meaning = createPartitionAnimationState({ nodes, focusKey: keys.get(resolved.view.focusKey) ?? null, frame: resolved.frame,
    mapping: config.mapping, ...(polar ? { polar: { centerX: polar.centerX, centerY: polar.centerY,
      outerRadius: config.mapping.outerRadius === "auto" ? polar.availableRadius : config.mapping.outerRadius } } : {}) });
  return { group: { id, layout: layer.hierarchyBinding.layout, hierarchy: resolved.layout.inputs[0], meaning,
    labelOffset: config.labels?.offset ?? [0, 0] }, layout: resolved.layout,
    expected: new Map(resolved.graphics.map(graphic => [JSON.stringify([graphic.identity.key, graphic.identity.role]), graphic])) };
}

// Project each explicit placement once. The same child snapshot may be placed
// twice, so object identity alone cannot establish a resource namespace.
export function projectPartitionAnimations(program, endpoint) {
  const prepared = new Map(), groups = [], groupIndices = new Map(); let work = 0;
  const items = endpoint.identities.map((identity, index) => {
    if (identity === undefined) return null;
    const scope = resolveGraphicScope(program, identity), [namespaces, owner] = JSON.parse(identity.key), layer = findLayer(scope, owner);
    if (layer?.mark.type !== "partition") return null;
    const id = JSON.stringify([namespaces, owner]);
    let entry = prepared.get(id);
    if (entry === undefined) {
      entry = prepareGroup(scope, layer, namespaces, id);
      validateWorkLimit(work += entry.group.meaning.state.nodes.length * 64, "Partition animation projection work");
      groupIndices.set(id, groups.length); groups.push(entry.group); prepared.set(id, entry);
    }
    if (resolveGraphicLineage(program, identity) !== entry.layout) throw new TypeError("Partition animation requires its exact native layout lineage.");
    const localKey = unnamespaceItemKey(identity.key, namespaces), expected = entry.expected.get(JSON.stringify([localKey, identity.role]));
    if (identity.role !== "body" && identity.role !== "label") return { group: groupIndices.get(id), key: identity.key, role: identity.role, reason: "primitive-role" };
    if (expected === undefined) throw new TypeError("Partition animation identity is absent from its exact native visible grain.");
    const actual = endpoint.scene.nodes[index], edited = actual.type !== expected.type || JSON.stringify(geometryOf(actual)) !== JSON.stringify(geometryOf(expected));
    return { group: groupIndices.get(id), key: identity.key, role: identity.role, ...(edited ? { reason: "partition-edited-geometry" } : {}) };
  });
  return cloneAndFreeze({ groups, items });
}
