const AXIS_POSITIONS = Object.freeze({
  x: Object.freeze(["bottom", "top"]),
  y: Object.freeze(["left", "right"])
});

const NUMERIC_FORMATS = new Set([
  ".0f", ".1f", ".2f", ".0%", ".1%", ".2e"
]);
const TIME_FORMATS = new Set(["%Y", "%Y-%m", "%Y-%m-%d"]);

export function defaultAxisPosition(channel) {
  return channel === "x" ? "bottom" : "left";
}

export function validateAxisPosition(channel, position) {
  if (!AXIS_POSITIONS[channel]?.includes(position)) {
    throw new Error(`Unsupported ${channel}-axis position "${position}".`);
  }
  return position;
}

export function defaultAxisTitleRotation(channel, position) {
  if (channel === "x") return 0;
  return position === "right" ? Math.PI / 2 : -Math.PI / 2;
}

export function axisBaseline(bounds, channel, position) {
  if (channel === "x") {
    return position === "top" ? bounds.y : bounds.y + bounds.height;
  }
  return position === "right" ? bounds.x + bounds.width : bounds.x;
}

export function resolveAxisLineGeometry(bounds, channel, position, range) {
  const baseline = axisBaseline(bounds, channel, position);
  return channel === "x"
    ? { x1: range[0], y1: baseline, x2: range[1], y2: baseline }
    : { x1: baseline, y1: range[0], x2: baseline, y2: range[1] };
}

export function resolveAxisTickGeometry({
  bounds,
  channel,
  position,
  positions,
  length
}) {
  const baseline = axisBaseline(bounds, channel, position);
  if (channel === "x") {
    const end = position === "top" ? baseline - length : baseline + length;
    return { x1: positions, y1: baseline, x2: positions, y2: end };
  }
  const end = position === "right" ? baseline + length : baseline - length;
  return position === "right"
    ? { x1: baseline, y1: positions, x2: end, y2: positions }
    : { x1: end, y1: positions, x2: baseline, y2: positions };
}

export function resolveAxisLabelGeometry({
  bounds,
  channel,
  position,
  positions,
  offset
}) {
  const baseline = axisBaseline(bounds, channel, position);
  if (channel === "x") {
    return {
      x: positions,
      y: position === "top" ? baseline - offset : baseline + offset,
      textAlign: "center",
      textBaseline: position === "top" ? "bottom" : "top"
    };
  }
  return {
    x: position === "right" ? baseline + offset : baseline - offset,
    y: positions,
    textAlign: position === "right" ? "left" : "right",
    textBaseline: "middle"
  };
}

export function resolveAxisTitleGeometry({
  bounds,
  channel,
  position,
  along,
  offset
}) {
  const baseline = axisBaseline(bounds, channel, position);
  return channel === "x"
    ? { x: along, y: position === "top" ? baseline - offset : baseline + offset }
    : { x: position === "right" ? baseline + offset : baseline - offset, y: along };
}

export function validateAxisFormat(format) {
  if (format === "auto") return format;
  if (
    format !== null &&
    typeof format === "object" &&
    Number.isInteger(format.decimals) &&
    format.decimals >= 0 &&
    Object.keys(format).length === 1
  ) {
    return format;
  }
  if (typeof format === "string" && (
    NUMERIC_FORMATS.has(format) || TIME_FORMATS.has(format)
  )) {
    return format;
  }
  throw new TypeError(
    "Label format must be auto, { decimals }, or a supported format string."
  );
}

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function formatTime(value, format) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("Time axis format requires valid timestamps.");
  }
  const year = pad(date.getUTCFullYear(), 4);
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  if (format === "%Y") return year;
  if (format === "%Y-%m") return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

export function formatAxisValue(value, scaleType, format, autoFormatter) {
  validateAxisFormat(format);
  if (format === "auto") return autoFormatter(value);
  if (["ordinal", "band", "point"].includes(scaleType)) {
    throw new Error('Discrete axis labels require format "auto".');
  }
  if (scaleType === "time") {
    if (!TIME_FORMATS.has(format)) {
      throw new Error("Time axis labels require a supported time format string.");
    }
    return formatTime(value, format);
  }
  if (TIME_FORMATS.has(format)) {
    throw new Error("Quantitative axis labels cannot use a time format string.");
  }
  if (typeof format === "object") return value.toFixed(format.decimals);
  if (format.endsWith("f")) return value.toFixed(Number(format[1]));
  if (format.endsWith("%")) {
    return `${(value * 100).toFixed(Number(format[1]))}%`;
  }
  return value.toExponential(2);
}
