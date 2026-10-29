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


export function resolveGeoMark(program, layer, config) {
  const source = geoMarkSource(program, layer, config), { binding, resource, coordinateKind, parameters, features } = source;
  const lineage = { kind: "resource", resource: binding.geometry ?? requireCoordinate(program, layer.coordinate).projection };
  const { clip: _clip, radiusPx, ...style } = config;
  const items = [], graphics = []; let work = 0, count = 0;
  for (const feature of features) {
    const geometry = binding.mode === "graticule" ? feature.geometry : geoMarkGeometry(feature.geometry, binding, parameters);
    const projected = projectGeometry(geometry, parameters, { coordinateKind,
      interpolation: binding.interpolation ?? "source-segment", ...(binding.routeHint === undefined ? {} : { routeHint: binding.routeHint }) });
    validateWorkLimit(work += projected.diagnostics.work, "Geographic mark stream work");
    validateGeneratedItemLimit(count += projected.diagnostics.outputPoints, "Geographic mark point count");
    const key = geoFeatureKey(layer, resource, feature);
    const topology = contentDigest(JSON.stringify(projected.parts.map(part => [part.key, part.kind, part.commands?.map(command => command.op)])));
    const graphicRoles = [];
    for (const part of projected.parts) {
      const role = JSON.stringify(part.key), point = part.kind === "point";
      const properties = point ? { ...style, x: part.point[0], y: part.point[1], radius: radiusPx }
        : { ...style, fill: part.kind === "line" ? "none" : style.fill, commands: part.commands, ...(part.fillRule ? { fillRule: part.fillRule } : {}) };
      graphicRoles.push(role);
      graphics.push({ type: point ? "circle" : "path", properties: materializeMarkEffectProperties(properties), identity: { key, topology, role, lineage } });
    }
    items.push({ key, topology, role: "feature", properties: style, fields: feature.fields ?? feature.properties ?? {}, members: [], rows: feature.rows ?? [], rowKeys: [], graphicRoles, lineage });
  }
  validateGeneratedItemLimit(graphics.length, "Geographic graphic count");
  const concrete = materializeFillItems(program, layer, graphics);
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { ...source, items, graphics: concrete, frame: resolveGraphicBounds(program) };
}
