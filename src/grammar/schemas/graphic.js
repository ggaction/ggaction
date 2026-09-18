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
  canvas: new Set(["x", "y", "width", "height", "background"]),
  collection: new Set([
    "items",
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
    "lineCap",
    "lineJoin",
    "miterLimit",
    "fontSize",
    "fontFamily",
    "fontWeight",
    "fontStyle",
    "text",
    "textAlign",
    "textBaseline",
    "rotation",
    "commands",
    "opacity"
  ]),
  circle: new Set([
    "x",
    "y",
    "radius",
    "fill",
    "stroke",
    "strokeWidth",
    "lineCap",
    "lineJoin",
    "miterLimit",
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
    "lineCap",
    "lineJoin",
    "miterLimit",
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
    "lineCap",
    "lineJoin",
    "miterLimit",
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
    "fontStyle",
    "textAlign",
    "textBaseline",
    "rotation",
    "opacity",
    "length"
  ]),
  path: new Set([
    "commands",
    "fill",
    "stroke",
    "strokeWidth",
    "strokeDash",
    "lineCap",
    "lineJoin",
    "miterLimit",
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

export function isGraphicContainerType(type) {
  return type === "canvas" || type === "collection";
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
