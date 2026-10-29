import { requireClosedProgramState } from "../core/programState.js";
import { transformHitPoint } from "../grammar/hitCoordinates.js";
import { ownHitScene } from "./sceneFrame.js";
import { ChartProgram } from "../core/ChartProgram.js";
import { freezeOwned, cloneAndFreeze } from "../core/immutable.js";
import { canvasSceneSnapshot } from "../sceneSnapshot.js";
import { namespaceGraphicId } from "../selectors/graphicCapacity.js";
import { validateGraphicIdentity } from "../grammar/schemas/graphicIdentity.js";
import { MAX_HIT_INDEX_ITEMS, MAX_HIT_INDEX_WORK } from "../grammar/hitIndex.js";
import { hitShapeWork } from "../grammar/hitShapes.js";
import { prepareConcreteHitShape } from "./hitConcrete.js";
import { guideHitMetadata, guideHitItemKey } from "./hitGuides.js";

const frameSources = new WeakMap();

export function requireProgram(program) {
  if (!(program instanceof ChartProgram) || !Object.isFrozen(program)) throw new TypeError("Hit preparation requires an immutable ChartProgram.");
  requireClosedProgramState(program, "Hit preparation");
}

function spend(budget, count = 1) {
  budget.work += count;
  if (budget.work > MAX_HIT_INDEX_WORK) throw new RangeError("Hit program exceeds its preparation work budget.");
}
function contexts(program, budget) {
  const result = new Map(), stack = [{ program, childPath: [], namespaces: [] }];
  while (stack.length) {
    const context = stack.pop();
    requireProgram(context.program);
    spend(budget);
    if (context.childPath.length > 1024) throw new RangeError("Hit program exceeds its composition work budget.");
    const qualify = id => {
      spend(budget, id.length + context.namespaces.reduce((size, namespace) => size + 6 * namespace.length + 2, 0));
      return context.namespaces.reduceRight((value, namespace) => namespaceGraphicId(namespace, value), id);
    };
    for (const [id, object] of Object.entries(context.program.graphicSpec.objects)) {
      spend(budget);
      result.set(qualify(id), { ...context, localId: id });
      for (const item of object.items ?? []) {
        spend(budget);
        result.set(qualify(item.id), { ...context, localId: item.id });
      }
    }
    const spec = context.program.compositionSpec;
    for (const id of spec?.children ?? []) stack.push({ program: context.program.children[id],
      childPath: [...context.childPath, id], namespaces: [...context.namespaces, `${spec.id}-${id}`] });
  }
  return result;
}
function metadata(identity, context, budget) {
  spend(budget, identity.key.length);
  validateGraphicIdentity(identity);
  const [namespaces, ownerId, role] = JSON.parse(identity.key);
  if (JSON.stringify(namespaces) !== JSON.stringify(context.namespaces)) throw new TypeError("Hit item namespace does not match its composition owner.");
  if (identity.lineage.kind === "screen") return cloneAndFreeze({ itemKey: identity.key, ownerId, role, childPath: context.childPath, rowKeys: [], resourceRefs: [] });
  const lineage = identity.lineage, resource = lineage.kind === "resource" ? lineage.resource
    : { kind: "data", id: lineage.data, logicalId: lineage.logicalDataId, revision: lineage.revision };
  return cloneAndFreeze({ itemKey: identity.key, ownerId, role, childPath: context.childPath,
    rowKeys: lineage.kind === "resource" ? [] : lineage.rowKeys, resourceRefs: [resource] });
}

/** Bind existing concrete item identities to the exact scene; no rematerialization. */
export function prepareProgramHitFrame(program, version = 0) {
  requireProgram(program);
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("Hit frame version must be a non-negative safe integer.");
  const budget = { work: 0 };
  let count = 0;
  for (const object of Object.values(program.graphicSpec.objects)) {
    count += object.items?.length ?? 1;
    if (count > MAX_HIT_INDEX_ITEMS) throw new RangeError("Hit program exceeds its item budget.");
  }
  const owners = contexts(program, budget);
  const snapshot = canvasSceneSnapshot(program);
  if (snapshot.scene.nodes.length > MAX_HIT_INDEX_ITEMS) throw new RangeError("Hit program exceeds its item budget.");
  const identities = new Map();
  for (const object of Object.values(program.graphicSpec.objects)) {
    for (const item of object.items ?? []) if (item.identity !== undefined) identities.set(item.id, item.identity);
  }
  const entries = [], guides = new Map(), profiles = new Map();
  for (let i = 0; i < snapshot.scene.nodes.length; i++) {
    const source = snapshot.sources[i], identity = identities.get(source.graphicId);
    const context = owners.get(source.graphicId);
    if (context === undefined) continue;
    let itemMetadata;
    if (identity !== undefined) itemMetadata = metadata(identity, context, budget);
    else {
      if (!guides.has(context.program)) guides.set(context.program, guideHitMetadata(context.program, count => spend(budget, count)));
      const guide = guides.get(context.program).get(context.localId);
      if (guide === undefined) continue;
      const itemKey = guideHitItemKey(context.namespaces, guide);
      spend(budget, itemKey.length);
      itemMetadata = cloneAndFreeze({ itemKey, ownerId: guide.ownerId, role: guide.role,
        childPath: context.childPath, rowKeys: [], resourceRefs: [] });
    }
    const shape = prepareConcreteHitShape(snapshot.scene.nodes[i], context.program.materializationConfigs.textMetrics);
    spend(budget, hitShapeWork(shape));
    profiles.set(source.nodeKey, context.program.materializationConfigs.textMetrics);
    entries.push(freezeOwned({ nodeKey: source.nodeKey, zIndex: i, metadata: itemMetadata, shape }));
  }
  const frame = freezeOwned({ scene: snapshot.scene, entries: freezeOwned(entries), version });
  const placements = new Map();
  for (const canvas of snapshot.canvases) {
    const context = owners.get(canvas.graphicId);
    if (context?.program.graphicSpec.order.includes(context.localId)) placements.set(JSON.stringify(context.childPath), canvas);
  }
  frameSources.set(frame, { profiles, placements, nodes: new Map(frame.scene.nodes.map(node => [node.key, node])) });
  return frame;
}

// Read the concrete owner placement from the same scene traversal. Empty marks
// still have an unambiguous Canvas; no first-item or first-dataset fallback.
export function programHitOwnerPlacement(base, childPath) {
  const source = frameSources.get(base);
  if (!source) throw new TypeError("Owner placement requires an authentic program hit frame.");
  const placement = source.placements.get(JSON.stringify(childPath));
  if (!placement) throw new Error("Interaction owner has no materialized Canvas placement.");
  return placement;
}

/** Bind a sampled concrete frame only to the exact program's known node identities. */
export function rebindProgramHitFrame(base, scene, version, rootTransform = [1, 0, 0, 1, 0, 0]) {
  const source = frameSources.get(base);
  if (source === undefined) throw new TypeError("Frame binding requires an authentic program hit frame.");
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("Hit frame version must be a non-negative safe integer.");
  transformHitPoint(rootTransform, { x: 0, y: 0 });
  const owned = ownHitScene(scene), metadata = new Map(base.entries.map(entry => [entry.nodeKey, entry.metadata]));
  const entries = [], budget = { work: 0 };
  owned.nodes.forEach((node, zIndex) => {
    const original = source.nodes.get(node.key);
    if (original === undefined || original.type !== node.type || original.topology !== node.topology) {
      throw new TypeError("Interaction frame node identity or topology is not owned by its current program.");
    }
    if (!metadata.has(node.key)) return;
    const shape = prepareConcreteHitShape(node, source.profiles.get(node.key), rootTransform);
    spend(budget, hitShapeWork(shape));
    entries.push(freezeOwned({ nodeKey: node.key, zIndex, metadata: metadata.get(node.key), shape }));
  });
  return freezeOwned({ scene: owned, entries: freezeOwned(entries), version });
}
