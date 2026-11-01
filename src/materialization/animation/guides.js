import { prepareAxisAnimationLayout, normalizeAxisLabelAnimationState, axisLabelAnimationMatchesNode } from "./axisLabelState.js";
import { findCanvasGraphic } from "../graphicHierarchy.js";
import { legendAnimationItems } from "./legendGuides.js";
import { legendAnimationMatchesNode } from "./legendState.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { validateWorkLimit, validateGeneratedItemLimit } from "../../core/validation.js";
import { cartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { guideAnimationMatchesNode, normalizeGuideAnimationState } from "../../grammar/animation/guideState.js";
import { resolveAxisLineRange } from "../../grammar/axisGeometry.js";
import { cartesianAxisOwners, axisGraphicIds } from "../../selectors/axes.js";
import { gridNames } from "../../selectors/grids.js";
import { requireSemanticScale } from "../../selectors/scales.js";
import { namespaceGraphicId } from "../../selectors/graphicCapacity.js";
import { graphicScopes } from "../../selectors/graphicScopes.js";
import { resolveCartesianAxisFrameBounds, resolveGuideCoordinateBounds, resolveCoordinatePolarFrame } from "../coordinateBounds.js";
import { axisGuideItems } from "../guides/axisItems.js";
import { guideAnchorItems } from "./guideAnchors.js";
import { valuesFromTickConfig, mapPolarGuideValues } from "../guides/tickValues.js";

function scopedGuides(program, namespaces, spend) {
  const result = new Map(), labelLayouts = new Map(), objects = program.graphicSpec.objects;
  const identity = (owner, component, value, line = 0) => ({ namespaces, owner, component, value, line });
  const add = (id, state) => { spend(1 + id.length); result.set(id, normalizeGuideAnimationState(state)); };
  const mapping = (value, config) => cartesianPosition(value, program.resolvedScales[config.scale]);
  const polarFrame = config => {
    const frame = resolveCoordinatePolarFrame(program, config.coordinate);
    return { centerX: frame.centerX, centerY: frame.centerY, availableRadius: frame.availableRadius };
  };
  const angle = () => program.materializationConfigs.guides.axis?.radius?.layout?.angle ?? 0;
  for (const item of axisGuideItems(program, spend)) {
    if (item.component === "title") continue;
    const { channel, component: kind, config } = item;
    const id = identity(item.ownerId, kind, item.rawValue, item.line);
    const cartesian = channel === "x" || channel === "y";
    if (kind === "labels" && cartesian && (config.flush === true || config.rotation !== 0 ||
        program.materializationConfigs.canvas?.plot !== undefined || program.materializationConfigs.canvas?.responsive !== undefined)) {
      if (config.maxWidth !== undefined || config.responsive !== undefined || config.responsiveResult !== undefined) {
        add(item.graphicId, { identity: id, reason: "guide-layout" });
      } else {
        if (!labelLayouts.has(config)) {
          const frame = resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, item.ownerId);
          const { width, height } = findCanvasGraphic(program).properties;
          labelLayouts.set(config, prepareAxisAnimationLayout({ values: valuesFromTickConfig(program, config),
            scale: program.resolvedScales[config.scale], config, channel, frame, canvas: { width, height },
            profile: program.materializationConfigs.textMetrics,
            edgeAligned: program.materializationConfigs.canvas?.plot !== undefined || program.materializationConfigs.canvas?.responsive !== undefined }));
        }
        result.set(item.graphicId, normalizeAxisLabelAnimationState({ identity: id, kind: "label-layout", layout: labelLayouts.get(config) }));
      }
      continue;
    }
    const frame = cartesian ? resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, item.ownerId) : polarFrame(config);
    const policy = cartesian
      ? { side: config.position, alongOffset: config.alongOffset ?? 0,
          ...(kind === "ticks" ? { length: config.length } : { offset: config.offset, lineCount: item.lineCount,
            lineHeight: config.lineHeight ?? config.fontSize * 1.2, align: config.align ?? null }) }
      : { ...(channel === "radius" ? { angle: angle() } : {}),
          ...(kind === "ticks" ? { length: config.length } : { offset: config.offset, align: config.align ?? null }) };
    add(item.graphicId, { identity: id, kind, channel, frame, mapping: mapping(item.rawValue, config), policy });
  }
  for (const owner of cartesianAxisOwners(program)) {
    const id = axisGraphicIds(owner.channel, owner.id)[0], config = owner.config?.line;
    if (config === undefined || objects[id] === undefined) continue;
    const frame = resolveCartesianAxisFrameBounds(program, owner.channel, config.position, owner.scale, owner.id);
    const range = resolveAxisLineRange(program.resolvedScales[owner.scale], frame, owner.channel, Array.isArray(requireSemanticScale(program, owner.scale).range));
    add(id, { identity: identity(owner.id, "line", null), kind: "line", channel: owner.channel, frame, range, policy: { side: config.position } });
  }
  for (const channel of ["theta", "radius"]) {
    const id = axisGraphicIds(channel)[0], config = program.materializationConfigs.guides?.axis?.[channel]?.line;
    if (config === undefined || objects[id] === undefined) continue;
    add(id, { identity: identity(channel, "line", null), kind: "line", channel, frame: polarFrame(config),
      range: channel === "theta" ? [] : program.resolvedScales[config.scale].range,
      policy: channel === "theta" ? {} : { angle: angle() } });
  }
  for (const [direction, config] of Object.entries(program.materializationConfigs.guides?.grid ?? {})) {
    const cartesian = direction === "horizontal" || direction === "vertical";
    const channel = cartesian ? gridNames(direction).channel : direction === "radial" ? "radius" : "theta";
    const id = cartesian ? gridNames(direction).graphic : direction === "radial" ? "radialGridCircles" : "thetaGridLines";
    const object = objects[id];
    if (object === undefined || config.bandPosition === "boundary") continue;
    const values = cartesian ? valuesFromTickConfig(program, config) : (() => {
      const mapped = mapPolarGuideValues(program, config);
      return mapped.values.filter((_, index) => channel !== "radius" || mapped.positions[index] > 0);
    })();
    spend(values.length);
    if (object.items?.length !== values.length) throw new TypeError(`Grid "${id}" has stale semantic item correspondence.`);
    const frame = cartesian ? resolveGuideCoordinateBounds(program, { channel, scale: config.scale, coordinate: config.coordinate }) : polarFrame(config);
    values.forEach((value, index) => add(object.items[index].id, { identity: identity(`grid:${direction}`, "grid", value), kind: "grid", channel,
      frame, mapping: mapping(value, config), policy: cartesian ? { alongOffset: config.alongOffset ?? 0 } : {} }));
  }
  for (const item of guideAnchorItems(program, spend)) {
    const parallel = item.field !== undefined;
    const id = identity(item.owner, parallel ? `parallel-${item.component}` : item.component,
      parallel ? { field: item.field, value: item.value } : item.value, item.line);
    add(item.graphicId, item.reason === undefined ? { identity: id, kind: "anchor", anchor: item.anchor } : { identity: id, reason: item.reason });
  }
  for (const item of legendAnimationItems(program, namespaces, spend)) {
    spend(1 + item.graphicId.length);
    result.set(item.graphicId, item.state);
  }
  return result;
}

export function projectGuideAnimationState(program, endpoint) {
  validateGeneratedItemLimit(endpoint.scene.nodes.length, "Animation guide endpoint size");
  const states = new Map();
  let work = 0;
  const spend = (count = 1) => validateWorkLimit(work += count, "Animation guide preparation work");
  for (const context of graphicScopes(program, spend)) {
    for (const [id, state] of scopedGuides(context.program, context.namespaces, spend)) {
      spend(id.length + context.namespaces.reduce((sum, value) => sum + 6 * value.length + 2, 0));
      const qualified = context.namespaces.reduceRight((value, namespace) => namespaceGraphicId(namespace, value), id);
      if (states.has(qualified)) throw new TypeError("Animation guides contain ambiguous native ownership.");
      states.set(qualified, state);
    }
  }
  return cloneAndFreeze(endpoint.sources.map((source, index) => {
    const state = states.get(source.graphicId);
    if (state === undefined || state.reason !== undefined) return state ?? null;
    return (state.kind === "legend" ? legendAnimationMatchesNode : state.kind === "label-layout" ? axisLabelAnimationMatchesNode : guideAnimationMatchesNode)(state, endpoint.scene.nodes[index]) ? state : { identity: state.identity, reason: "guide-edited" };
  }));
}
