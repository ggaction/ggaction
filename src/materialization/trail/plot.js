import { findSemanticScale } from "../../selectors/scales.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { deriveTrailSeries } from "../../grammar/trailSeries.js";
import { validateTrailBinding } from "../../grammar/trailPlot.js";
import { sampleTrailCurve } from "../../grammar/trailCurve.js";
import { layoutTrailRibbon } from "../../grammar/trail.js";
import { polarToCartesian } from "../../grammar/polar.js";
import { derivePathSeriesFieldValues } from "../../grammar/pathSeries.js";
import { mapOrdinalPositionValues, mapContinuousScaleValues } from "../../grammar/scales/index.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveCoordinateBounds, resolveCoordinatePolarFrame } from "../coordinateBounds.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { identifyItems } from "../selection/items/common.js";
import { pathSeriesItemDefinitions } from "../selection/items/path.js";
import { mapScaleConsumerValues } from "../scales/map.js";

export function trailSeries(program, layer, dataset, resolvedScales) {
  const domain = channel => {
    const id = layer.encoding[channel]?.scale;
    return resolvedScales?.[id]?.domain ?? findSemanticScale(program, id)?.domain;
  };
  const domainArray = channel => Array.isArray(domain(channel)) ? domain(channel) : undefined;
  return deriveTrailSeries(dataset.values, layer, { scales: program.semanticSpec.scales,
    xDomain: domainArray("x"), yDomain: domainArray("y"), thetaDomain: domainArray("theta") });
}
export function trailScaleValues(program, dataset, layer, encoding, channel) {
  const derived = trailSeries(program, layer, dataset);
  if (["x", "theta"].includes(channel)) return derived.xValues;
  if (["y", "radius"].includes(channel)) return derived.yValues;
  return derivePathSeriesFieldValues(dataset.values, derived.series, encoding.field, channel, encoding,
    findSemanticScale(program, encoding.scale));
}
export function resolveTrailPlot(program, layer, config, resolvedScales = program.resolvedScales) {
  validateTrailBinding(layer, config);
  const dataset = requireDataset(program, layer.data), derived = trailSeries(program, layer, dataset, resolvedScales);
  const coordinate = requireCoordinate(program, layer.coordinate);
  if (coordinate.type !== (derived.polar ? "polar" : "cartesian")) throw new TypeError("Trail position family and coordinate must agree.");
  const frame = resolveCoordinateBounds(program, layer.coordinate, { resolvedScales });
  const polar = derived.polar ? resolveCoordinatePolarFrame(program, layer.coordinate, { resolvedScales }) : undefined;
  const [xChannel, yChannel] = derived.polar ? ["theta", "radius"] : ["x", "y"];
  const xScale = resolvedScales[layer.encoding[xChannel].scale], yScale = resolvedScales[layer.encoding[yChannel].scale];
  if (xScale === undefined || yScale === undefined) throw new TypeError("Trail requires both resolved position scales.");
  const items = identifyItems(program, layer, "item", pathSeriesItemDefinitions(layer, dataset, derived.series));
  const identities = [], owners = [];
  for (const item of items) item.graphicIndices.forEach((index, i) => { owners[index] = item; identities[index] = { key: item.key, topology: item.topology, role: item.graphicRoles[i],
    lineage: { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKeys: item.memberKeys } }; });
  const color = layer.encoding.color;
  const colors = color === undefined ? undefined : mapScaleConsumerValues(derivePathSeriesFieldValues(dataset.values, derived.series, color.field, "color", color,
    findSemanticScale(program, color.scale)), resolvedScales[color.scale], "color");
  validateGeneratedItemLimit(derived.series.length, "Trail series count");
  const graphics = derived.series.map((series, index) => {
    const map = (values, scale) => (["point", "band"].includes(scale.type) ? mapOrdinalPositionValues : mapContinuousScaleValues)(values, scale);
    const x = map(series.values.map(value => value.x), xScale), y = map(series.values.map(value => value.y), yScale);
    const points = series.values.map((value, i) => ({ ...(polar ? polarToCartesian({ theta: x[i], radius: y[i], frame: polar }) : { x: x[i], y: y[i] }), width: value.width }));
    const sampled = sampleTrailCurve(points, { curve: config.curve, ...(config.tension === undefined ? {} : { tension: config.tension }) });
    const ribbon = layoutTrailRibbon(sampled, { lineJoin: config.lineJoin, lineCap: config.lineCap, miterLimit: config.miterLimit, fillRule: config.fillRule, closed: config.closed && !series.hasGaps });
    const endpoint = points.at(-1); owners[index].geometry = { endpoint: { x: endpoint.x, y: endpoint.y }, origin: { x: ribbon.commands[0].x, y: ribbon.commands[0].y } };
    return { type: "path", properties: materializeMarkEffectProperties({ commands: ribbon.commands, fillRule: ribbon.fillRule, ...config.body, ...(layer.mark.blend === undefined ? {} : { blend: layer.mark.blend }), ...(colors ? { fill: colors[index] } : {}) }), identity: identities[index] };
  });
  const concrete = materializeFillItems(program, layer, graphics);
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { graphics: concrete, items, frame, dataset, derived };
}
