const SCALE_EDIT_PROPERTIES = Object.freeze([
  "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant", "paddingInner", "paddingOuter",
  "padding", "align", "interpolate", "midpoint", "unknown"
]);

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function scaleEditPatch(id, definition) {
  return {
    id,
    ...Object.fromEntries(SCALE_EDIT_PROPERTIES
      .filter(property => Object.hasOwn(definition, property))
      .map(property => [property, definition[property]]))
  };
}

export function changedScaleEditPatch(current, definition) {
  const patch = scaleEditPatch(current.id, definition);
  return Object.entries(patch).some(
    ([property, value]) => property !== "id" &&
      !sameValue(current[property], value)
  ) ? patch : undefined;
}
