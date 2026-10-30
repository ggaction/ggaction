import { cloneAndFreeze } from "../../core/immutable.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { cartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { normalizeGuideAnchor, normalizeBandBoundaryMembers } from "../../grammar/animation/guideAnchors.js";
import { resolveBandGridBoundaries } from "../../grammar/gridGeometry.js";
import { findLayer } from "../../selectors/layers.js";
import { PARALLEL_AXIS_GRAPHICS } from "../../selectors/axes.js";
import { gridNames } from "../../selectors/grids.js";
import { resolveCartesianAxisFrameBounds, resolveCoordinateBounds, resolveCoordinatePolarFrame, resolveGuideCoordinateBounds } from "../coordinateBounds.js";
import { axisGuideItems } from "../guides/axisItems.js";
import { valuesFromTickConfig, resolveParallelTickValues } from "../guides/tickValues.js";

// Scope-local native meaning. The transition owner applies composition
// namespaces and validates every anchor against its exact concrete endpoint.
export function guideAnchorItems(program) {
  const result = [], objects = program.graphicSpec.objects;
  let work = 0;
  const spend = (count = 1) => validateWorkLimit(work += count, "Guide anchor preparation work");
  const scaleWork = scale => scale.domain.reduce((sum, value) => sum + 1 + (typeof value === "string" ? value.length : 0), 0);
  const add = entry => {
    spend(entry.graphicId.length + entry.owner.length + 1);
    const mapping = entry.anchor?.kind === "band-boundary" ? { scale: entry.anchor.scale } : entry.anchor?.mapping ?? entry.anchor?.anchor?.mapping;
    if (mapping !== undefined && mapping !== null) spend(mapping.scale.domain.length);
    validateGeneratedItemLimit(result.length + 1, "Guide anchor items");
    result.push(entry.anchor === undefined ? entry : { ...entry, anchor: normalizeGuideAnchor(entry.anchor) });
  };
  for (const item of axisGuideItems(program, spend)) {
    if (item.component !== "title") continue;
    const { channel, config } = item;
    const entry = { graphicId: item.graphicId, owner: item.ownerId, component: "title", value: null, line: item.line };
    // Label-dependent clearance needs its own prepared ink dependency; the
    // final numeric offset alone does not describe that native policy.
    if (typeof config.offset !== "number" || config.inferredOffset === true) { add({ ...entry, reason: "guide-layout" }); continue; }
    const cartesian = channel === "x" || channel === "y";
    const frame = cartesian ? resolveCartesianAxisFrameBounds(program, channel, config.position, config.scale, item.ownerId)
      : (() => { const value = resolveCoordinatePolarFrame(program, config.coordinate); return { centerX: value.centerX, centerY: value.centerY, availableRadius: value.availableRadius }; })();
    const scale = program.resolvedScales[config.scale];
    if (cartesian && typeof config.at === "number") spend(scaleWork(scale));
    add({ ...entry, anchor: { kind: "title", channel, frame,
      anchor: cartesian ? typeof config.at === "number"
        ? { kind: "value", mapping: cartesianPosition(config.at, scale), alongOffset: config.alongOffset ?? 0 }
        : { kind: "range", range: scale.range, at: config.at, alongOffset: config.alongOffset ?? 0 } : null,
      policy: { offset: config.offset, align: config.align ?? null,
        ...(cartesian ? { side: config.position, baseline: config.baseline ?? "middle" }
          : channel === "radius" ? { angle: program.guideConfigs.axis.radius.layout.angle, position: config.position } : {}) } } });
  }
  for (const [direction, config] of Object.entries(program.guideConfigs.grid ?? {})) {
    if (config.bandPosition !== "boundary") continue;
    const { channel, graphic } = gridNames(direction), object = objects[graphic];
    if (object === undefined) continue;
    const scale = program.resolvedScales[config.scale], values = valuesFromTickConfig(program, config);
    spend(values.length + scale.domain.length);
    const boundaries = resolveBandGridBoundaries(values, scale);
    spend(boundaries.length * scaleWork(scale));
    if (object.items?.length !== boundaries.length) throw new TypeError(`Grid "${graphic}" has stale boundary correspondence.`);
    const frame = resolveGuideCoordinateBounds(program, { channel, scale: config.scale, coordinate: config.coordinate });
    boundaries.forEach((boundary, index) => {
      const members = normalizeBandBoundaryMembers(boundary.members);
      add({ graphicId: object.items[index].id, owner: `grid:${direction}`, component: "boundary", value: members, line: 0,
        anchor: { kind: "band-boundary", channel, frame, members, scale: cartesianPosition(members[0].value, scale).scale, alongOffset: config.alongOffset ?? 0 } });
    });
  }
  const stored = program.guideConfigs.axis?.parallel?.axes;
  if (stored === undefined) return cloneAndFreeze(result);
  const layer = findLayer(program, stored.target), dimensions = layer?.encoding?.parallel?.dimensions;
  if (!Array.isArray(dimensions) || dimensions.length < 2) throw new TypeError("Parallel guide anchors require their current encoded owner.");
  spend(dimensions.length * stored.dimensions.length);
  const frame = resolveCoordinateBounds(program, layer.coordinate);
  for (const [component, graphic] of Object.entries(PARALLEL_AXIS_GRAPHICS)) {
    const object = objects[graphic];
    if (object === undefined) continue;
    const entries = dimensions.flatMap((dimension, index) => {
      const config = stored.dimensions.find(value => value.field === dimension.field)?.[component];
      if (config === undefined) return [];
      const scale = program.resolvedScales[dimension.scale];
      const values = component === "line" || component === "title" ? [null] : resolveParallelTickValues(scale, config, dimension.field);
      spend(values.length);
      if (component === "ticks" || component === "labels") spend(values.length * scaleWork(scale));
      return values.map(value => ({ owner: stored.target, field: dimension.field, component, value, line: 0,
        anchor: { kind: "parallel", component, field: dimension.field, frame, slot: { index, count: dimensions.length },
          mapping: value === null ? null : cartesianPosition(value, scale),
          policy: component === "line" ? {} : component === "ticks" ? { length: config.length } : { offset: config.offset, align: config.align ?? null } } }));
    });
    if (object.items?.length !== entries.length) throw new TypeError(`Parallel guide "${graphic}" has stale field correspondence.`);
    entries.forEach((entry, index) => add({ ...entry, graphicId: object.items[index].id }));
  }
  return cloneAndFreeze(result);
}
