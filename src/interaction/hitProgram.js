import { graphicScopes } from "../selectors/graphicScopes.js";
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
import { animationFrameProvenance } from "../animation/frameProvenance.js";

const frameSources = new WeakMap();
const nativeBases = new WeakMap();

export function requireProgram(program) {
  if (!(program instanceof ChartProgram) || !Object.isFrozen(program)) throw new TypeError("Hit preparation requires an immutable ChartProgram.");
  requireClosedProgramState(program, "Hit preparation");
}

function spend(budget, count = 1) {
  budget.work += count;
  if (budget.work > MAX_HIT_INDEX_WORK) throw new RangeError("Hit program exceeds its preparation work budget.");
}
function contexts(program, budget) {
  const result = new Map();
  for (const context of graphicScopes(program, count => spend(budget, count))) {
    requireProgram(context.program);
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
export function prepareProgramHitFrame(program, version = 0, budget = { work: 0 }) {
  requireProgram(program);
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("Hit frame version must be a non-negative safe integer.");
  const initialWork = budget.work;
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
  frameSources.set(frame, { profiles, placements, work: budget.work - initialWork, nodes: new Map(frame.scene.nodes.map(node => [node.key, node])) });
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
  const frame = freezeOwned({ scene: owned, entries: freezeOwned(entries), version });
  frameSources.set(frame, { ...source, nodes: new Map(owned.nodes.map(node => [node.key, node])) });
  return frame;
}

// Only native programs contributing to the displayed proof or the direct plan
// endpoints have authority. Historical ancestry is neither retained nor inferred.
export function requireAnimationFrameProgram(sample, program) {
  const proof = animationFrameProvenance(sample);
  if (proof === undefined) throw new TypeError("Animation hit requires an authentic sampled frame.");
  if (proof.native === undefined) throw new TypeError("Animation hit requires native endpoint metadata.");
  if (!proof.native.owners.includes(program)) throw new TypeError("Animation frame is not owned by the current native program.");
}

export function prepareAnimationHitFrame(sample, version = 0, rootTransform = [1, 0, 0, 1, 0, 0]) {
  const proof = animationFrameProvenance(sample);
  if (proof === undefined) throw new TypeError("Animation hit requires an authentic sampled frame.");
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("Hit frame version must be a non-negative safe integer.");
  if (proof.native === undefined) throw new TypeError("Animation hit requires native endpoint metadata.");
  transformHitPoint(rootTransform, { x: 0, y: 0 });
  const budget = { work: 0 }, entries = [], profiles = new Map(), counted = new Set();
  const baseFor = program => {
    let value = nativeBases.get(program);
    if (value === undefined) {
      const base = prepareProgramHitFrame(program, 0, budget);
      value = { base, source: frameSources.get(base), entries: new Map(base.entries.map(entry => [entry.nodeKey, entry.metadata])) };
      nativeBases.set(program, value);
    } else if (!counted.has(program)) spend(budget, value.source.work);
    counted.add(program);
    return value;
  };
  const resolve = origin => {
    spend(budget);
    const base = baseFor(origin.program), node = base.base.scene.nodes[origin.index];
    if (node === undefined) throw new TypeError("Animation hit requires an exact native endpoint node.");
    return { metadata: base.entries.get(node.key), metrics: base.source.profiles.get(node.key) };
  };
  if (proof.native.nodes.length !== sample.scene.nodes.length) throw new TypeError("Animation hit sources must follow the exact sampled nodes.");
  sample.scene.nodes.forEach((node, zIndex) => {
    const source = proof.native.nodes[zIndex], original = resolve(source.origin);
    if (original.metadata === undefined) return;
    const values = source.metrics.map(origin => resolve(origin).metrics);
    const metrics = node.type === "weighted-blend" ? values : values[0];
    const shape = prepareConcreteHitShape(node, metrics, rootTransform);
    spend(budget, hitShapeWork(shape)); profiles.set(node.key, metrics);
    entries.push(freezeOwned({ nodeKey: node.key, zIndex, metadata: original.metadata, shape }));
  });
  const frame = freezeOwned({ scene: sample.scene, entries: freezeOwned(entries), version });
  frameSources.set(frame, { profiles, placements: baseFor(proof.native.placement).source.placements,
    nodes: new Map(frame.scene.nodes.map(node => [node.key, node])) });
  return frame;
}
