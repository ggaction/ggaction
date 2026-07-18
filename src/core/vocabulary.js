export const MARK_TYPES = Object.freeze([
  "point",
  "line",
  "bar",
  "area",
  "arc",
  "rule"
]);

export const MARK_GRAPHIC_TYPES = Object.freeze({
  point: Object.freeze(["circle", "rect", "path", "collection"]),
  line: Object.freeze(["path"]),
  bar: Object.freeze(["rect"]),
  area: Object.freeze(["path"]),
  arc: Object.freeze(["path"]),
  rule: Object.freeze(["line"])
});

export const ENCODING_CHANNELS = Object.freeze([
  "x",
  "y",
  "x2",
  "y2",
  "xOffset",
  "yOffset",
  "theta",
  "radius",
  "color",
  "strokeDash",
  "size",
  "shape",
  "group",
  "opacity"
]);

const CARTESIAN_MARK_TYPES = Object.freeze([
  "point", "line", "bar", "area", "rule"
]);
const POLAR_MARK_TYPES = Object.freeze(["point", "line", "arc"]);

export const POSITION_CHANNEL_DEFINITIONS = Object.freeze({
  x: Object.freeze({
    family: "cartesian",
    role: "primary",
    scaleChannel: "x",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    guideChannel: "x",
    gridDirection: "vertical",
    markTypes: CARTESIAN_MARK_TYPES
  }),
  y: Object.freeze({
    family: "cartesian",
    role: "primary",
    scaleChannel: "y",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    guideChannel: "y",
    gridDirection: "horizontal",
    markTypes: CARTESIAN_MARK_TYPES
  }),
  x2: Object.freeze({
    family: "cartesian",
    role: "secondary",
    scaleChannel: "x",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["area", "rule"])
  }),
  y2: Object.freeze({
    family: "cartesian",
    role: "secondary",
    scaleChannel: "y",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["area", "rule"])
  }),
  xOffset: Object.freeze({
    family: "cartesian",
    role: "offset",
    scaleChannel: "xOffset",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["bar"])
  }),
  yOffset: Object.freeze({
    family: "cartesian",
    role: "offset",
    scaleChannel: "yOffset",
    coordinate: Object.freeze({ id: "main", type: "cartesian" }),
    markTypes: Object.freeze(["bar"])
  }),
  theta: Object.freeze({
    family: "polar",
    role: "primary",
    scaleChannel: "theta",
    coordinate: Object.freeze({ id: "polar", type: "polar" }),
    guideChannel: "theta",
    gridDirection: "theta",
    markTypes: POLAR_MARK_TYPES
  }),
  radius: Object.freeze({
    family: "polar",
    role: "primary",
    scaleChannel: "radius",
    coordinate: Object.freeze({ id: "polar", type: "polar" }),
    guideChannel: "radius",
    gridDirection: "radial",
    markTypes: POLAR_MARK_TYPES
  })
});

export const SCALED_ENCODING_CHANNELS = Object.freeze(
  ENCODING_CHANNELS.filter(channel => channel !== "group")
);

export const POSITION_ENCODING_CHANNELS = Object.freeze(
  Object.keys(POSITION_CHANNEL_DEFINITIONS)
);

export const OFFSET_POSITION_CHANNELS = Object.freeze(
  POSITION_ENCODING_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].role === "offset"
  )
);

export const CARTESIAN_POSITION_CHANNELS = Object.freeze(
  POSITION_ENCODING_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].family === "cartesian" &&
    POSITION_CHANNEL_DEFINITIONS[channel].role === "primary"
  )
);

export const POLAR_POSITION_CHANNELS = Object.freeze(
  POSITION_ENCODING_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].family === "polar" &&
    POSITION_CHANNEL_DEFINITIONS[channel].role === "primary"
  )
);

export const POSITION_CHANNELS = Object.freeze([
  ...CARTESIAN_POSITION_CHANNELS,
  ...POLAR_POSITION_CHANNELS
]);

export const FACET_SCALE_CHANNELS = Object.freeze([
  "x",
  "y",
  "xOffset",
  "yOffset",
  "color",
  "size",
  "shape",
  "opacity",
  "strokeDash"
]);

export const FACET_SCALE_RESOLUTIONS = Object.freeze([
  "shared",
  "independent"
]);

export function getPositionChannelDefinition(channel) {
  return POSITION_CHANNEL_DEFINITIONS[channel];
}

export function normalizePositionScaleChannel(channel) {
  return POSITION_CHANNEL_DEFINITIONS[channel]?.scaleChannel ?? channel;
}

export function positionChannelsForFamily(family) {
  return POSITION_CHANNELS.filter(channel =>
    POSITION_CHANNEL_DEFINITIONS[channel].family === family
  );
}

export function getMarkGraphicTypes(markType) {
  return MARK_GRAPHIC_TYPES[markType];
}

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
