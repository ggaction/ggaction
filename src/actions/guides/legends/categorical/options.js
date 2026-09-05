import { validateOptionObject } from "../../../../core/validation.js";
import { CATEGORICAL_LEGEND_CHANNELS } from "../../../../core/vocabulary.js";
import { normalizeRecipe } from "./recipes.js";
import {
  nonEmptyString,
  nonNegative,
  positive,
  validateFontWeight,
  validateKeys,
  validateObject
} from "./validation.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from
  "../../../../theme/defaults.js";

export const CHANNELS = CATEGORICAL_LEGEND_CHANNELS;
const OPTIONS = Object.freeze([
  "target",
  "channels",
  "order",
  "position",
  "layout",
  "align",
  "direction",
  "columns",
  "offset",
  "titlePosition",
  "title",
  "symbol",
  "labels",
  "titleStyle",
  "itemGap",
  "border"
]);
const TEXT_OPTIONS = Object.freeze([
  "offset",
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight"
]);
const TITLE_OPTIONS = Object.freeze([
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight"
]);
const BORDER_OPTIONS = Object.freeze([
  "color",
  "lineWidth",
  "padding",
  "background"
]);
const COMMON_DEFAULTS = Object.freeze({
  labels: Object.freeze({
    color: DEFAULT_COLORS.text,
    fontSize: 12,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: "normal"
  }),
  titleStyle: Object.freeze({
    color: DEFAULT_COLORS.text,
    fontSize: 13,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: 600
  }),
  border: Object.freeze({
    color: DEFAULT_COLORS.border,
    lineWidth: 1,
    padding: 12,
    background: "transparent"
  })
});

function normalizeBorder(border) {
  if (border === undefined || border === false) return false;
  if (border !== true) {
    validateObject(border, BORDER_OPTIONS, "createLegend.border");
  }
  const normalized = {
    ...COMMON_DEFAULTS.border,
    ...(border === true ? {} : border)
  };
  nonEmptyString(normalized.color, "Legend border color");
  nonEmptyString(normalized.background, "Legend border background");
  nonNegative(normalized.lineWidth, "Legend border lineWidth");
  nonNegative(normalized.padding, "Legend border padding");
  return normalized;
}

export function normalizeOptions(args, kind) {
  validateOptionObject(args, OPTIONS, "createLegend");
  if (Object.hasOwn(args, "labels")) {
    validateObject(args.labels, TEXT_OPTIONS, "createLegend.labels");
  }
  if (Object.hasOwn(args, "titleStyle")) {
    validateObject(
      args.titleStyle,
      TITLE_OPTIONS,
      "createLegend.titleStyle"
    );
  }

  const defaults = {
    position: "right",
    align: "center",
    offset: kind === "series" ? 10 : 8
  };
  const labels = {
    ...COMMON_DEFAULTS.labels,
    offset: defaults.offset,
    ...(args.labels ?? {})
  };
  const titleStyle = {
    ...COMMON_DEFAULTS.titleStyle,
    ...(args.titleStyle ?? {})
  };
  const position = args.position ?? defaults.position;
  const align = args.align ?? defaults.align;
  const side = ["left", "right"].includes(position);
  const direction = args.direction ?? (side ? "vertical" : "horizontal");
  const columns = args.columns;
  const offset = args.offset ?? 8;
  const titlePosition = args.titlePosition ?? "top";
  const itemGap = args.itemGap ?? (["right", "left"].includes(position)
    ? 28
    : position === "top" ? 24 : 20);
  const layout = args.layout === undefined ? "edge" : args.layout;
  if (!["edge", "legacy-bottom"].includes(layout)) {
    throw new Error(`Unsupported legend layout "${layout}".`);
  }
  if (layout === "legacy-bottom" && position !== "bottom") {
    throw new Error('Legend layout "legacy-bottom" requires position "bottom".');
  }
  if (layout === "legacy-bottom" && (
    columns !== undefined || direction !== "horizontal" || titlePosition !== "top" || offset !== 8
  )) {
    throw new Error('Legend columns, vertical direction, left title and custom offset require layout "edge".');
  }

  if (!["right", "left", "bottom", "top"].includes(position)) {
    throw new Error(`Unsupported legend position "${position}".`);
  }
  if (!["left", "center", "right"].includes(align)) {
    throw new Error(`Unsupported legend alignment "${align}".`);
  }
  if (["right", "left"].includes(position) && align !== "center") {
    throw new Error("Side legends currently require center alignment.");
  }
  if (!["horizontal", "vertical"].includes(direction)) {
    throw new Error(`Unsupported legend direction "${direction}".`);
  }
  if (side && direction !== "vertical") {
    throw new Error("Side legends require vertical direction.");
  }
  if (side && columns !== undefined && columns !== 1) {
    throw new Error("Side legends require one column.");
  }
  if (side && titlePosition !== "top") {
    throw new Error("Side legends require a top title.");
  }
  if (columns !== undefined && (!Number.isInteger(columns) || columns <= 0)) {
    throw new RangeError("Legend columns must be a positive integer.");
  }
  nonNegative(offset, "Legend offset");
  if (!["top", "left"].includes(titlePosition)) {
    throw new Error(`Unsupported legend titlePosition "${titlePosition}".`);
  }
  nonNegative(labels.offset, "Legend label offset");
  nonEmptyString(labels.color, "Legend label color");
  positive(labels.fontSize, "Legend label fontSize");
  nonEmptyString(labels.fontFamily, "Legend label fontFamily");
  validateFontWeight(labels.fontWeight, "Legend label fontWeight");
  nonEmptyString(titleStyle.color, "Legend title color");
  positive(titleStyle.fontSize, "Legend title fontSize");
  nonEmptyString(titleStyle.fontFamily, "Legend title fontFamily");
  validateFontWeight(titleStyle.fontWeight, "Legend title fontWeight");
  positive(itemGap, "Legend itemGap");

  return {
    target: args.target,
    channels: args.channels,
    position,
    align,
    direction,
    columns,
    offset,
    titlePosition,
    title: args.title,
    symbol: normalizeRecipe(args.symbol, kind),
    labels,
    titleStyle,
    itemGap,
    layout,
    border: normalizeBorder(args.border)
  };
}
