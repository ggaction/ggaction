const PRIMITIVE_DRAWABLE_TYPES = new Set([
  "circle",
  "rect",
  "line",
  "text",
  "path"
]);
const DRAWABLE_TYPES = new Set([
  ...PRIMITIVE_DRAWABLE_TYPES,
  "collection"
]);
const STRUCTURAL_TYPES = new Set(["canvas"]);
const GRAPHIC_PROPERTIES = Object.freeze({
  canvas: new Set(["width", "height", "background"]),
  collection: new Set([
    "children",
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "width",
    "height",
    "radius",
    "fill",
    "stroke",
    "strokeWidth",
    "strokeDash",
    "fontSize",
    "fontFamily",
    "fontWeight",
    "text",
    "textAlign",
    "textBaseline",
    "rotation",
    "points",
    "closed",
    "opacity"
  ]),
  circle: new Set([
    "x",
    "y",
    "radius",
    "fill",
    "stroke",
    "strokeWidth",
    "opacity",
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
    "length"
  ]),
  line: new Set([
    "x1",
    "y1",
    "x2",
    "y2",
    "stroke",
    "strokeWidth",
    "strokeDash",
    "opacity",
    "length"
  ]),
  text: new Set([
    "x",
    "y",
    "text",
    "fill",
    "fontSize",
    "fontFamily",
    "fontWeight",
    "textAlign",
    "textBaseline",
    "rotation",
    "opacity",
    "length"
  ]),
  path: new Set([
    "points",
    "fill",
    "stroke",
    "strokeWidth",
    "strokeDash",
    "closed",
    "opacity",
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

export function isPrimitiveDrawableGraphicType(type) {
  return PRIMITIVE_DRAWABLE_TYPES.has(type);
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
