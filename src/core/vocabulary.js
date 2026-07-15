export const MARK_TYPES = Object.freeze(["point", "line", "bar", "area"]);

export const ENCODING_CHANNELS = Object.freeze([
  "x",
  "y",
  "y2",
  "xOffset",
  "theta",
  "radius",
  "color",
  "strokeDash",
  "size",
  "shape",
  "group",
  "opacity"
]);

export const SCALED_ENCODING_CHANNELS = Object.freeze(
  ENCODING_CHANNELS.filter(channel => channel !== "group")
);

export const POSITION_CHANNELS = Object.freeze(["x", "y"]);

export const COLOR_LAYOUTS = Object.freeze([
  "stack",
  "fill",
  "group",
  "overlay",
  "diverging"
]);

export const STACK_MODES = Object.freeze(["zero", "normalize"]);

export const CATEGORICAL_LEGEND_CHANNELS = Object.freeze([
  "color",
  "strokeDash",
  "shape"
]);

export const LEGEND_CONFIG_KINDS = Object.freeze([
  "series",
  "color",
  "size",
  "gradient",
  "opacity"
]);

export function includesVocabulary(vocabulary, value) {
  return vocabulary.includes(value);
}
