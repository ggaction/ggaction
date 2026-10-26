import { normalizeLegendOverflow, validateLegendOverflow } from "../../../../grammar/legendOverflow.js";
export { normalizeLegendOverflow } from "../../../../grammar/legendOverflow.js";
import { validateTextAlignment } from "../../../../core/validation.js";
import{normalizeLegendClipHeight}from"../../../../grammar/legendClip.js";
import {normalizeLegendSpacing,validateLegendSpacing} from "../../../../grammar/legendSpacing.js";
import { normalizeLegendBorderDash } from "../../../../grammar/legendBorder.js";
import { LEGEND_TITLE_STYLE_KEYS, validateLegendTitleAlignment } from "../../../../grammar/legendTitleStyle.js";
import { PLOT_LEGEND_POSITIONS, isPlotLegend } from "../../../../layout/legend.js";
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
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY, DEFAULT_VERTICAL_LEGEND_ITEM_GAP } from
  "../../../../theme/defaults.js";

export const CHANNELS = CATEGORICAL_LEGEND_CHANNELS;
const OPTIONS = Object.freeze([
  "clipHeight",
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
  "rowPadding", "titlePadding",
  "border",
  "overflow"
]);
const TEXT_OPTIONS = Object.freeze([
  "offset",
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight", "align",
  "format"
]);


const BORDER_OPTIONS = Object.freeze([
  "color",
  "lineWidth",
  "padding",
  "background",
  "strokeDash"
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
  const dash = normalizeLegendBorderDash(normalized.strokeDash);
  return { ...normalized, ...(dash === undefined ? {} : { strokeDash: dash }) };
}

export function normalizeOptions(args, kind, { internalSymbol = false } = {}) {
  validateOptionObject(args, OPTIONS, "createLegend");
  if (Object.hasOwn(args, "labels")) {
    validateObject(args.labels, TEXT_OPTIONS, "createLegend.labels");
    if (args.labels.format !== undefined && args.labels.format !== "auto") {
      throw new Error("Categorical legend labels do not accept format.");
    }
  }
  if (Object.hasOwn(args, "titleStyle")) {
    validateObject(
      args.titleStyle,
      LEGEND_TITLE_STYLE_KEYS,
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
  delete labels.format;
  const titleStyle = {
    ...COMMON_DEFAULTS.titleStyle,
    ...(args.titleStyle ?? {})
  };
  const position = args.position ?? defaults.position;
  const align = args.align ?? defaults.align;
  const inside = isPlotLegend({ position });
  const side = ["left", "right"].includes(position);
  const direction = args.direction ?? (side || inside ? "vertical" : "horizontal");
  const columns = args.columns;
  const offset = args.offset ?? 8;
  const titlePosition = args.titlePosition ?? "top";
  validateLegendTitleAlignment(titleStyle, titlePosition);
  const itemGap = args.itemGap ?? (direction === "vertical"
    ? DEFAULT_VERTICAL_LEGEND_ITEM_GAP
    : position === "top" ? 24 : 20);
  const layout = args.layout === undefined ? "edge" : args.layout;
  validateLegendSpacing(kind,{...args,layout});
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

  if (!["right", "left", "bottom", "top", ...PLOT_LEGEND_POSITIONS].includes(position)) {
    throw new Error(`Unsupported legend position "${position}".`);
  }
  if (!["left", "center", "right"].includes(align)) {
    throw new Error(`Unsupported legend alignment "${align}".`);
  }
  if ((side || inside) && align !== "center") {
    throw new Error(inside ? "In-plot legends require center alignment." : "Side legends currently require center alignment.");
  }
  if (!["horizontal", "vertical"].includes(direction)) {
    throw new Error(`Unsupported legend direction "${direction}".`);
  }
  if (side && direction !== "vertical") {
    throw new Error("Side legends require vertical direction.");
  }
  if ((side || inside) && titlePosition !== "top") {
    throw new Error(inside ? "In-plot legends require a top title." : "Side legends require a top title.");
  }
  if (columns !== undefined && (!Number.isInteger(columns) || columns <= 0)) {
    throw new RangeError("Legend columns must be a positive integer.");
  }
  nonNegative(offset, "Legend offset");
  if (!["top", "left"].includes(titlePosition)) {
    throw new Error(`Unsupported legend titlePosition "${titlePosition}".`);
  }
  validateTextAlignment(labels, "Legend labels");
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

  const overflow = normalizeLegendOverflow(args.overflow, { summarySymbol: true });
  const symbol = normalizeRecipe(args.symbol, kind, { internal: internalSymbol });
  validateLegendOverflow(kind, { overflow, symbol });
  return {
    ...(args.clipHeight===undefined?{}:{clipHeight:normalizeLegendClipHeight(args.clipHeight)}),
    ...normalizeLegendSpacing(args),
    ...(overflow === undefined ? {} : { overflow }),
    target: args.target,
    channels: args.channels,
    position,
    align,
    direction,
    columns,
    offset,
    titlePosition,
    title: args.title,
    symbol,
    labels,
    titleStyle,
    itemGap,
    layout,
    border: normalizeBorder(args.border)
  };
}
