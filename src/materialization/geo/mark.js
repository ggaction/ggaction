import { geoBindingCapacity } from "../../grammar/geo/capacity.js";
import { geoAppearanceValues, geoFeatureAppearance } from "./appearance.js";
import { resolveGeoAnnotation } from "./annotation.js";
import { geoFeatureKey, geoMarkSource } from "./source.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { geoMarkGeometry, geoPartGeometry, geoPartsTopology } from "../../grammar/geo/markGeometry.js";
import { projectGeometry } from "../../grammar/geo/stream.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { materializeFillItems } from "../fillPaint.js";
import { materializeMarkEffectProperties } from "../markEffects.js";


export function resolveGeoMark(program, layer, config, resolvedScales = program.resolvedScales, { appearance = true } = {}) {
  const source = geoMarkSource(program, layer, config), { binding, resource, coordinateKind, parameters, features } = source;
  if (binding.mode === "annotation") return resolveGeoAnnotation(program, layer, config, source, geoFeatureKey(layer, resource, features[0]));
  const capacity = geoBindingCapacity(binding);
  const lineage = { kind: "resource", resource: binding.geometry ?? requireCoordinate(program, layer.coordinate).projection };
  const items = [], graphics = []; let work = 0, count = 0, commands = 0;
  const eligible = source.drawableFeatures;
  const mapped = appearance ? geoAppearanceValues(program, layer, eligible, resolvedScales) : {};
  for (const [index, feature] of eligible.entries()) {
    const { style: featureStyle, radiusPx: radius } = geoFeatureAppearance(config, binding, mapped, index);
    const geometry = binding.mode === "graticule" ? feature.geometry : geoMarkGeometry(feature.geometry, binding, parameters);
    const projected = projectGeometry(geometry, parameters, { coordinateKind, maxPoints: capacity.maxPathCommands,
      ...(feature.polygonWinding === undefined || binding.radiusDeg !== undefined ? {} : { polygonWinding: feature.polygonWinding }),
      interpolation: binding.interpolation ?? "source-segment", ...(binding.routeHint === undefined ? {} : { routeHint: binding.routeHint }) });
    validateWorkLimit(work += projected.diagnostics.work, "Geographic mark stream work");
    validateGeneratedItemLimit(count += projected.diagnostics.outputPoints, "Geographic mark point count", capacity.maxProjectedPoints);
    validateGeneratedItemLimit(commands += projected.diagnostics.commands, "Geographic mark command count", capacity.maxPathCommands);
    const key = geoFeatureKey(layer, resource, feature);
    const parts = geoPartGeometry(projected.parts, radius, Object.hasOwn(binding, "capacity") ? capacity.maxPathCommands : undefined), topology = geoPartsTopology(parts);
    const graphicRoles = [];
    for (const part of parts) {
      graphicRoles.push(part.role);
      graphics.push({ type: part.type, properties: materializeMarkEffectProperties({ ...featureStyle, ...part.properties }),
        identity: { key, topology, role: part.role, lineage } });
    }
    items.push({ key, topology, role: "feature", properties: featureStyle, fields: feature.fields ?? feature.properties ?? {}, members: [], rows: feature.rows ?? [], rowKeys: [], graphicRoles, lineage });
  }
  validateGeneratedItemLimit(graphics.length, "Geographic graphic count");
  const concrete = materializeFillItems(program, layer, graphics);
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { ...source, items, graphics: concrete, frame: resolveGraphicBounds(program) };
}
