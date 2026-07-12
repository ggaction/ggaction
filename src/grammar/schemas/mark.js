const POINT_SHAPE_GRAPHICS = Object.freeze({
  circle: "circle"
});

export function validatePointShape(shape) {
  if (
    typeof shape !== "string" ||
    !Object.hasOwn(POINT_SHAPE_GRAPHICS, shape)
  ) {
    throw new Error(`Unsupported point shape "${shape}".`);
  }

  return shape;
}

export function getPointGraphicType(shape) {
  const validatedShape = validatePointShape(shape);
  return POINT_SHAPE_GRAPHICS[validatedShape];
}
