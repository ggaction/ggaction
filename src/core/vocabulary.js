export const MARK_TYPES = Object.freeze([
  "point",
  "line",
  "bar",
  "area",
  "rule"
]);

export const ENCODING_CHANNELS = Object.freeze([
  "x",
  "y",
  "x2",
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

export const CARTESIAN_POSITION_CHANNELS = Object.freeze(["x", "y"]);

export const POLAR_POSITION_CHANNELS = Object.freeze(["theta", "radius"]);

export const POSITION_CHANNELS = Object.freeze([
  ...CARTESIAN_POSITION_CHANNELS,
  ...POLAR_POSITION_CHANNELS
]);

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
  "interval",
  "opacity"
]);

export function includesVocabulary(vocabulary, value) {
  return vocabulary.includes(value);
}
