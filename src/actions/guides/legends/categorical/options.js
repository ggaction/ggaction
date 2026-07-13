import { isPlainObject } from "../../../../core/immutable.js";
import { normalizeRecipe } from "./recipes.js";
import {
  nonEmptyString,
  nonNegative,
  positive,
  validateFontWeight,
  validateKeys,
  validateObject
} from "./validation.js";

export const CHANNELS = Object.freeze(["color", "strokeDash"]);
const OPTIONS = Object.freeze([
  "target",
  "channels",
  "position",
  "align",
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
    color: "#334155",
    fontSize: 12,
    fontFamily: "sans-serif",
    fontWeight: "normal"
  }),
  titleStyle: Object.freeze({
    color: "#334155",
    fontSize: 13,
    fontFamily: "sans-serif",
    fontWeight: 600
  }),
  border: Object.freeze({
    color: "#cbd5e1",
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

export function normalizeOptions(args, kind, preferredPosition) {
  if (!isPlainObject(args)) {
    throw new TypeError("createLegend options must be a plain object.");
  }
  validateKeys(args, OPTIONS, "createLegend");
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

  const positionDefault = preferredPosition ?? (
    kind === "series" ? "right" : "bottom"
  );
  const defaults = {
    position: positionDefault,
    align: "center",
    offset: kind === "series" ? 10 : 8,
    itemGap: positionDefault === "right" ? 28 : 20
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
  const itemGap = args.itemGap ?? defaults.itemGap;

  if (
    position !== positionDefault
  ) {
    throw new Error(`Unsupported legend position "${position}".`);
  }
  if (!["left", "center", "right"].includes(align)) {
    throw new Error(`Unsupported legend alignment "${align}".`);
  }
  if (position === "right" && align !== "center") {
    throw new Error("Right legends currently require center alignment.");
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
    title: args.title,
    symbol: normalizeRecipe(args.symbol, kind),
    labels,
    titleStyle,
    itemGap,
    border: normalizeBorder(args.border)
  };
}
