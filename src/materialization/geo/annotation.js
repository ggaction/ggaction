import { createProjectionKernel } from "../../grammar/geo/projections.js";
import { geometryCentroid } from "../../grammar/geo/centroid.js";
import { concreteTextItem } from "../textItem.js";
import { materializeMarkEffectProperties } from "../markEffects.js";
import { materializeFillItems } from "../fillPaint.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";

export function resolveGeoAnnotation(program, layer, config, source, key) {
  const { binding, projection, features, parameters } = source, [feature] = features;
  const lineage = { kind: "resource", resource: binding.geometry ?? { kind: "projection", id: projection.id, revision: projection.revision } };
  const position = binding.anchor.type === "feature" ? geometryCentroid(feature.geometry, { coordinateKind: source.coordinateKind,
      ...(feature.polygonWinding === undefined ? {} : { polygonWinding: feature.polygonWinding }) }) : binding.anchor.position;
  const anchor = position === null ? null : createProjectionKernel(parameters).forward(position).point;
  const graphics = [];
  if (anchor !== null && binding.text.length) {
    const text = concreteTextItem(program, config, { x: anchor[0], y: anchor[1] }, binding.text);
    const properties = materializeMarkEffectProperties({ ...text.properties,
      ...Object.fromEntries(["outline", "shadow", "blend"].filter(name => Object.hasOwn(config, name)).map(name => [name, config[name]])) });
    graphics.push({ ...text, properties, identity: { key, topology: "text", role: "label", lineage } });
  }
  const concrete = materializeFillItems(program, layer, graphics);
  for (const graphic of concrete) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  return { ...source, graphics: concrete, frame: resolveGraphicBounds(program) };
}
