import { cloneAndFreeze } from "../../core/immutable.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { createGeometryBudget, snapshotGeometryJSON } from "../../grammar/geo/input.js";
import { normalizeGeoStyle } from "../../grammar/geo/mark.js";
import { geoPartsTopology } from "../../grammar/geo/markGeometry.js";
import { validateGraphicClip } from "../../grammar/schemas/graphicClip.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { validateGraphicIdentity } from "../../grammar/schemas/graphicIdentity.js";
import { normalizeAnimationGeoGroup, resolveAnimationGeoGeometry } from "../../grammar/animation/geoState.js";
import { namespaceGraphicId } from "../../selectors/graphicCapacity.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { materializeFillItemsInPlot } from "../fillPaint.js";
import { geoAppearanceValues, geoFeatureAppearance } from "../geo/appearance.js";
import { geoMarkSource } from "../geo/source.js";
import { projectGeoAnimationGroup } from "./geo.js";

const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const token = identity => JSON.stringify([identity.key, identity.role]);
const nativeOrigins = new WeakMap();
export function geoAnimationItemKey(geometry, featureKey) {
  const [scope, owner] = JSON.parse(geometry.key);
  return JSON.stringify([scope, owner, "geo", [geometry.logicalId, featureKey]]);
}
export function geoAnimationFeatureOrigin(state, group, featureKey, required = true) {
  const origin = nativeOrigins.get(state)?.[group]?.get(featureKey);
  if (required && origin === undefined) throw new TypeError("Geo native origin requires an exact prepared feature.");
  return origin;
}
// Current meaning retains only exact native feature associations, never the
// earlier plan or its sampled frame. Offline states carry no native authority.
export function inheritGeoAnimationOrigins(state, source, groups) {
  const origins = nativeOrigins.get(source);
  if (origins === undefined) return state;
  if (groups.length !== state.groups.length) throw new TypeError("Geo origin groups must follow current meaning.");
  nativeOrigins.set(state, state.groups.map((group, index) => {
    const previous = source.groups[groups[index]]?.presentation.geometry, current = group.presentation.geometry;
    if (previous === undefined || previous.key !== current.key || !same(previous.binding, current.binding) || !same(previous.projection, current.projection)) throw new TypeError("Geo origin differs from its exact target resource.");
    const result = new Map();
    for (const feature of current.features) {
      const origin = origins[groups[index]].get(feature.key);
      if (origin === undefined || origin.itemKey !== geoAnimationItemKey(current, feature.key)) throw new TypeError("Geo origin lacks its exact feature key.");
      result.set(feature.key, origin);
    }
    return result;
  }));
  return state;
}
function closed(input, keys, label) {
  ownRecord(input, label); rejectUnknownProperties(input, keys, label);
  if (keys.some(key => !Object.hasOwn(input, key) || input[key] === undefined)) throw new TypeError(`${label} requires every declared field.`);
}
function tuple(value, length, label) {
  ownArray(value, label);
  if (value.length !== length || value.some(n => !Number.isFinite(n))) throw new TypeError(`${label} requires a finite tuple.`);
}
function rectangle(value) {
  tuple(value, 4, "Geo frame clip");
  validateGraphicClip({ x: value[0], y: value[1], width: value[2], height: value[3] });
}

// Store source paint once, before bounds-dependent pattern materialization.
// Native streaming and native paint owners produce current concrete parts.
export function normalizeGeoAnimationPresentation(input) {
  const value = snapshotGeometryJSON(input, createGeometryBudget());
  closed(value, ["geometry", "styles", "plotOrigin", "frame"], "Geo animation presentation");
  normalizeAnimationGeoGroup(value.geometry);
  ownArray(value.styles, "Geo feature styles");
  if (value.styles.length !== value.geometry.features.length) throw new TypeError("Geo styles must follow every prepared feature.");
  for (const [index, style] of value.styles.entries()) {
    ownRecord(style, "Geo feature style");
    if (Object.hasOwn(style, "clip") || Object.hasOwn(style, "radiusPx")) throw new TypeError("Geo style cannot duplicate geometry or frame state.");
    const { radiusPx: _radius, clip: _clip, ...normalized } = normalizeGeoStyle(value.geometry.binding.mode,
      { ...style, radiusPx: value.geometry.features[index].radiusPx, clip: false }, undefined, true);
    if (!same(style, normalized)) throw new TypeError("Geo feature style must be normalized.");
  }
  tuple(value.plotOrigin, 2, "Geo plot origin");
  closed(value.frame, ["offset", "clip", "clips"], "Geo animation frame");
  tuple(value.frame.offset, 2, "Geo frame offset"); rectangle(value.frame.clip);
  ownArray(value.frame.clips, "Geo frame clips");
  for (const clip of value.frame.clips) Array.isArray(clip) ? rectangle(clip) : validateGraphicClip(clip);
  return value;
}

export function resolveGeoAnimationPresentation(input) {
  const presentation = normalizeGeoAnimationPresentation(input), { geometry, styles, plotOrigin } = presentation;
  const projected = resolveAnimationGeoGeometry(geometry), graphics = [];
  const lineage = { kind: "resource", resource: geometry.binding.geometry ?? geometry.projection };
  for (const [index, feature] of projected.features.entries()) {
    const key = geoAnimationItemKey(geometry, feature.key), topology = geoPartsTopology(feature.parts);
    for (const part of feature.parts) {
      const identity = { key, topology, role: part.role, lineage }; validateGraphicIdentity(identity);
      graphics.push({ type: part.type, properties: materializeMarkEffectProperties({ ...styles[index], ...part.properties }), identity });
    }
  }
  validateGeneratedItemLimit(graphics.length, "Animated Geo parts");
  const concrete = materializeFillItemsInPlot(graphics, { plotOrigin });
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return cloneAndFreeze({ graphics: concrete, frame: presentation.frame, diagnostics: projected.diagnostics });
}

// An empty native collection still owns a frame and drawing-order slot. Traverse
// explicit composition children rather than inferring scopes from visible nodes.
export function projectGeoAnimationPresentations(program, endpoint) {
  if (endpoint.graphicSpec !== program.graphicSpec || !Array.isArray(endpoint.collections)) throw new TypeError("Geo animation admission requires its exact native endpoint.");
  const placements = new Map(endpoint.collections.map(value => [value.graphicId, value]));
  const drawingOrder = new Map(endpoint.collections.map((value, index) => [value.graphicId, index])), groupOrder = new Map(), origins = new Map();
  const groups = [], items = endpoint.scene.nodes.map(() => null), byOwner = new Map(), inputBudget = createGeometryBudget(); let work = 0;
  const pending = [{ unit: program, scope: [], childPath: [], ancestors: new Set() }];
  while (pending.length) {
    const { unit, scope, childPath, ancestors } = pending.pop(); validateWorkLimit(++work, "Geo animation scope traversal");
    if (ancestors.has(unit) || scope.length > 128) throw new TypeError("Geo animation scope contains a cycle or exceeds its depth limit.");
    const nextAncestors = new Set(ancestors).add(unit);
    if (unit.compositionSpec !== undefined) {
      for (const childId of [...unit.compositionSpec.children].reverse()) {
        const child = unit.children[childId];
        if (child === undefined) throw new TypeError("Geo animation composition child is missing.");
        pending.push({ unit: child, scope: [...scope, `${unit.compositionSpec.id}-${childId}`], childPath: [...childPath, childId], ancestors: nextAncestors });
      }
      continue;
    }
    for (const layer of unit.semanticSpec.layers) {
      validateWorkLimit(++work, "Geo animation layer traversal");
      if (layer.mark.type !== "geo" || layer.geoBinding.mode === "annotation") continue;
      const graphicId = scope.reduceRight((id, namespace) => namespaceGraphicId(namespace, id), layer.id), placement = placements.get(graphicId);
      if (placement === undefined) throw new TypeError("Geo animation requires its materialized native collection.");
      const config = unit.materializationConfigs.marks[layer.id].geo, source = geoMarkSource(unit, layer, config);
      const mapped = geoAppearanceValues(unit, layer, source.drawableFeatures), plot = resolveCoordinateBounds(unit, layer.coordinate);
      const presentation = normalizeGeoAnimationPresentation({ geometry: projectGeoAnimationGroup(unit, layer, scope),
        styles: source.drawableFeatures.map((feature, index) => geoFeatureAppearance(config, source.binding, mapped, index).style),
        plotOrigin: [plot.x, plot.y], frame: { offset: placement.offset, clip: placement.clip, clips: placement.clips } });
      snapshotGeometryJSON(presentation, inputBudget);
      inputBudget.count("features", presentation.geometry.features.length);
      const group = groups.length; validateGeneratedItemLimit(group + 1, "Geo animation groups");
      groups.push({ presentation, insertion: placement.index }); groupOrder.set(presentation.geometry.key, drawingOrder.get(graphicId));
      origins.set(presentation.geometry.key, new Map(presentation.geometry.features.map(feature => [feature.key, Object.freeze({
        kind: "geo-feature", program, childPath: Object.freeze([...childPath]), ownerId: layer.id, itemKey: geoAnimationItemKey(presentation.geometry, feature.key)
      })])));
    }
  }
  groups.sort((a, b) => groupOrder.get(a.presentation.geometry.key) - groupOrder.get(b.presentation.geometry.key));
  groups.forEach((group, index) => byOwner.set(group.presentation.geometry.key, index));
  const expected = groups.map(({ presentation }) => new Map(resolveGeoAnimationPresentation(presentation).graphics.map(graphic => [token(graphic.identity), graphic])));
  for (const [index, identity] of endpoint.identities.entries()) {
    if (identity === undefined) continue;
    const [scope, owner, kind, grain] = JSON.parse(identity.key), group = byOwner.get(JSON.stringify([scope, owner]));
    if (group === undefined) continue;
    const graphic = expected[group].get(token(identity)), native = endpoint.scene.nodes[index];
    if (kind !== "geo" || graphic === undefined || !same(identity.lineage, graphic.identity.lineage)) throw new TypeError("Geo animation identity differs from its exact native feature and resource.");
    expected[group].delete(token(identity));
    const frame = groups[group].presentation.frame;
    items[index] = { group, key: grain[1], role: identity.role,
      ...(!same(native.properties, graphic.properties) || native.type !== graphic.type || native.topology !== graphic.identity.topology ||
        !same({ offset: native.offset, clip: native.clip, clips: native.clips }, frame) ? { reason: "edited-geo-graphics" } : {}) };
  }
  const edited = new Set(items.filter(item => item?.reason).map(item => item.group));
  for (const [group, missing] of expected.entries()) if (missing.size || edited.has(group)) {
    groups[group].reason = "edited-geo-graphics";
  }
  const state = cloneAndFreeze({ groups, items });
  validateGeoAnimationPresentations(state, endpoint);
  nativeOrigins.set(state, groups.map(group => origins.get(group.presentation.geometry.key)));
  return state;
}


// Offline and sampled endpoints use this same closed admission. A group may be
// wholly hidden, but its exact identity and explicit drawing-order slot remain.
export function validateGeoAnimationPresentations(input, endpoint) {
  const state = snapshotGeometryJSON(input, createGeometryBudget());
  closed(state, ["groups", "items"], "Animation Geo state");
  ownArray(state.groups, "Animation Geo groups"); ownArray(state.items, "Animation Geo items");
  validateGeneratedItemLimit(state.groups.length, "Animation Geo groups");
  if (state.items.length !== endpoint.scene.nodes.length) throw new TypeError("Geo items must follow every endpoint node.");
  const owners = new Map(), expected = [], featureKeys = [], represented = state.groups.map(() => new Set()); let work = 0, points = 0, previous = -1;
  for (const [index, group] of state.groups.entries()) {
    closed(group, ["presentation", "insertion", ...(Object.hasOwn(group, "reason") ? ["reason"] : [])], "Animation Geo group presentation");
    if (!Number.isSafeInteger(group.insertion) || group.insertion < 0 || group.insertion < previous || group.insertion > endpoint.scene.nodes.length) throw new TypeError("Geo group insertion must follow bounded endpoint drawing order.");
    previous = group.insertion;
    const presentation = normalizeGeoAnimationPresentation(group.presentation), key = presentation.geometry.key;
    if (owners.has(key)) throw new TypeError("Animation Geo owners must be unique."); owners.set(key, index);
    featureKeys.push(new Set(presentation.geometry.features.map(feature => geoAnimationItemKey(presentation.geometry, feature.key))));
    if (Object.hasOwn(group, "reason") && group.reason !== "edited-geo-graphics") throw new TypeError("Unknown Geo group fallback reason.");
    const resolved = resolveGeoAnimationPresentation(presentation);
    validateWorkLimit(work += resolved.diagnostics.work, "Animation Geo state work");
    validateGeneratedItemLimit(points += resolved.diagnostics.points, "Animation Geo state points");
    expected.push(new Map(resolved.graphics.map(graphic => [token(graphic.identity), graphic])));
  }
  for (const [index, item] of state.items.entries()) {
    const identity = endpoint.identities[index], owner = identity === undefined ? undefined : JSON.stringify(JSON.parse(identity.key).slice(0, 2));
    if (item === null) {
      const group = owners.get(owner);
      if (group !== undefined && featureKeys[group].has(identity.key)) throw new TypeError("Geo source identity requires its prepared item.");
      continue;
    }
    closed(item, ["group", "key", "role", ...(Object.hasOwn(item, "reason") ? ["reason"] : [])], "Animation Geo item");
    if (!Number.isSafeInteger(item.group) || item.group < 0 || item.group >= state.groups.length || typeof item.key !== "string" || !item.key || typeof item.role !== "string" || !item.role) throw new TypeError("Geo item requires a bounded group and explicit feature/part keys.");
    const group = state.groups[item.group], graphic = identity === undefined ? undefined : expected[item.group].get(token(identity));
    if (owners.get(owner) !== item.group || graphic === undefined || !same(identity, graphic.identity) || JSON.parse(identity.key)[3][1] !== item.key || identity.role !== item.role) throw new TypeError("Geo item differs from its exact feature part and resource lineage.");
    represented[item.group].add(token(identity));
    if (Object.hasOwn(item, "reason") && (item.reason !== "edited-geo-graphics" || group.reason !== item.reason)) throw new TypeError("Unknown or inconsistent Geo item fallback reason.");
    const node = endpoint.scene.nodes[index];
    if (!item.reason && (node.type !== graphic.type || !same(node.properties, graphic.properties) || node.topology !== identity.topology || !same({offset:node.offset,clip:node.clip,clips:node.clips},group.presentation.frame))) throw new TypeError("Geo prepared meaning differs from the concrete endpoint.");
    if (index < group.insertion) throw new TypeError("Geo item precedes its explicit collection slot.");
  }
  for (const [index, group] of state.groups.entries()) if (!group.reason && represented[index].size !== expected[index].size) throw new TypeError("Geo state omitted a materialized native part.");
  return state;
}
