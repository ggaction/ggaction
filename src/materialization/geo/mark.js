import { geoAppearanceValues } from "./appearance.js";
import { resolveGeoAnnotation } from "./annotation.js";
import { geoFeatureKey, geoMarkSource } from "./source.js";
import { contentDigest } from "../../core/contentDigest.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { geoMarkGeometry } from "../../grammar/geo/markGeometry.js";
import { projectGeometry } from "../../grammar/geo/stream.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";


export function resolveGeoMark(program, layer, config, resolvedScales = program.resolvedScales, { appearance = true } = {}) {
  const source = geoMarkSource(program, layer, config), { binding, resource, coordinateKind, parameters, features } = source;
  if (binding.mode === "annotation") return resolveGeoAnnotation(program, layer, config, source, geoFeatureKey(layer, resource, features[0]));
  const lineage = { kind: "resource", resource: binding.geometry ?? requireCoordinate(program, layer.coordinate).projection };
  const { clip: _clip, radiusPx, ...style } = config;
  const items = [], graphics = []; let work = 0, count = 0;
  const eligible = source.drawableFeatures;
  const mapped = appearance ? geoAppearanceValues(program, layer, eligible, resolvedScales) : {};
  for (const [index, feature] of eligible.entries()) {
    const featureStyle = mapped.color === undefined ? style : { ...style, [binding.mode === "line" ? "stroke" : "fill"]: mapped.color[index] };
    const radius = mapped.size === undefined ? radiusPx : Math.sqrt(mapped.size[index] / Math.PI);
    const geometry = binding.mode === "graticule" ? feature.geometry : geoMarkGeometry(feature.geometry, binding, parameters);
    const projected = projectGeometry(geometry, parameters, { coordinateKind,
      ...(feature.polygonWinding === undefined || binding.radiusDeg !== undefined ? {} : { polygonWinding: feature.polygonWinding }),
      interpolation: binding.interpolation ?? "source-segment", ...(binding.routeHint === undefined ? {} : { routeHint: binding.routeHint }) });
    validateWorkLimit(work += projected.diagnostics.work, "Geographic mark stream work");
    validateGeneratedItemLimit(count += projected.diagnostics.outputPoints, "Geographic mark point count");
    const key = geoFeatureKey(layer, resource, feature);
    const topology = contentDigest(JSON.stringify(projected.parts.map(part => [part.key, part.kind, part.commands?.map(command => command.op)])));
    const graphicRoles = [];
    for (const part of projected.parts) {
      const role = JSON.stringify(part.key), point = part.kind === "point";
      const properties = point ? { ...featureStyle, x: part.point[0], y: part.point[1], radius }
        : { ...featureStyle, fill: part.kind === "line" ? "none" : featureStyle.fill, commands: part.commands, ...(part.fillRule ? { fillRule: part.fillRule } : {}) };
      graphicRoles.push(role);
      graphics.push({ type: point ? "circle" : "path", properties: materializeMarkEffectProperties(properties), identity: { key, topology, role, lineage } });
    }
    items.push({ key, topology, role: "feature", properties: featureStyle, fields: feature.fields ?? feature.properties ?? {}, members: [], rows: feature.rows ?? [], rowKeys: [], graphicRoles, lineage });
  }
  validateGeneratedItemLimit(graphics.length, "Geographic graphic count");
  const concrete = materializeFillItems(program, layer, graphics);
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { ...source, items, graphics: concrete, frame: resolveGraphicBounds(program) };
}
