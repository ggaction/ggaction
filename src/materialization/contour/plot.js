import { contentDigest } from "../../core/contentDigest.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { requireStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { validateContourBinding } from "../../grammar/contour/plot.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { mapScaleConsumerValues } from "../scales/map.js";

export function resolveContourPlot(program, layer, config, resolvedScales = program.resolvedScales) {
  validateContourBinding(layer, config);
  const resource = requireStoredResource(program, layer.contourBinding.geometry);
  if (resource.options.method !== "contour" || requireCoordinate(program, layer.coordinate).type !== "cartesian") throw new TypeError("Contour marks require contour geometry and a Cartesian coordinate.");
  const frame = resolveCoordinateBounds(program, layer.coordinate, { resolvedScales });
  const mode = layer.contourBinding.mode, regions = resource.result.contours[mode === "line" ? "thresholds" : "bands"];
  const scale = channel => {
    const value = resolvedScales[layer.encoding[channel].scale];
    if (value === undefined) throw new TypeError("Contour marks require resolved scales.");
    return value;
  };
  const xScale = scale("x"), yScale = scale("y"), colorScale = layer.encoding.color === undefined ? undefined : scale("color");
  const dataset = resource.options.source === "density" ? resolveInputReference(program, resource.inputs[0]) : undefined;
  validateWorkLimit(regions.filter(region => region.polygons.length > 0).length * (dataset?.values.length ?? 0), "Contour source lineage work");
  const lineage = { kind: "resource", resource: layer.contourBinding.geometry }, items = [], graphics = [];
  const { clip: _clip, ...style } = config;
  let work = 0;
  for (const region of regions) {
    if (!region.polygons.length) continue;
    const value = mode === "line" ? region.value : region.lower;
    const grain = JSON.stringify(mode === "line" ? ["level", value] : ["band", region.lower, region.upper]);
    const key = JSON.stringify([[], layer.id, "contour", [resource.id, grain]]);
    const topology = contentDigest(JSON.stringify([mode, region.polygons.map(polygon => [polygon.outer.length, polygon.holes.map(hole => hole.length)])]));
    const color = colorScale === undefined ? undefined : mapScaleConsumerValues([value], colorScale, "color")[0];
    const properties = { ...style, ...(color === undefined ? {} : mode === "line" ? { stroke: color } : { fill: color }) };
    const graphicRoles = [];
    region.polygons.forEach((polygon, index) => {
      const role = `island-${index}`, commands = [];
      for (const ring of [polygon.outer, ...polygon.holes]) {
        validateWorkLimit(work += ring.length, "Contour mapped vertex work");
        const xs = mapScaleConsumerValues(ring.map(point => point[0]), xScale, "x");
        const ys = mapScaleConsumerValues(ring.map(point => point[1]), yScale, "y");
        for (let i = 0; i < ring.length - 1; i++) commands.push({ op: i === 0 ? "M" : "L", x: xs[i], y: ys[i] });
        commands.push({ op: "Z" });
      }
      graphicRoles.push(role);
      graphics.push({ type: "path", properties: { commands, fillRule: "nonzero", ...properties }, identity: { key, topology, role, lineage } });
    });
    items.push({ key, topology, role: "contour", fields: { value, ...(mode === "filled" ? { lower: region.lower, upper: region.upper, upperInclusive: region.upperInclusive } : {}) },
      properties, graphicRoles, members: dataset?.values ?? [], memberKeys: dataset?.rowKeys ?? [] });
  }
  validateGeneratedItemLimit(graphics.length, "Contour graphic count");
  const concrete = materializeFillItems(program, layer, graphics.map(graphic => ({ ...graphic,
    properties: materializeMarkEffectProperties(graphic.properties) })));
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics: concrete, items, frame, resource, dataset };
}
