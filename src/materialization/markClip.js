import { isScreenAnnotation } from "../grammar/screenAnnotation.js";
import { findCanvasGraphic } from "./graphicHierarchy.js";
import { findLayer } from "../selectors/layers.js";
import { resolvePrimitiveGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { resolveCoordinateBounds } from "./coordinateBounds.js";
import { markClipPositionOwner, validateMarkClipCoordinate } from "../selectors/markClip.js";

// Called explicitly by the owning mark materializer, using wrapped primitive edits.
export function materializeMarkClip(program, id) {
  const intent = program.markConfigs[id]?.clip;
  if (intent === undefined) return program;
  const graphic = program.graphicSpec.objects[id];
  if (intent === false) return graphic?.clip === undefined ? program
    : program.editGraphics({target: id, property: "clip", value: false});
  const layer = markClipPositionOwner(program, findLayer(program, id));
  validateMarkClipCoordinate(program, layer, intent);
  // Incomplete marks keep authoring intent until a coordinate and Canvas exist.
  const canvas = isScreenAnnotation(layer) ? findCanvasGraphic(program) : undefined;
  const bounds = canvas === undefined ? (layer?.coordinate === undefined ? undefined : resolveCoordinateBounds(program, layer.coordinate))
    : { x: 0, y: 0, width: canvas.properties.width, height: canvas.properties.height };
  if (bounds === undefined) {
    const drawable = (graphic?.items ?? (graphic ? [graphic] : [])).some(item =>
      resolvePrimitiveGraphicBounds(item.type ?? graphic.type, item.properties) !== undefined);
    if (drawable) throw new Error("Drawable mark clip requires a resolved Cartesian plot frame.");
    return program;
  }
  const rect = {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height};
  if (graphic?.clip !== undefined && Object.keys(rect).every(key => rect[key] === graphic.clip[key])) return program;
  return program.editGraphics({target: id, property: "clip", value: rect});
}
