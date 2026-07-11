const DRAWABLE_TYPES = new Set(["circle", "rect", "line", "text", "path"]);
const STRUCTURAL_TYPES = new Set(["canvas", "container"]);
const GRAPHIC_PROPERTIES = Object.freeze({
  canvas: new Set(["width", "height", "background", "children"]),
  container: new Set([
    "x",
    "y",
    "width",
    "height",
    "children",
    "direction",
    "gap",
    "align"
  ]),
  circle: new Set([
    "x",
    "y",
    "radius",
    "fill",
    "stroke",
    "strokeWidth",
    "opacity",
    "style",
    "length"
  ]),
  rect: new Set([
    "x",
    "y",
    "width",
    "height",
    "fill",
    "stroke",
    "strokeWidth",
    "opacity",
    "style",
    "length"
  ]),
  line: new Set([
    "x1",
    "y1",
    "x2",
    "y2",
    "stroke",
    "strokeWidth",
    "opacity",
    "style",
    "length"
  ]),
  text: new Set([
    "x",
    "y",
    "text",
    "fill",
    "font",
    "fontSize",
    "textAlign",
    "textBaseline",
    "opacity",
    "style",
    "length"
  ]),
  path: new Set([
    "d",
    "fill",
    "stroke",
    "strokeWidth",
    "opacity",
    "style",
    "length"
  ])
});

export function validateGraphicType(type) {
  if (!DRAWABLE_TYPES.has(type) && !STRUCTURAL_TYPES.has(type)) {
    throw new Error(`Unknown graphic type "${type}".`);
  }

  return type;
}

export function isDrawableGraphicType(type) {
  return DRAWABLE_TYPES.has(type);
}

export function isStructuralGraphicType(type) {
  return STRUCTURAL_TYPES.has(type);
}

export function validateGraphicProperty(type, property) {
  if (typeof property !== "string" || property.length === 0) {
    throw new TypeError("editGraphics requires a non-empty property string.");
  }

  if (!GRAPHIC_PROPERTIES[type]?.has(property)) {
    throw new Error(`Unknown ${type} graphic property "${property}".`);
  }

  return property;
}
