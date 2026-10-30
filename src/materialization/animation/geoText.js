import { cloneAndFreeze } from "../../core/immutable.js";
import { canonicalJSON, contentDigest } from "../../core/contentDigest.js";
import { ownArray } from "../../core/ownData.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { snapshotGeometryJSON, createGeometryBudget } from "../../grammar/geo/input.js";
import { namespaceItemKey } from "../../grammar/schemas/graphicIdentity.js";
import { resolveGeoAnnotationPosition } from "../../grammar/geo/annotationPosition.js";
import { CONDITIONAL_APPEARANCE_CHANNELS } from "../../grammar/conditionalState.js";
import { namespaceGraphicId } from "../../selectors/graphicCapacity.js";
import { graphicScopes } from "../../selectors/graphicScopes.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { markLabelPlacementLeaderId } from "../../layout/labels.js";
import { geoLabelSource } from "../geo/labels.js";
import { geoLabelPosition } from "../geo/labelAnchors.js";
import { geoFeatureKey, geoMarkSource } from "../geo/source.js";
import { resolveConditionalValues } from "../conditionalValues.js";
import { resolveMarkEffectProperties } from "../markEffects.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { projectGeoLabelEntries } from "./geoLabels.js";
import { projectGeoAnnotationAnimation } from "./geoAnnotation.js";
import { validateGeoAnimationFrame } from "./geoPresentation.js";
import { normalizeGeoTextPresentation, resolveGeoTextPresentation, closedGeoText, sameGeoTextValue as same, geoTextSourceToken } from "./geoTextGeometry.js";

const nativeOrigins = new WeakMap();
const token = identity => JSON.stringify([identity.key, identity.role]);
export const geoTextFeatureDigest = (feature, coordinateKind) => contentDigest(canonicalJSON({ coordinateKind, geometry: feature.geometry,
  ...(coordinateKind === "geographic" ? { polygonWinding: feature.polygonWinding ?? "right-hand" } : {}) }));
export const emptyAnimationGeoTexts = length => cloneAndFreeze({ groups: [], items: Array(length).fill(null), order: [] });
const frame = placement => ({ offset: placement.offset, clip: placement.clip, clips: placement.clips });
const qualify = (key, scope) => scope.reduceRight((key, namespace) => namespaceItemKey(key, namespace), key);
const qualifyGraphic = (id, scope) => scope.reduceRight((id, namespace) => namespaceGraphicId(namespace, id), id);
function bounds(program, kind) {
  const p = kind === "canvas" ? program.graphicSpec.objects.canvas.properties : resolveGraphicBounds(program);
  const x = p.x ?? 0, y = p.y ?? 0;
  return { left: x, right: x + p.width, top: y, bottom: y + p.height };
}
function labelPresentation(program, layer, scope, source) {
  const native = geoMarkSource(program, source, program.materializationConfigs.marks[source.id].geo);
  const features = new Map(native.drawableFeatures.map(feature => [geoFeatureKey(source, native.resource, feature), feature]));
  const config = program.markConfigs[layer.id], entries = projectGeoLabelEntries(program, layer);
  const values = Object.fromEntries(Object.keys(layer.conditionals ?? {}).filter(channel => CONDITIONAL_APPEARANCE_CHANNELS.includes(channel) && !["size", "shape", "angle"].includes(channel))
    .map(channel => [channel === "color" ? "fill" : channel, resolveConditionalValues(program, layer, channel, entries)]));
  const layout = program.materializationConfigs.labelLayouts?.[layer.id], placement = config.labelAuthoring?.placement;
  const policy = layout === undefined ? null : Object.fromEntries(["axis", "padding", "maxDisplacement", "bounds"].map(key => [key, layout[key]]));
  const leader = layout?.leader !== false && layout?.leader !== undefined ? layout.leader : placement?.leader === undefined || placement.leader === false ? false : { ...placement.leader, opacity: 1, strokeDash: [] };
  const plot = resolveCoordinateBounds(program, layer.coordinate);
  return normalizeGeoTextPresentation({ key: JSON.stringify([scope, layer.id]), coordinateKind: native.coordinateKind,
    projection: { kind: "projection", id: native.projection.id, revision: native.projection.revision }, parameters: native.parameters,
    entries: entries.map((entry, index) => {
      const feature = features.get(entry.sourceItem.key);
      if (feature === undefined) throw new TypeError("Geographic Text preparation requires its actual source feature.");
      return { identity: { key: qualify(entry.key, scope), topology: "text", role: "body", lineage: entry.lineage },
        source: { key: entry.sourceItem.key, digest: geoTextFeatureDigest(feature, native.coordinateKind) },
        anchor: geoLabelPosition(feature, native.coordinateKind), properties: resolveMarkEffectProperties(layer, config,
          { ...entry.graphic.properties, ...Object.fromEntries(Object.entries(values).map(([key, values]) => [key, values[index]])) }) };
    }), textMetrics: program.materializationConfigs.textMetrics ?? null, plotOrigin: [plot.x, plot.y],
    layout: policy, leader, bounds: bounds(program, policy?.bounds ?? "plot") });
}
function annotationPresentation(program, layer, scope) {
  const prepared = projectGeoAnnotationAnimation(program, layer, scope), state = prepared.state;
  return normalizeGeoTextPresentation({ key: JSON.stringify([scope, layer.id]), coordinateKind: state.coordinateKind,
    projection: state.projection, parameters: state.parameters, entries: [{ identity: state.identity,
      source: { key: state.identity.key, digest: contentDigest(canonicalJSON({ anchor: state.anchor, feature: state.feature })) },
      anchor: resolveGeoAnnotationPosition(state.anchor, state.feature, state.coordinateKind), properties: prepared.properties }],
    textMetrics: prepared.textMetrics, plotOrigin: prepared.plotOrigin, layout: null, leader: false, bounds: bounds(program, "plot") });
}

export function projectGeoTextAnimations(program, endpoint, geos) {
  if (endpoint.graphicSpec !== program.graphicSpec || endpoint.collections === undefined) throw new TypeError("Geographic Text requires its exact native endpoint.");
  const placements = new Map(endpoint.collections.map(value => [value.graphicId, value])), ordinals = new Map(endpoint.collections.map((value, index) => [value.graphicId, index]));
  const groups = [], origins = new Map(), order = [];
  for (const group of geos.groups) { const [scope, id] = JSON.parse(group.presentation.geometry.key); order.push({ value: ["geo", group.presentation.geometry.key], index: ordinals.get(qualifyGraphic(id, scope)) }); }
  let work = 0;
  const spend = (count = 1) => validateWorkLimit(work += count, "Geographic Text preparation work");
  for (const { program: unit, namespaces: scope, childPath } of graphicScopes(program, spend)) {
    for (const layer of unit.semanticSpec.layers) {
      spend();
      const annotation = layer.mark.type === "geo" && layer.geoBinding.mode === "annotation", source = geoLabelSource(unit, layer);
      if (!annotation && source === undefined) continue;
      const placement = placements.get(qualifyGraphic(layer.id, scope));
      if (placement === undefined) throw new TypeError("Geographic Text requires its native collection slot.");
      const presentation = annotation ? annotationPresentation(unit, layer, scope) : labelPresentation(unit, layer, scope, source);
      spend(presentation.entries.length);
      const config = unit.materializationConfigs.labelLayouts?.[layer.id];
      const leaderId = config?.leader !== false && config?.leader !== undefined ? config.leaderId : markLabelPlacementLeaderId(layer.id);
      const leaderPlacement = placements.get(qualifyGraphic(leaderId, scope));
      const before = source === undefined ? placement : placements.get(qualifyGraphic(source.id, scope)) ?? placement;
      groups.push({ presentation, insertion: placement.index, frame: frame(placement),
        leaderInsertion: presentation.leader === false ? null : leaderPlacement?.index ?? before.index,
        leaderFrame: presentation.leader === false ? null : leaderPlacement === undefined ? placement.parentFrame : frame(leaderPlacement) });
      order.push({ value: ["labels", presentation.key], index: ordinals.get(placement.graphicId) });
      if (presentation.leader !== false) order.push({ value: ["leaders", presentation.key], index: leaderPlacement === undefined ? ordinals.get(before.graphicId) - .5 : ordinals.get(leaderPlacement.graphicId) });
      origins.set(presentation.key, new Map(presentation.entries.map(entry => [entry.identity.key, Object.freeze({ kind: "geo-feature", program,
        childPath: Object.freeze([...childPath]), ownerId: layer.id, itemKey: entry.identity.key })])));
    }
  }
  groups.sort((a, b) => a.insertion - b.insertion);
  const byOwner = new Map(groups.map((group, index) => [group.presentation.key, index]));
  const expected = groups.map(({ presentation }) => { const result = resolveGeoTextPresentation(presentation, spend); return new Map([...result.labels, ...result.leaders].map(graphic => [token(graphic.identity), graphic])); });
  const items = endpoint.identities.map((identity, index) => {
    if (identity === undefined) return null;
    const group = byOwner.get(JSON.stringify(JSON.parse(identity.key).slice(0, 2)));
    if (group === undefined) return null;
    const graphic = expected[group].get(token(identity)), node = endpoint.scene.nodes[index];
    if (graphic === undefined) { groups[group].reason = "edited-geo-graphics"; return null; }
    expected[group].delete(token(identity));
    const currentFrame = identity.role === "leader" ? groups[group].leaderFrame : groups[group].frame;
    const edited = !same(identity, graphic.identity) || node.type !== graphic.type || !same(node.properties, graphic.properties) || !same(frame(node), currentFrame);
    if (edited) groups[group].reason = "edited-geo-graphics";
    return { group, key: identity.key, role: identity.role, ...(edited ? { reason: "edited-geo-graphics" } : {}) };
  });
  expected.forEach((missing, index) => { if (missing.size) groups[index].reason = "edited-geo-graphics"; });
  const state = cloneAndFreeze({ groups, items, order: order.sort((a, b) => a.index - b.index).map(entry => entry.value) });
  validateGeoTextAnimations(state, endpoint, geos);
  nativeOrigins.set(state, groups.map(group => origins.get(group.presentation.key)));
  return state;
}

export function validateGeoTextAnimations(input, endpoint, geos) {
  const value = snapshotGeometryJSON(input, createGeometryBudget());
  closedGeoText(value, ["groups", "items", "order"], "Geographic Text state"); ownArray(value.groups, "Geographic Text groups"); ownArray(value.items, "Geographic Text items");
  validateGeneratedItemLimit(value.groups.length, "Geographic Text groups");
  if (value.items.length !== endpoint.scene.nodes.length) throw new TypeError("Geographic Text items must follow every endpoint node.");
  const owners = new Map(), expected = [], represented = [], sources = new Map(); let previous = -1, work = 0;
  const account = amount => validateWorkLimit(work += amount, "Geographic Text state work");
  const geoSources = new Map((geos?.groups ?? []).map(group => {
    const geometry = group.presentation.geometry; account(geometry.features.length);
    return [geometry.key, { geometry, features: new Map(geometry.features.map(feature => [feature.key, feature])) }];
  }));
  for (const [index, group] of value.groups.entries()) {
    closedGeoText(group, ["presentation", "insertion", "frame", "leaderInsertion", "leaderFrame", ...(Object.hasOwn(group, "reason") ? ["reason"] : [])], "Geographic Text group");
    const p = normalizeGeoTextPresentation(group.presentation);
    if (owners.has(p.key)) throw new TypeError("Geographic Text group owners must be unique."); owners.set(p.key, index);
    for (const slot of [group.insertion, ...(group.leaderInsertion === null ? [] : [group.leaderInsertion])]) if (!Number.isSafeInteger(slot) || slot < 0 || slot > endpoint.scene.nodes.length) throw new TypeError("Geographic Text requires a bounded drawing slot.");
    if (group.insertion < previous || (p.leader === false) !== (group.leaderInsertion === null) || (p.leader === false) !== (group.leaderFrame === null)) throw new TypeError("Geographic Text drawing order or leader placement is inconsistent.");
    previous = group.insertion; validateGeoAnimationFrame(group.frame); if (group.leaderFrame !== null) validateGeoAnimationFrame(group.leaderFrame);
    if (group.reason !== undefined && group.reason !== "edited-geo-graphics") throw new TypeError("Unknown geographic Text fallback reason.");
    for (const entry of p.entries) {
      validateWorkLimit(++work, "Geographic Text state work");
      const sourceToken = geoTextSourceToken(entry);
      if (sources.has(sourceToken) && !same(sources.get(sourceToken), entry.anchor)) throw new TypeError("One geographic source cannot have contradictory raw anchors.");
      sources.set(sourceToken, entry.anchor);
      const id = JSON.parse(entry.identity.key);
      if (endpoint.format !== "native" || id[2] !== "text") continue;
      const source = JSON.parse(entry.source.key), prepared = geoSources.get(JSON.stringify([id[0], source[1]]));
      const geometry = prepared?.geometry, feature = prepared?.features.get(source[3][1]);
      if (feature === undefined || !same(entry.identity.lineage.resource, geometry.binding.geometry ?? geometry.projection) ||
          geoTextFeatureDigest(feature, geometry.coordinateKind) !== entry.source.digest || !same(geoLabelPosition(feature, geometry.coordinateKind), entry.anchor) || !same(p.parameters, geometry.parameters) || !same(p.projection, geometry.projection)) throw new TypeError("Native geographic Text differs from its exact source geometry and camera.");
    }
    const output = resolveGeoTextPresentation(p, account);
    expected.push(new Map([...output.labels, ...output.leaders].map(graphic => [token(graphic.identity), graphic]))); represented.push(new Set());
  }
  for (const [index, item] of value.items.entries()) {
    const identity = endpoint.identities[index], owner = identity === undefined ? undefined : owners.get(JSON.stringify(JSON.parse(identity.key).slice(0, 2)));
    if (item === null) {
      if (owner !== undefined && !value.groups[owner].reason && expected[owner].has(token(identity))) throw new TypeError("Geographic Text source identity requires its prepared item.");
      continue;
    }
    closedGeoText(item, ["group", "key", "role", ...(Object.hasOwn(item, "reason") ? ["reason"] : [])], "Geographic Text item");
    const group = value.groups[item.group], graphic = expected[item.group]?.get(token(identity));
    if (!Number.isSafeInteger(item.group) || owner !== item.group || graphic === undefined || item.key !== identity.key || item.role !== identity.role || !same(identity, graphic.identity)) throw new TypeError("Geographic Text item differs from its native source identity.");
    const node = endpoint.scene.nodes[index], currentFrame = item.role === "leader" ? group.leaderFrame : group.frame;
    if (item.reason !== undefined && (item.reason !== "edited-geo-graphics" || group.reason !== item.reason)) throw new TypeError("Geographic Text item fallback is inconsistent.");
    if (!group.reason && (node.type !== graphic.type || !same(node.properties, graphic.properties) || !same(frame(node), currentFrame))) throw new TypeError("Geographic Text meaning differs from its concrete endpoint.");
    if (index < (item.role === "leader" ? group.leaderInsertion : group.insertion)) throw new TypeError("Geographic Text item precedes its drawing slot.");
    represented[item.group].add(token(identity));
  }
  value.groups.forEach((group, index) => { if (!group.reason && represented[index].size !== expected[index].size) throw new TypeError("Geographic Text state omitted a materialized item."); });
  ownArray(value.order, "Geographic Text drawing order");
  const expectedOrder = new Set([...value.groups.flatMap(group => [["labels", group.presentation.key], ...(group.presentation.leader === false ? [] : [["leaders", group.presentation.key]])]), ...(geos?.groups ?? []).map(group => ["geo", group.presentation.geometry.key])].map(JSON.stringify));
  const drawingSlots = new Map([...(geos?.groups ?? []).map(group => [JSON.stringify(["geo", group.presentation.geometry.key]), group.insertion]),
    ...value.groups.flatMap(group => [[JSON.stringify(["labels", group.presentation.key]), group.insertion], [JSON.stringify(["leaders", group.presentation.key]), group.leaderInsertion]])]);
  let lastSlot = -1;
  for (const entry of value.order) {
    ownArray(entry, "Geographic Text drawing role"); const token = JSON.stringify(entry);
    if (!expectedOrder.delete(token)) throw new TypeError("Geographic Text drawing order has an unknown or repeated owner.");
    const slot = drawingSlots.get(token);
    if (slot < lastSlot) throw new TypeError("Geographic Text drawing order differs from its concrete slots.");
    lastSlot = slot;
  }
  if (expectedOrder.size) throw new TypeError("Geographic Text drawing order omitted a native owner.");
  return value;
}
export function geoTextAnimationOrigin(state, group, key) { return nativeOrigins.get(state)?.[group]?.get(key); }
export function inheritGeoTextOrigins(state, source, indices) {
  const origins = nativeOrigins.get(source); if (origins === undefined) return state;
  nativeOrigins.set(state, state.groups.map((group, index) => {
    const old = source.groups[indices[index]];
    if (old === undefined || group.presentation.key !== old.presentation.key) throw new TypeError("Geographic Text origin must retain its target owner.");
    return origins[indices[index]];
  })); return state;
}
