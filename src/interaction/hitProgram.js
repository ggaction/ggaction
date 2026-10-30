import { requireClosedProgramState } from "../core/programState.js";
import { transformHitPoint } from "../grammar/hitCoordinates.js";
import { ownHitScene } from "./sceneFrame.js";
import { ChartProgram } from "../core/ChartProgram.js";
import { freezeOwned, cloneAndFreeze } from "../core/immutable.js";
import { canvasSceneSnapshot } from "../sceneSnapshot.js";
import { namespaceGraphicId } from "../selectors/graphicCapacity.js";
import { validateGraphicIdentity, namespaceItemKey } from "../grammar/schemas/graphicIdentity.js";
import { MAX_HIT_INDEX_ITEMS, MAX_HIT_INDEX_WORK } from "../grammar/hitIndex.js";
import { hitShapeWork } from "../grammar/hitShapes.js";
import { prepareConcreteHitShape } from "./hitConcrete.js";
import { guideHitMetadata, guideHitItemKey } from "./hitGuides.js";
import { animationFrameProvenance } from "../animation/frameProvenance.js";

import { ownArray } from "../core/ownData.js";
import { requireLayer } from "../selectors/layers.js";
import { resolveRegisteredMarkSourceItems } from "../materialization/selection/itemResolver.js";
import { interactionOptions } from "./input.js";

import { hitFrameSource, registerHitFrameSource } from "./hitFrameSource.js";
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

// A projected Geo part can first appear between both endpoint pictures. Its
// metadata comes from exact native source membership, never an invented index.
// Cache only within this preparation: scope and source work are charged once.
function geoSourceResolver(budget) {
  const programs = new Map();
  return origin => {
    if (!Array.isArray(origin.childPath) || origin.childPath.length > 1024) throw new TypeError("Animation geographic source requires a bounded child path.");
    spend(budget, origin.childPath.length);
    ownArray(origin.childPath, "Animation geographic child path");
    for (const id of origin.childPath) {
      if (typeof id !== "string" || !id) throw new TypeError("Animation geographic child path requires explicit IDs.");
      spend(budget, id.length);
    }
    if (typeof origin.ownerId !== "string" || !origin.ownerId || typeof origin.itemKey !== "string" || !origin.itemKey) throw new TypeError("Animation geographic source requires an owner and item key.");
    spend(budget, origin.ownerId.length + origin.itemKey.length);
    let scopes = programs.get(origin.program);
    if (scopes === undefined) { requireProgram(origin.program); scopes = new Map(); programs.set(origin.program, scopes); }
    const key = JSON.stringify(origin.childPath);
    let context = scopes.get(key);
    if (context === undefined) {
      let program = origin.program;
      const namespaces = [];
      for (const id of origin.childPath) {
        const spec = program.compositionSpec;
        spend(budget, 1 + (spec?.children.length ?? 0));
        if (!spec?.children.includes(id)) throw new TypeError("Animation geographic source has an unknown child path.");
        program = program.children[id]; requireProgram(program);
        namespaces.push(`${spec.id}-${id}`);
      }
      context = { program, childPath: origin.childPath, namespaces, owners: new Map() };
      scopes.set(key, context);
    }
    let items = context.owners.get(origin.ownerId);
    if (items === undefined) {
      spend(budget, context.program.semanticSpec.layers.length);
      const layer = requireLayer(context.program, origin.ownerId);
      if (layer.mark.type !== "geo") throw new TypeError("Animation geographic source requires a geographic mark owner.");
      const source = resolveRegisteredMarkSourceItems(context.program, origin.ownerId, "item", { channels: [] });
      if (source.length > MAX_HIT_INDEX_ITEMS) throw new RangeError("Animation geographic source exceeds its item budget.");
      spend(budget, source.length);
      items = new Map();
      for (const item of source) {
        spend(budget, item.key.length + context.namespaces.reduce((size, namespace) => size + 6 * namespace.length + 2, 0));
        const scoped = context.namespaces.reduceRight((key, namespace) => namespaceItemKey(key, namespace), item.key);
        if (items.has(scoped)) throw new TypeError("Animation geographic source has duplicate item keys.");
        items.set(scoped, item);
      }
      context.owners.set(origin.ownerId, items);
    }
    const item = items.get(origin.itemKey);
    if (item === undefined) throw new TypeError("Animation geographic source item is not owned by its native program.");
    return { context, item };
  };
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
  registerHitFrameSource(frame, { profiles, placements, work: budget.work - initialWork, nodes: new Map(frame.scene.nodes.map(node => [node.key, node])) });
  return frame;
}

// Read the concrete owner placement from the same scene traversal. Empty marks
// still have an unambiguous Canvas; no first-item or first-dataset fallback.
export function programHitOwnerPlacement(base, childPath) {
  const source = hitFrameSource(base);
  if (!source) throw new TypeError("Owner placement requires an authentic program hit frame.");
  const placement = source.placements.get(JSON.stringify(childPath));
  if (!placement) throw new Error("Interaction owner has no materialized Canvas placement.");
  return placement;
}

/** Bind a sampled concrete frame only to the exact program's known node identities. */
export function rebindProgramHitFrame(base, scene, version, rootTransform = [1, 0, 0, 1, 0, 0]) {
  const source = hitFrameSource(base);
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
  registerHitFrameSource(frame, { ...source, sample: owned === source.sample?.scene ? source.sample : undefined,
    nodes: new Map(owned.nodes.map(node => [node.key, node])) });
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

export function currentAnimationGraphFrame(frame, program) {
  const source = hitFrameSource(frame);
  if (source?.sample === undefined || !source.nativeOwners.has(program)) return undefined;
  const proof = animationFrameProvenance(source.sample);
  return proof.graphs === undefined ? undefined : { sample: source.sample, graphs: proof.graphs };
}

export function prepareAnimationHitFrame(sample, version = 0, rootTransform = [1, 0, 0, 1, 0, 0]) {
  const proof = animationFrameProvenance(sample);
  if (proof === undefined) throw new TypeError("Animation hit requires an authentic sampled frame.");
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("Hit frame version must be a non-negative safe integer.");
  if (proof.native === undefined) throw new TypeError("Animation hit requires native endpoint metadata.");
  transformHitPoint(rootTransform, { x: 0, y: 0 });
  const budget = { work: 0 }, entries = [], profiles = new Map(), counted = new Set(), geographicSources = new Map();
  spend(budget, proof.native.owners.length);
  const authorized = new Set(proof.native.owners), geoSource = geoSourceResolver(budget);
  const baseFor = program => {
    let value = nativeBases.get(program);
    if (value === undefined) {
      const base = prepareProgramHitFrame(program, 0, budget);
      value = { base, source: hitFrameSource(base), entries: new Map(base.entries.map(entry => [entry.nodeKey, entry.metadata])) };
      nativeBases.set(program, value);
    } else if (!counted.has(program)) spend(budget, value.source.work);
    counted.add(program);
    return value;
  };
  const resolve = (input, identity) => {
    spend(budget);
    const dynamic = Object.hasOwn(input, "kind");
    const origin = interactionOptions(input, dynamic ? ["kind", "program", "childPath", "ownerId", "itemKey"] : ["program", "index"], [], "Animation native source");
    if (!authorized.has(origin.program)) throw new TypeError("Animation native source requires an exact authorized program.");
    if (dynamic) {
      if (origin.kind !== "geo-feature") throw new TypeError("Unsupported animation native source kind.");
      const { context, item } = geoSource(origin);
      let itemMetadata;
      if (identity !== undefined) {
        validateGraphicIdentity(identity);
        const actual = item.lineage.resource, expected = identity.lineage.resource;
        if (identity.key !== origin.itemKey || identity.lineage.kind !== "resource" || !expected ||
            actual.kind !== expected.kind || actual.id !== expected.id || actual.revision !== expected.revision) {
          throw new TypeError("Animation geographic identity differs from its exact native source.");
        }
        itemMetadata = metadata(identity, context, budget);
        if (itemMetadata.ownerId !== origin.ownerId || itemMetadata.role !== "geo") throw new TypeError("Animation geographic identity differs from its native owner.");
      }
      return { metadata: itemMetadata, metrics: context.program.materializationConfigs.textMetrics, geographicSource: item.lineage.resource };
    }
    const base = baseFor(origin.program), node = base.base.scene.nodes[origin.index];
    if (!Number.isSafeInteger(origin.index) || origin.index < 0 || node === undefined) throw new TypeError("Animation hit requires an exact native endpoint node.");
    return { metadata: base.entries.get(node.key), metrics: base.source.profiles.get(node.key) };
  };
  if (proof.native.nodes.length !== sample.scene.nodes.length) throw new TypeError("Animation hit sources must follow the exact sampled nodes.");
  sample.scene.nodes.forEach((node, zIndex) => {
    const source = proof.native.nodes[zIndex], original = resolve(source.origin, proof.endpoint?.identities[zIndex]);
    if (Object.hasOwn(source.origin, "kind") && original.metadata === undefined) throw new TypeError("Animation geographic hit requires its exact sampled identity.");
    if (original.metadata === undefined) return;
    const values = source.metrics.map(origin => resolve(origin).metrics);
    const metrics = node.type === "weighted-blend" ? values : values[0];
    const shape = prepareConcreteHitShape(node, metrics, rootTransform);
    spend(budget, hitShapeWork(shape)); profiles.set(node.key, metrics);
    entries.push(freezeOwned({ nodeKey: node.key, zIndex, metadata: original.metadata, shape }));
    if (original.geographicSource !== undefined) geographicSources.set(original.metadata.itemKey, original.geographicSource);
  });
  const frame = freezeOwned({ scene: sample.scene, entries: freezeOwned(entries), version });
  registerHitFrameSource(frame, { profiles, geographicSources, sample, nativeOwners: authorized, placements: baseFor(proof.native.placement).source.placements,
    nodes: new Map(frame.scene.nodes.map(node => [node.key, node])) });
  return frame;
}
