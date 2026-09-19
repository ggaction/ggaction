import { isContinuousColorScaleType } from "../../../../grammar/scales/types.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { resolveTextBounds } from "../../../../core/textMetrics.js";
import {
  validateKeys,
  validateFontWeight,
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
import { resolveGraphicBounds, canvasOverflowError } from "../../../../layout/canvas.js";
import { isHorizontalEdgeLegend } from "../../../../layout/legendLane.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../../theme/defaults.js";
import { findLayer } from "../../../../selectors/layers.js";
import { isOpacityLegendLayer } from "../../../../materialization/legends.js";
import { findCanvasGraphic } from
  "../../../../materialization/graphicHierarchy.js";
import { normalizeLegendSampling } from "../sampling.js";
import { editGraphicProperties } from "../../../primitives/graphicProperties.js";

const OPTIONS = [
  "target", "channels", "position", "align", "offset", "title", "count",
  "values",
  "gradient", "symbol", "labels", "titleStyle", "itemGap", "border",
  "direction", "columns", "titlePosition"
];
export const ITEM_LEGEND_OPTIONS = Object.freeze([
  "target", "count", "values", "position", "layout", "align", "direction",
  "columns", "titlePosition", "offset", "itemGap", "title", "labels", "titleStyle", "border", "overflow"
]);
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
export const ITEM_LEGEND_LABELS = Object.freeze(DEFAULT_LABELS);
export const ITEM_LEGEND_TITLE_STYLE = Object.freeze({
  ...DEFAULT_TITLE, color: DEFAULT_COLORS.strongText
});

export function normalizeInitialLegendTitle(title, fallback) {
  if (title !== undefined && title !== false) validateNonEmptyString(title, "Legend title");
  return {
    title: title === false || title === undefined ? fallback : title,
    inferredTitle: title === false || title === undefined,
    titleVisible: title !== false
  };
}

export function normalizeItemLegendConfig(args, encoding, itemGap) {
  return {
    ...normalizeItemLegendLayout({ ...args, itemGap: args.itemGap ?? itemGap }),
    ...normalizeInitialLegendTitle(args.title, encoding.field),
    labels: normalizeLegendTextOptions(args.labels, "createLegend.labels", ITEM_LEGEND_LABELS),
    titleStyle: normalizeLegendTitleOptions(args.titleStyle, "createLegend.titleStyle", ITEM_LEGEND_TITLE_STYLE),
    border: normalizeLegendBorder(args.border)
  };
}

const DEFAULT_BORDER = {
  color: DEFAULT_COLORS.border,
  lineWidth: 1,
  padding: 12,
  background: "transparent"
};

export const validatePositive = validatePositiveFinite;
export const validateNonNegative = validateNonNegativeFinite;

export { editGraphicProperties };

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
  validateFontWeight(result.fontWeight, `${label} fontWeight`, "finite number");
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
  if (kind === "gradient" && Object.hasOwn(args, "values")) {
    throw new Error("Gradient legends do not support exact sample values.");
  }
  const sampling = kind === "opacity"
    ? normalizeLegendSampling(args, {
        operation: "create",
        label: "Opacity legend"
      })
    : undefined;
  const count = kind === "gradient" ? args.count ?? 5 : undefined;
  if (kind === "gradient") {
    if (!Number.isInteger(count) || count < 2) {
      throw new RangeError(
        "Continuous legend count must be an integer of at least 2."
      );
    }
    validateGeneratedItemLimit(count, "Continuous legend count");
  }
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
    ...(kind === "gradient" ? { count } : { sampling }),
    ...normalizeInitialLegendTitle(args.title),
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

export function resolveContinuousColorLayer(program, requested, channel = "color") {
  const layer = selectLegendLayer(
    program,
    requested,
    candidate => (channel === "stroke"
      ? ["point", "line", "area", "bar", "rect", "arc", "rule", "tick"]
      : ["point", "bar", "rect", "text"]
    ).includes(candidate.mark?.type) &&
      candidate.encoding?.[channel]?.scale !== undefined
  );
  if (layer === undefined) {
    throw new Error(
      requested === undefined
        ? channel === "color"
          ? "color legend requires one eligible point, bar, or rect mark."
          : "stroke legend requires one eligible mark."
        : `Unknown ${channel} legend target "${requested}".`
    );
  }
  return layer;
}

export function requireResolvedLegendScale(program, id, type) {
  const scale = program.resolvedScales[id];
  if (type === "sequential" ? !isContinuousColorScaleType(scale?.type) : scale?.type !== type) {
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

export function resolveLegendTextBounds(position, text, style, profile) {
  return resolveTextBounds({
    x: position.x,
    y: position.y,
    text: String(text),
    ...style,
    textAlign: position.align ?? "left",
    textBaseline: "middle"
  }, profile);
}

export function assertLegendBoundsInsideCanvas(bounds, canvas, label, config) {
  // Horizontal content is intrinsic until the shared lane places its actual
  // concrete bounds. Only that final placement can determine Canvas fit.
  if (isHorizontalEdgeLegend(config)) return;
  if (bounds.some(item =>
    item.left < 0 || item.right > canvas.width ||
    item.top < 0 || item.bottom > canvas.height
  )) {
    throw canvasOverflowError(`${label} requires more Canvas margin space.`, bounds, canvas);
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
    throw canvasOverflowError(`${label} background requires more Canvas margin space.`, [{
      left: x - strokeExtent, right: right + strokeExtent,
      top: y - strokeExtent, bottom: bottom + strokeExtent
    }], canvas);
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

export function materializeItemLegend(program, kind, config, layout, {
  symbols, optional = {}, text = layout.labels,
  labels = layout.config.labels, titleStyle = layout.config.titleStyle
}) {
  const prefix = `${kind}Legend`;
  const symbolLength = Object.values(symbols).find(Array.isArray)?.length ?? text.length;
  let next = program
    .editSemantic({ property: `guide.legend.${kind}.scale`, value: config.scale })
    .editSemantic({ property: `guide.legend.${kind}.title`, value: config.title })
    ._withLegendConfig(kind, config);
  next = editGraphicProperties(next, `${prefix}Symbols`, {
    length: symbolLength,
    ...symbols
  });
  next = editGraphicProperties(next, `${prefix}Labels`, {
    length: text.length, x: layout.labelX, y: layout.itemY, text
  });
  next = editLegendBackground(next, `${prefix}Background`, layout.background, config.border);
  next = editGraphicProperties(next, `${prefix}Symbols`, Object.fromEntries(
    Object.entries(optional).filter(([, value]) => value !== undefined)
  ));
  next = styleContinuousText(next, `${prefix}Labels`, labels);
  const effective = layout.config;
  if (effective.titleVisible === false) return next;
  next = editGraphicProperties(next, `${prefix}Title`, {
    x: layout.title.x, y: layout.title.y, text: effective.title
  });
  return styleContinuousText(next, `${prefix}Title`, titleStyle, { align: layout.title.align });
}

export function createItemLegendGraphics(program, kind, config, count, type, placement) {
  const prefix = `${kind}Legend`;
  let next = program
    .editSemantic({ property: `guide.legend.${kind}.scale`, value: config.scale })
    .editSemantic({ property: `guide.legend.${kind}.title`, value: config.title })
    ._withLegendConfig(kind, config);
  if (config.border !== false) next = next.createGraphics({ id: `${prefix}Background`, type: "rect", ...placement });
  next = next.createGraphics({ id: `${prefix}Symbols`, type, length: count, ...placement })
    .createGraphics({ id: `${prefix}Labels`, type: "text", length: count, ...placement });
  if (config.titleVisible !== false) next = next.createGraphics({ id: `${prefix}Title`, type: "text", ...placement });
  return next;
}
