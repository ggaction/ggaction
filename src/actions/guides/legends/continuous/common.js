import { isPlainObject } from "../../../../core/immutable.js";
import { resolveTextBounds } from "../../../../core/textMetrics.js";
import {
  validateKeys,
  validateOptionObject,
  validateNonEmptyString,
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateGeneratedItemLimit
} from "../../../../core/validation.js";
import { formatTimeTick } from "../../../../grammar/ticks.js";
import {
  formatValue,
  validateValueFormat
} from "../../../../grammar/valueFormat.js";
import {
  formatDistinctNumericSamples,
  sampleNumericRange
} from "../../../../grammar/numeric.js";
import { resolveGraphicBounds } from "../../../../layout/canvas.js";
import { isHorizontalEdgeLegend } from "../../../../layout/legendLane.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../../theme/defaults.js";
import { findLayer } from "../../../../selectors/layers.js";
import { isOpacityLegendLayer } from "../../../../materialization/legends.js";
import { findCanvasGraphic } from
  "../../../../materialization/graphicHierarchy.js";

const OPTIONS = [
  "target", "channels", "position", "align", "offset", "title", "count",
  "gradient", "symbol", "labels", "titleStyle", "itemGap", "border",
  "direction", "columns", "titlePosition"
];
const TEXT_OPTIONS = [
  "offset", "color", "fontSize", "fontFamily", "fontWeight", "format"
];
const BORDER_OPTIONS = [
  "color", "lineWidth", "padding", "background"
];
const POSITIONS = ["right", "left", "top", "bottom"];
const DEFAULT_LABELS = {
  offset: 12,
  color: DEFAULT_COLORS.text,
  fontSize: 12,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: "normal"
};
const DEFAULT_TITLE = {
  color: DEFAULT_COLORS.text,
  fontSize: 13,
  fontFamily: DEFAULT_FONT_FAMILY,
  fontWeight: 600
};
const DEFAULT_BORDER = {
  color: DEFAULT_COLORS.border,
  lineWidth: 1,
  padding: 12,
  background: "transparent"
};

export const validatePositive = validatePositiveFinite;
export const validateNonNegative = validateNonNegativeFinite;

export function editGraphicProperties(program, target, properties) {
  for (const [property, value] of Object.entries(properties)) {
    program = program.editGraphics({ target, property, value });
  }
  return program;
}

export function normalizeLegendTextOptions(value, label, defaults) {
  if (value === undefined) return { ...defaults };
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  validateKeys(value, TEXT_OPTIONS, label);
  const result = { ...defaults, ...value };
  if (Object.hasOwn(result, "offset")) {
    validateNonNegative(result.offset, `${label} offset`);
  }
  validatePositive(result.fontSize, `${label} fontSize`);
  for (const key of ["color", "fontFamily"]) {
    validateNonEmptyString(result[key], `${label} ${key}`);
  }
  if (
    typeof result.fontWeight !== "string" &&
    !Number.isFinite(result.fontWeight)
  ) {
    throw new TypeError(`${label} fontWeight must be a string or finite number.`);
  }
  if (Object.hasOwn(result, "format")) {
    result.format = validateValueFormat(result.format, `${label} format`);
  }
  return result;
}

export function normalizeLegendTitleOptions(value, label, defaults) {
  if (value !== undefined) {
    validateOptionObject(value, ["color", "fontSize", "fontFamily", "fontWeight"], label);
  }
  return normalizeLegendTextOptions(value, label, defaults);
}

export function normalizeLegendBorder(value) {
  if (value === undefined || value === false) return false;
  if (value !== true && !isPlainObject(value)) {
    throw new TypeError("createLegend.border must be a boolean or plain object.");
  }
  if (value !== true) validateKeys(value, BORDER_OPTIONS, "createLegend.border");
  const border = { ...DEFAULT_BORDER, ...(value === true ? {} : value) };
  for (const key of ["color", "background"]) {
    validateNonEmptyString(border[key], `Legend border ${key}`);
  }
  validateNonNegative(border.lineWidth, "Legend border lineWidth");
  validateNonNegative(border.padding, "Legend border padding");
  return border;
}

export function normalizeContinuousLegend(args, kind) {
  validateOptionObject(args, OPTIONS, "createLegend");
  const position = args.position ?? "right";
  if (!POSITIONS.includes(position)) {
    throw new Error(`Unsupported legend position "${position}".`);
  }
  const align = args.align ?? "center";
  if (!["left", "center", "right"].includes(align)) {
    throw new Error(`Unsupported legend alignment "${align}".`);
  }
  if (["left", "right"].includes(position) && align !== "center") {
    throw new Error("Side continuous legends require center alignment.");
  }
  const count = args.count ?? 5;
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError(
      "Continuous legend count must be an integer of at least 2."
    );
  }
  validateGeneratedItemLimit(count, "Continuous legend count");
  const offset = args.offset ?? 30;
  validateNonNegative(offset, "Legend offset");
  const titlePosition = args.titlePosition ?? "top";
  if (!["top", "left"].includes(titlePosition)) {
    throw new Error(`Unsupported legend titlePosition "${titlePosition}".`);
  }
  if (
    titlePosition === "left" &&
    (!["top", "bottom"].includes(position) || kind !== "opacity")
  ) {
    throw new Error(
      "Only horizontal opacity legends support left titlePosition."
    );
  }
  const itemGap = args.itemGap ?? (titlePosition === "left" ? 20 : 28);
  validatePositive(itemGap, "Legend itemGap");
  if (args.title !== undefined) validateNonEmptyString(args.title, "Legend title");
  if (kind === "gradient") {
    for (const key of ["symbol", "columns", "direction", "itemGap"]) {
      if (Object.hasOwn(args, key)) {
        throw new Error(`Gradient legend does not accept ${key}.`);
      }
    }
  } else {
    for (const key of ["columns", "direction", "gradient"]) {
      if (Object.hasOwn(args, key)) {
        throw new Error(`Opacity legend does not accept ${key}.`);
      }
    }
  }
  return {
    target: args.target,
    position,
    align,
    offset,
    count,
    title: args.title,
    inferredTitle: args.title === undefined,
    labels: normalizeLegendTextOptions(
      args.labels,
      "createLegend.labels",
      titlePosition === "left"
        ? { ...DEFAULT_LABELS, offset: 8 }
        : DEFAULT_LABELS
    ),
    titleStyle: normalizeLegendTitleOptions(
      args.titleStyle,
      "createLegend.titleStyle",
      DEFAULT_TITLE
    ),
    itemGap,
    titlePosition,
    border: normalizeLegendBorder(args.border)
  };
}

export function selectLegendLayer(program, requested, predicate) {
  const candidates = program.semanticSpec.layers.filter(predicate);
  if (requested === undefined) return candidates.length === 1
    ? candidates[0]
    : undefined;
  const candidate = findLayer(program, requested);
  return candidates.includes(candidate) ? candidate : undefined;
}

export function resolveContinuousLegendLayer(program, requested, channel) {
  const layer = selectLegendLayer(
    program,
    requested,
    channel === "opacity" ? isOpacityLegendLayer : candidate =>
      candidate.mark?.type === "point" && candidate.encoding?.[channel]?.scale !== undefined
  );
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? `${channel} legend requires one eligible ${channel === "opacity" ? "point or line" : "point"} mark.`
        : `Unknown ${channel} legend target "${requested}".`
    );
  }
  return layer;
}

export function resolveContinuousColorLayer(program, requested) {
  const layer = selectLegendLayer(
    program,
    requested,
    candidate => ["point", "bar", "rect"].includes(candidate.mark?.type) &&
      candidate.encoding?.color?.scale !== undefined
  );
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? "color legend requires one eligible point, bar, or rect mark."
        : `Unknown color legend target "${requested}".`
    );
  }
  return layer;
}

export function requireResolvedLegendScale(program, id, type) {
  const scale = program.resolvedScales[id];
  if (scale?.type !== type) {
    throw new Error(`Legend requires resolved ${type} scale "${id}".`);
  }
  return scale;
}

export function resolveContinuousBounds(
  program,
  message = "Continuous legend layout requires Canvas bounds."
) {
  const plot = resolveGraphicBounds(program);
  const canvas = findCanvasGraphic(program);
  if (
    plot === undefined ||
    ![plot.x, plot.y, plot.width, plot.height].every(Number.isFinite) ||
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height)
  ) {
    throw new Error(message);
  }
  return { plot, canvas: canvas.properties };
}

export function sampleContinuousValues(domain, count) {
  return sampleNumericRange(
    domain[0],
    domain[1],
    count,
    "Continuous legend domain"
  );
}

export function formatContinuousValues(values, domain, fieldType, format = "auto") {
  const resolved = validateValueFormat(format, "Legend label format");
  if (resolved === "auto") {
    return fieldType === "temporal"
      ? values.map(value => formatTimeTick(value, domain))
      : formatDistinctNumericSamples(values);
  }
  return values.map(value => formatValue(value, {
    format: resolved,
    valueType: fieldType === "temporal" ? "temporal" : "quantitative",
    label: "Legend label format"
  }));
}

export function styleContinuousText(
  program,
  id,
  style,
  { align = "left" } = {}
) {
  return editGraphicProperties(program, id, {
    fill: style.color,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    textAlign: align,
    textBaseline: "middle"
  });
}

export function resolveLegendTextBounds(position, text, style) {
  return resolveTextBounds({
    x: position.x,
    y: position.y,
    text: String(text),
    ...style,
    textAlign: position.align ?? "left",
    textBaseline: "middle"
  });
}

export function assertLegendBoundsInsideCanvas(bounds, canvas, label, config) {
  // Horizontal content is intrinsic until the shared lane places its actual
  // concrete bounds. Only that final placement can determine Canvas fit.
  if (isHorizontalEdgeLegend(config)) return;
  if (bounds.some(item =>
    item.left < 0 || item.right > canvas.width ||
    item.top < 0 || item.bottom > canvas.height
  )) {
    throw new Error(`${label} requires more Canvas margin space.`);
  }
}

export function resolveLegendBackgroundFromBounds(
  bounds,
  border,
  canvas,
  label,
  config
) {
  if (border === false) return undefined;
  const strokeExtent = border.lineWidth / 2;
  let x = Infinity;
  let y = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const item of bounds) {
    x = Math.min(x, item.left);
    y = Math.min(y, item.top);
    right = Math.max(right, item.right);
    bottom = Math.max(bottom, item.bottom);
  }
  x -= border.padding;
  y -= border.padding;
  right += border.padding;
  bottom += border.padding;
  if (!isHorizontalEdgeLegend(config) && (
    x - strokeExtent < 0 || y - strokeExtent < 0 ||
    right + strokeExtent > canvas.width ||
    bottom + strokeExtent > canvas.height
  )) {
    throw new Error(`${label} background requires more Canvas margin space.`);
  }
  return { x, y, width: right - x, height: bottom - y };
}

export function editLegendBackground(program, id, bounds, border) {
  if (bounds === undefined) return program;
  return editGraphicProperties(program, id, {
    ...bounds,
    fill: border.background,
    stroke: border.color,
    strokeWidth: border.lineWidth
  });
}

export function normalizeItemLegendLayout(args) {
  const position = args.position ?? "right";
  if (!["right", "left", "top", "bottom"].includes(position)) throw new Error(`Unsupported legend position "${position}".`);
  const side = ["left", "right"].includes(position);
  const layout = args.layout === undefined ? "edge" : args.layout;
  if (layout !== "edge") throw new Error('This legend requires layout "edge".');
  const align = args.align ?? "center";
  if (!["left", "center", "right"].includes(align)) throw new Error(`Unsupported legend alignment "${align}".`);
  const direction = args.direction ?? (side ? "vertical" : "horizontal");
  if (!["horizontal", "vertical"].includes(direction)) throw new Error(`Unsupported legend direction "${direction}".`);
  const columns = args.columns;
  if (columns !== undefined && (!Number.isInteger(columns) || columns < 1)) throw new RangeError("Legend columns must be a positive integer.");
  const titlePosition = args.titlePosition ?? "top";
  if (!["top", "left"].includes(titlePosition)) throw new Error(`Unsupported legend titlePosition "${titlePosition}".`);
  if (side && (direction !== "vertical" || align !== "center" || (columns !== undefined && columns !== 1) || titlePosition !== "top")) {
    throw new Error("Side item legends require vertical direction, center alignment, top title and one column.");
  }
  const offset = args.offset ?? 30;
  const itemGap = args.itemGap ?? 28;
  validateNonNegative(offset, "Legend offset");
  validatePositive(itemGap, "Legend itemGap");
  return { position, layout, align, direction, columns, titlePosition, offset, itemGap };
}
