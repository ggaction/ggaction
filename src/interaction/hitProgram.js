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
import { animationFrameProvenance, animationPlanProvenance } from "../animation/frameProvenance.js";
import { transitionProgress } from "../grammar/animation/values.js";

const frameSources = new WeakMap();
const animationBases = new WeakMap();

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
  const frame = freezeOwned({ scene: owned, entries: freezeOwned(entries), version });
  frameSources.set(frame, { ...source, nodes: new Map(owned.nodes.map(node => [node.key, node])) });
  return frame;
}

// Authentic samples can contain new, exiting or blended representations. Their
// metadata comes from exact native endpoint owners, never a guessed node key.
export function prepareAnimationHitFrame(sample, version = 0, rootTransform = [1, 0, 0, 1, 0, 0], ancestry = new Set()) {
  const proof = animationFrameProvenance(sample);
  if (proof === undefined) throw new TypeError("Animation hit requires an authentic sampled frame.");
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("Hit frame version must be a non-negative safe integer.");
  if (ancestry.has(sample) || ancestry.size >= 256) throw new RangeError("Animation hit endpoint ancestry exceeds its work budget.");
  transformHitPoint(rootTransform, { x: 0, y: 0 });
  let bases = animationBases.get(proof.plan);
  if (bases === undefined) {
    const endpoints = animationPlanProvenance(proof.plan);
    if (endpoints?.from === undefined || endpoints.to === undefined) throw new TypeError("Animation hit requires native endpoint metadata.");
    const next = new Set(ancestry).add(sample);
    const prepare = endpoint => animationFrameProvenance(endpoint) === undefined
      ? prepareProgramHitFrame(endpoint) : prepareAnimationHitFrame(endpoint, 0, [1, 0, 0, 1, 0, 0], next);
    bases = { from: prepare(endpoints.from), to: prepare(endpoints.to) };
    animationBases.set(proof.plan, bases);
  }
  const progress = transitionProgress(proof.timeMs, proof.plan.durationMs);
  const exact = progress === 0 ? bases.from : progress === 1 ? bases.to : undefined;
  if (exact !== undefined) return rebindProgramHitFrame(exact, sample.scene, version, rootTransform);
  if (sample.decisions.length !== sample.scene.nodes.length) throw new TypeError("Animation hit decisions must follow the exact sampled nodes.");
  const lookup = base => ({ source: frameSources.get(base), entries: new Map(base.entries.map(entry => [entry.nodeKey, entry.metadata])) });
  const from = lookup(bases.from), to = lookup(bases.to), profiles = new Map(), entries = [], budget = { work: 0 };
  sample.scene.nodes.forEach((node, zIndex) => {
    const decision = sample.decisions[zIndex], exiting = decision.kind === "exit";
    const side = exiting ? from : to, endpoint = exiting ? bases.from : bases.to;
    const index = exiting ? decision.sourceIndex : decision.targetIndex, original = endpoint.scene.nodes[index];
    if (original === undefined) throw new TypeError("Animation hit decision requires an exact endpoint node.");
    const metadata = side.entries.get(original.key);
    if (metadata === undefined) return;
    let metrics = side.source.profiles.get(original.key);
    if (decision.kind === "crossfade") {
      const a = bases.from.scene.nodes[decision.sourceIndex], b = bases.to.scene.nodes[decision.targetIndex];
      if (a === undefined || b === undefined) throw new TypeError("Animation hit blend requires both endpoint nodes.");
      const list = (source, value) => source.type === "weighted-blend"
        ? Array.isArray(value) ? value : source.properties.sources.map(() => value) : [value];
      metrics = [...list(a, from.source.profiles.get(a.key)), ...list(b, to.source.profiles.get(b.key))];
    }
    const shape = prepareConcreteHitShape(node, metrics, rootTransform);
    spend(budget, hitShapeWork(shape));
    profiles.set(node.key, metrics);
    entries.push(freezeOwned({ nodeKey: node.key, zIndex, metadata, shape }));
  });
  const frame = freezeOwned({ scene: sample.scene, entries: freezeOwned(entries), version });
  frameSources.set(frame, { profiles, placements: frameSources.get(bases.to).placements,
    nodes: new Map(frame.scene.nodes.map(node => [node.key, node])) });
  return frame;
}
