import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { DEFAULT_FONT_FAMILY, FONT_IDENTITY_KEYS, textMetricFontWeight } from "../../core/font.js";
import { fontMetricBinding } from "../../core/textMetrics.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { animationOwnerKey } from "../../grammar/animation/ownerKey.js";
import { guideAnimationKey, normalizeGuideIdentity } from "../../grammar/animation/guideState.js";
import { validateAnimationPlacement } from "../../grammar/animation/placement.js";
import { axisTitleAllowsLabelOverlap, axisTitleFollowsLabels } from "../../grammar/axisTextPlacement.js";
import { resolveDisplayLabelColor } from "../../grammar/displayLabels.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { validateFontPayload } from "../../grammar/fontPayload.js";
import { cartesianAxisOwners, axisGraphicIds } from "../../selectors/axes.js";
import { graphicScopes } from "../../selectors/graphicScopes.js";
import { namespaceGraphicId } from "../../selectors/graphicCapacity.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { findCanvasGraphic } from "../graphicHierarchy.js";
import { resolveCartesianAxisFrameBounds } from "../coordinateBounds.js";
import { valuesFromTickConfig } from "../guides/tickValues.js";
import { concreteFontValue } from "../fontState.js";
import { normalizeAxisLabelReflow, prepareAxisLabelReflow, resolveAxisLabelReflow, axisLabelReflowMatchesNodes } from "./axisLabelReflowState.js";

const same = (a, b) => canonicalJSON(a) === canonicalJSON(b);
const scalarKey = value => JSON.stringify(encodeValue(value));
const qualify = (id, scope) => scope.reduceRight((id, namespace) => namespaceGraphicId(namespace, id), id);
const frame = placement => ({ offset: placement.offset, clip: placement.clip, clips: placement.clips });
const nonAppearance = new Set(["x", "y", "text", "rotation", "textAlign", "textBaseline", "fontFamily", "fontSize", "fontWeight", "fontStyle", "font", "lines"]);
const nativeOrigins = new WeakMap();
const empty = length => cloneAndFreeze({ groups: [], items: Array(length).fill(null) });
function closed(input, keys, label) {
  ownRecord(input, label); rejectUnknownProperties(input, keys, label);
  if (keys.some(key => !Object.hasOwn(input, key))) throw new TypeError(`${label} requires every field.`);
}
function budget(accountWork) {
  let work = 0;
  return (count = 1) => { validateWorkLimit(work += count, "Axis label group work"); accountWork?.(count); };
}
export function axisLabelGroupIdentity(group, value, line) {
  return normalizeGuideIdentity({ namespaces: group.scope.namespaces, owner: group.scope.owner, component: "labels", value, line });
}
export function axisLabelGroupKey(scope) { return JSON.stringify([scope.namespaces, scope.owner, "labels"]); }
function fontProperties(group) {
  const config = group.layout.config.base;
  return { fontFamily: config.fontFamily, fontSize: config.fontSize, fontWeight: config.fontWeight,
    ...(group.presentation.font === null ? {} : { font: group.presentation.font }) };
}
function comparable(properties) {
  const { rotation = 0, fontFamily = DEFAULT_FONT_FAMILY, fontWeight, fontStyle = "normal", ...rest } = properties;
  return { ...rest, rotation, fontFamily, fontWeight: textMetricFontWeight(fontWeight), fontStyle };
}
export function resolveAxisLabelGroup(group, accountWork) {
  const result = resolveAxisLabelReflow(group.layout, accountWork);
  const styles = new Map(group.layout.values.map((value, index) => [scalarKey(value), group.presentation.styles[index]]));
  return result.entries.map(entry => ({ identity: axisLabelGroupIdentity(group, entry.value, entry.line), type: "text",
    properties: { ...styles.get(scalarKey(entry.value)), ...fontProperties(group), ...entry.properties }, frame: group.placement.frame }));
}
function normalizeGroup(input, length, spend) {
  closed(input, ["key", "scope", "layout", "presentation", "placement", ...(Object.hasOwn(input, "reason") ? ["reason"] : [])], "Axis label group");
  closed(input.scope, ["namespaces", "owner", "channel"], "Axis label scope");
  animationOwnerKey(input.scope.namespaces, input.scope.owner);
  if (input.key !== axisLabelGroupKey(input.scope) || !["x", "y"].includes(input.scope.channel)) throw new TypeError("Axis label group requires exact native scope.");
  spend(input.key.length);
  const layout = normalizeAxisLabelReflow(input.layout, spend);
  if (layout.channel !== input.scope.channel) throw new TypeError("Axis label group channel differs from its layout.");
  closed(input.presentation, ["styles", "font"], "Axis label presentation");
  ownArray(input.presentation.styles, "Axis label raw styles");
  if (input.presentation.styles.length !== layout.values.length) throw new TypeError("Axis label styles must follow every raw value.");
  const binding = fontMetricBinding(layout.metrics, { ...layout.config.base, fontStyle: "normal" }), font = input.presentation.font;
  if (binding === undefined ? font !== null : font === null) throw new TypeError("Axis label font must match its exact measured binding.");
  if (font !== null) {
    validateFontPayload(font);
    if (["contentHash", ...FONT_IDENTITY_KEYS].some(key => font[key] !== binding.identity[key])) throw new TypeError("Axis label concrete font differs from its metric identity.");
  }
  const group = { ...input, layout };
  for (const style of input.presentation.styles) {
    ownRecord(style, "Axis label appearance"); spend(1 + Object.keys(style).length);
    if (Object.keys(style).some(key => nonAppearance.has(key) || key === "fillBounds")) throw new TypeError("Axis label appearance cannot duplicate layout or font meaning.");
    validateConcreteGraphicProperties("text", { ...style, ...fontProperties(group), text: "", x: 0, y: 0, textAlign: "center", textBaseline: "top" });
  }
  closed(input.placement, ["insertion", "ordinal", "frame"], "Axis label placement");
  if (!Number.isSafeInteger(input.placement.insertion) || input.placement.insertion < 0 || input.placement.insertion > length ||
      !Number.isSafeInteger(input.placement.ordinal) || input.placement.ordinal < 0) throw new TypeError("Axis label placement requires an actual bounded drawing slot.");
  validateGeneratedItemLimit(input.placement.ordinal, "Axis label collection ordinal");
  validateAnimationPlacement(input.placement.frame, "Axis label");
  if (Object.hasOwn(input, "reason") && input.reason !== "guide-edited") throw new TypeError("Unknown axis label group fallback reason.");
  return cloneAndFreeze(group);
}
export function validateAxisLabelGroups(input, endpoint, accountWork) {
  closed(input, ["groups", "items"], "Axis label groups");
  ownArray(input.groups, "Axis label groups"); ownArray(input.items, "Axis label item meanings");
  validateGeneratedItemLimit(input.groups.length, "Axis label group count");
  validateGeneratedItemLimit(input.items.length, "Axis label endpoint nodes");
  if (input.items.length !== endpoint.scene.nodes.length) throw new TypeError("Axis label meanings must follow actual endpoint nodes.");
  const spend = budget(accountWork), groups = [], owners = new Set(), expected = [], represented = [], backgrounds = new Set(endpoint.backgrounds.map(value => value.index));
  const placements = new Map((endpoint.collections ?? []).map((p, ordinal) => [p.graphicId, { ...p, ordinal }]));
  let previousOrdinal = -1, previousInsertion = -1, potentialNodes = 0;
  for (const inputGroup of input.groups) {
    const group = normalizeGroup(inputGroup, input.items.length, spend), placement = group.placement;
    if (owners.has(group.key)) throw new TypeError("Axis label groups require unique native owners."); owners.add(group.key);
    if (placement.ordinal <= previousOrdinal || placement.insertion < previousInsertion) throw new TypeError("Axis label group order differs from native drawing order.");
    previousOrdinal = placement.ordinal; previousInsertion = placement.insertion;
    if (endpoint.format === "native") {
      const id = qualify(axisGraphicIds(group.scope.channel, group.scope.owner)[2], group.scope.namespaces), actual = placements.get(id);
      if (actual === undefined || actual.index !== placement.insertion || actual.ordinal !== placement.ordinal || !same(frame(actual), placement.frame)) throw new TypeError("Axis label group requires its exact native collection slot.");
    }
    groups.push(group); represented.push([]);
    validateGeneratedItemLimit(potentialNodes += resolveAxisLabelReflow(group.layout, spend).maxNodes, "Axis label total potential lines");
    expected.push(resolveAxisLabelGroup(group, spend));
  }
  const items = input.items.map((item, index) => {
    spend(); if (item === null) return null;
    closed(item, ["group", "value", "line"], "Axis label item");
    const group = groups[item.group];
    if (!Number.isSafeInteger(item.group) || group === undefined || endpoint.identities[index] !== undefined || backgrounds.has(index)) throw new TypeError("Axis label meaning cannot replace another native owner.");
    const identity = axisLabelGroupIdentity(group, item.value, item.line), key = guideAnimationKey(identity);
    const output = expected[item.group][represented[item.group].length];
    if (output === undefined || key !== guideAnimationKey(output.identity) || index !== group.placement.insertion + represented[item.group].length) throw new TypeError("Axis label item differs from its exact native raw value and line order.");
    const node = endpoint.scene.nodes[index];
    if (!Object.hasOwn(group, "reason") && (node.type !== "text" || !same(comparable(node.properties), comparable(output.properties)) || !same(frame(node), output.frame))) throw new TypeError("Axis label meaning differs from its concrete endpoint.");
    if (endpoint.format === "native") {
      const id = qualify(axisGraphicIds(group.scope.channel, group.scope.owner)[2], group.scope.namespaces);
      const object = endpoint.graphicSpec.objects[id];
      if (endpoint.sources[index].graphicId !== object.items[represented[item.group].length]?.id) throw new TypeError("Axis label item differs from its native collection membership.");
    }
    represented[item.group].push(key); return { ...item };
  });
  groups.forEach((group, index) => { if (represented[index].length !== expected[index].length) throw new TypeError("Axis label group omitted a current line."); });
  return cloneAndFreeze({ groups, items });
}
function nativeLayout(program, owner, config) {
  const canvas = findCanvasGraphic(program).properties, canvasConfig = program.materializationConfigs.canvas;
  const titleId = axisGraphicIds(owner.channel, owner.id)[3], titleConfig = owner.config.title;
  const titleBounds = program.graphicSpec.objects[titleId] !== undefined && !axisTitleAllowsLabelOverlap(titleConfig) && !axisTitleFollowsLabels(titleConfig)
    ? resolveConcreteGraphicBounds(program.graphicSpec, titleId, program.materializationConfigs.textMetrics) : undefined;
  return prepareAxisLabelReflow({ values: valuesFromTickConfig(program, config), scale: program.resolvedScales[config.scale], config,
    channel: owner.channel, frame: resolveCartesianAxisFrameBounds(program, owner.channel, config.position, config.scale, owner.id),
    canvas: { width: canvas.width, height: canvas.height }, profile: program.materializationConfigs.textMetrics,
    edgeAligned: canvasConfig?.plot !== undefined || canvasConfig?.responsive !== undefined,
    responsive: canvasConfig?.responsive, margin: canvasConfig?.margin, titleBounds });
}
export function projectAxisLabelGroups(program, endpoint) {
  if (endpoint.graphicSpec !== program.graphicSpec || endpoint.collections === undefined) throw new TypeError("Axis label groups require their exact native endpoint.");
  const placements = new Map(endpoint.collections.map((value, ordinal) => [value.graphicId, { ...value, ordinal }]));
  const sceneById = new Map(endpoint.sources.map((source, index) => [source.graphicId, endpoint.scene.nodes[index]]));
  const groups = [], itemGroups = new Map(), origins = new Map(), spend = budget();
  for (const { program: unit, namespaces, childPath } of graphicScopes(program, spend)) {
    for (const owner of cartesianAxisOwners(unit)) {
      const config = owner.config.labels, id = axisGraphicIds(owner.channel, owner.id)[2], object = unit.graphicSpec.objects[id];
      if (config === undefined || object === undefined || config.maxWidth === undefined && config.responsive === undefined) continue;
      const rawValues = valuesFromTickConfig(unit, config); spend(rawValues.length);
      // Native duplicated ticks keep their existing ambiguous enter/exit path.
      if (new Set(rawValues.map(scalarKey)).size !== rawValues.length) continue;
      const layout = nativeLayout(unit, owner, config), output = resolveAxisLabelReflow(layout).entries;
      if (object.items?.length !== output.length) throw new TypeError("Axis label collection has stale native line correspondence.");
      const slot = placements.get(qualify(id, namespaces));
      if (slot === undefined) throw new TypeError("Axis label group requires its native drawing slot.");
      const scope = { namespaces, owner: owner.id, channel: owner.channel }, key = axisLabelGroupKey(scope);
      const binding = fontMetricBinding(layout.metrics, { ...layout.config.base, fontStyle: "normal" });
      const font = binding === undefined ? null : concreteFontValue(requireStoredResource(unit, binding.resource));
      const styles = layout.values.map(value => ({ fill: resolveDisplayLabelColor(value, config.colorMap, config.color) }));
      const group = { key, scope, layout, presentation: { styles, font }, placement: { insertion: slot.index, ordinal: slot.ordinal, frame: frame(slot) } };
      const nativeNodes = object.items.map(item => ({ type: item.type ?? object.type, properties: item.properties }));
      const byValue = new Map(layout.values.map((value, index) => [scalarKey(value), index])), seen = new Set();
      if (!axisLabelReflowMatchesNodes(layout, nativeNodes)) group.reason = "guide-edited";
      for (const [index, entry] of output.entries()) {
        const valueIndex = byValue.get(scalarKey(entry.value)), properties = nativeNodes[index].properties;
        const graphicId = qualify(object.items[index].id, namespaces), actual = sceneById.get(graphicId);
        if (actual === undefined || !same(frame(actual), group.placement.frame)) group.reason = "guide-edited";
        const style = Object.fromEntries(Object.entries(properties).filter(([key]) => !nonAppearance.has(key)));
        if (Object.hasOwn(properties, "fillBounds") || !same(properties.font ?? null, font)) group.reason = "guide-edited";
        if (!group.reason && seen.has(valueIndex) && !same(styles[valueIndex], style)) group.reason = "guide-edited";
        if (!group.reason) styles[valueIndex] = style;
        seen.add(valueIndex);
        itemGroups.set(graphicId, { key, value: entry.value, line: entry.line });
      }
      groups.push(group);
      origins.set(key, new Map(layout.values.map(value => [scalarKey(value), Object.freeze({ kind: "guide-label", program,
        childPath: Object.freeze([...childPath]), ownerId: owner.id, value })])));
    }
  }
  if (!groups.length) return empty(endpoint.scene.nodes.length);
  groups.sort((a, b) => a.placement.ordinal - b.placement.ordinal);
  const byKey = new Map(groups.map((group, index) => [group.key, index]));
  const result = validateAxisLabelGroups({ groups, items: endpoint.sources.map(source => {
    const item = itemGroups.get(source.graphicId);
    return item === undefined ? null : { group: byKey.get(item.key), value: item.value, line: item.line };
  }) }, endpoint);
  nativeOrigins.set(result, result.groups.map(group => origins.get(group.key)));
  return result;
}
export function axisLabelGroupOrigin(state, group, value) { return nativeOrigins.get(state)?.[group]?.get(scalarKey(value)); }
