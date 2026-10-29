import { cloneAndFreeze, freezeOwned, isOwned } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateInputReference } from "../core/resourceReference.js";
import { transformHitPoint } from "./hitCoordinates.js";
import { hitShape, hitShapeWork, normalizeHitQuery } from "./hitShapes.js";

export const MAX_HIT_INDEX_ITEMS = 100_000;
export const MAX_HIT_INDEX_WORK = 10_000_000;
export const MAX_HIT_QUERY_WORK = 2_000_000;
const states = new WeakMap(), identity = [1, 0, 0, 1, 0, 0];
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function spend(work, count = 1) {
  work.value += count;
  if (work.value > work.limit) throw new RangeError("Hit index exceeds its work budget.");
}
function exact(value, keys, label) {
  ownRecord(value, label);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError(`${label} requires exactly ${keys.join(", ")}.`);
}
function text(value, work) {
  if (typeof value !== "string" || !value) throw new TypeError("Hit metadata requires nonempty strings.");
  spend(work, value.length);
  return value;
}
function strings(value, work, unique = false) {
  if (!Array.isArray(value) || value.length > MAX_HIT_INDEX_ITEMS) throw new RangeError("Hit metadata array exceeds its item budget.");
  ownArray(value, "Hit metadata array"); spend(work, value.length);
  value.forEach(item => text(item, work));
  if (unique && new Set(value).size !== value.length) throw new TypeError("Hit lineage requires unique row keys.");
  return value;
}
function metadata(value, work) {
  exact(value, ["itemKey", "ownerId", "role", "childPath", "rowKeys", "resourceRefs"], "Hit metadata");
  const itemKey = text(value.itemKey, work), ownerId = text(value.ownerId, work), role = text(value.role, work);
  const childPath = strings(value.childPath, work), rowKeys = strings(value.rowKeys, work, true);
  const refs = value.resourceRefs;
  if (!Array.isArray(refs) || refs.length > MAX_HIT_INDEX_ITEMS) throw new RangeError("Hit resource refs exceed their item budget.");
  ownArray(refs, "Hit resource refs"); spend(work, refs.length);
  const resourceRefs = [], used = new Set();
  for (const ref of refs) {
    ownRecord(ref, "Hit resource ref");
    // Supply an own-data null-prototype view to the existing revision validator.
    const copy = Object.assign(Object.create(null), ref); validateInputReference(copy);
    const normalized = ref.kind === "data" ? { kind: ref.kind, id: ref.id, logicalId: ref.logicalId, revision: ref.revision }
      : { kind: ref.kind, id: ref.id, revision: ref.revision };
    const key = JSON.stringify(normalized); text(key, work);
    if (used.has(key)) throw new TypeError("Hit resource refs must be unique.");
    used.add(key); resourceRefs.push(normalized);
  }
  return cloneAndFreeze({ itemKey, ownerId, role, childPath, rowKeys, resourceRefs });
}
function sceneKeys(scene, work) {
  ownRecord(scene, "Hit scene");
  if (!isOwned(scene) || !Object.hasOwn(scene, "version") || scene.version !== 2 || !Object.hasOwn(scene, "nodes") || !isOwned(scene.nodes) ||
      !Array.isArray(scene.nodes) || scene.nodes.length > MAX_HIT_INDEX_ITEMS) throw new TypeError("Hit index requires an immutable owned Canvas scene within its item budget.");
  ownArray(scene.nodes, "Hit scene nodes");
  const keys = new Set();
  for (const node of scene.nodes) {
    ownRecord(node, "Hit scene node");
    if (!isOwned(node) || !Object.hasOwn(node, "key")) throw new TypeError("Hit scene nodes require immutable own keys.");
    const key = text(node.key, work);
    if (keys.has(key)) throw new TypeError("Hit scene node keys must be unique.");
    keys.add(key);
  }
  return keys;
}
function boundsOf(items, work) {
  const bounds = { ...items[0].shape.bounds };
  for (const item of items) {
    spend(work);
    const b = item.shape.bounds;
    bounds.left = Math.min(bounds.left, b.left); bounds.right = Math.max(bounds.right, b.right);
    bounds.top = Math.min(bounds.top, b.top); bounds.bottom = Math.max(bounds.bottom, b.bottom);
  }
  return bounds;
}
function build(items, work) {
  if (!items.length) return null;
  const root = {}, pending = [{ node: root, items }];
  while (pending.length) {
    const task = pending.pop(), node = task.node;
    node.bounds = boundsOf(task.items, work);
    if (task.items.length <= 8) { node.items = task.items; continue; }
    const b = node.bounds, axis = b.right / 2 - b.left / 2 >= b.bottom / 2 - b.top / 2 ? ["left", "right"] : ["top", "bottom"];
    task.items.sort((a, b) => {
      spend(work);
      const x = a.shape.bounds, y = b.shape.bounds;
      const cx = x[axis[0]] / 2 + x[axis[1]] / 2, cy = y[axis[0]] / 2 + y[axis[1]] / 2;
      if (cx !== cy) return cx < cy ? -1 : 1;
      spend(work, a.nodeKey.length + b.nodeKey.length);
      return compareText(a.nodeKey, b.nodeKey);
    });
    const mid = Math.floor(task.items.length / 2); node.left = {}; node.right = {};
    pending.push({ node: node.right, items: task.items.slice(mid) }, { node: node.left, items: task.items.slice(0, mid) });
  }
  return root;
}
function within(bounds, point, slop) {
  // Subtraction may overflow to infinity; finite slop then correctly excludes it.
  return (point.x >= bounds.left || bounds.left - point.x <= slop) &&
    (point.x <= bounds.right || point.x - bounds.right <= slop) &&
    (point.y >= bounds.top || bounds.top - point.y <= slop) &&
    (point.y <= bounds.bottom || point.y - bounds.bottom <= slop);
}
function candidateOrder(a, b, work) {
  spend(work);
  const priority = b.zIndex - a.zIndex || a.distance - b.distance;
  if (priority) return priority;
  spend(work, a.itemKey.length + b.itemKey.length);
  const item = compareText(a.itemKey, b.itemKey);
  if (item) return item;
  const ap = JSON.stringify(a.childPath), bp = JSON.stringify(b.childPath);
  spend(work, ap.length + bp.length + a.ownerId.length + b.ownerId.length);
  return compareText(ap, bp) || compareText(a.ownerId, b.ownerId);
}

/** Bind explicit node/semantic mappings to one immutable current scene; no resource inference. */
export function prepareHitIndex(scene, entries) {
  const work = { value: 0, limit: MAX_HIT_INDEX_WORK }, available = sceneKeys(scene, work);
  if (!Array.isArray(entries) || entries.length > MAX_HIT_INDEX_ITEMS) throw new RangeError("Hit entries exceed their item budget.");
  ownArray(entries, "Hit entries"); spend(work, entries.length);
  const used = new Set(), semantic = new Map(), items = [], diagnostics = [];
  for (const entry of entries) {
    exact(entry, ["nodeKey", "shape", "metadata", "zIndex"], "Hit entry");
    const nodeKey = text(entry.nodeKey, work);
    if (!available.has(nodeKey) || used.has(nodeKey)) throw new TypeError("Hit entries require unique nodes from their exact scene.");
    if (!Number.isSafeInteger(entry.zIndex)) throw new TypeError("Hit entry requires an explicit safe integer zIndex.");
    used.add(nodeKey);
    const cost = hitShapeWork(entry.shape), info = metadata(entry.metadata, work);
    const semanticKey = JSON.stringify([info.childPath, info.ownerId, info.itemKey]), signature = JSON.stringify(info);
    spend(work, signature.length);
    if (semantic.has(semanticKey) && semantic.get(semanticKey) !== signature) throw new TypeError("Duplicate hit primitives require identical semantic metadata.");
    semantic.set(semanticKey, signature);
    for (const diagnostic of entry.shape.diagnostics) { spend(work); diagnostics.push({ itemKey: info.itemKey, ...diagnostic }); }
    if (entry.shape.bounds !== null) items.push({ nodeKey, shape: entry.shape, metadata: info, semanticKey, cost, zIndex: entry.zIndex });
  }
  const root = build(items, work), result = freezeOwned({ itemCount: entries.length, indexedCount: items.length });
  states.set(result, { scene, root, diagnostics: cloneAndFreeze(diagnostics) });
  return result;
}

export function hitIndex(index, scene, point, options = {}) {
  const state = states.get(index);
  if (!state) throw new TypeError("Hit query requires its prepared index.");
  if (scene !== state.scene) throw new TypeError("Hit index is stale for this scene.");
  const screenPoint = transformHitPoint(identity, point), query = normalizeHitQuery(options);
  const work = { value: 0, limit: MAX_HIT_QUERY_WORK }, pending = state.root ? [state.root] : [], hits = new Map(), testedShapes = new Map();
  spend(work, state.diagnostics.length);
  const diagnostics = [...state.diagnostics], diagnosticKeys = new Set();
  let visited = 0, tested = 0;
  while (pending.length) {
    const node = pending.pop(); spend(work); visited++;
    if (!within(node.bounds, screenPoint, query.slop)) continue;
    if (!node.items) { pending.push(node.right, node.left); continue; }
    for (const item of node.items) {
      spend(work);
      if (!within(item.shape.bounds, screenPoint, query.slop)) continue;
      let result = testedShapes.get(item.shape);
      if (result === undefined) { spend(work, item.cost); result = hitShape(item.shape, screenPoint, query); testedShapes.set(item.shape, result); tested++; }
      if (result.diagnostics !== item.shape.diagnostics) for (const diagnostic of result.diagnostics) {
        const key = JSON.stringify([item.semanticKey, diagnostic.code, diagnostic.transformIndex]); spend(work, key.length);
        if (!diagnosticKeys.has(key)) { diagnosticKeys.add(key); diagnostics.push(freezeOwned({ itemKey: item.metadata.itemKey, ...diagnostic })); }
      }
      if (!result.hit) continue;
      const candidate = freezeOwned({ ...item.metadata, screenPoint, localPoint: result.localPoint, distance: result.distance, zIndex: item.zIndex });
      const previous = hits.get(item.semanticKey);
      if (!previous || candidateOrder(candidate, previous, work) < 0) hits.set(item.semanticKey, candidate);
    }
  }
  const candidates = [...hits.values()].sort((a, b) => candidateOrder(a, b, work));
  return freezeOwned({ target: candidates[0] ?? null, candidates: freezeOwned(candidates), diagnostics: freezeOwned(diagnostics),
    statistics: freezeOwned({ visited, tested, work: work.value }) });
}
