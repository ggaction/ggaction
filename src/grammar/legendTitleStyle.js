import { validateOptionObject } from "../core/validation.js";

export const LEGEND_TITLE_STYLE_KEYS = Object.freeze([
  "color", "fontSize", "fontFamily", "fontWeight", "align"
]);

export function validateLegendTitleAlignment(style, titlePosition = "top") {
  if (style?.align === undefined) {
    if (style !== undefined && Object.hasOwn(style, "align")) throw new TypeError("Legend title align requires left, center or right.");
    return;
  }
  if (!["left", "center", "right"].includes(style.align)) throw new Error("Legend title align requires left, center or right.");
  if (titlePosition === "left") throw new Error("Inline legend titles do not accept title alignment.");
}

export function mergeLegendTitleStyle(previous, patch, { edit = false } = {}) {
  if (patch !== undefined) validateOptionObject(patch, LEGEND_TITLE_STYLE_KEYS, "Legend titleStyle");
  const result = { ...previous, ...patch };
  if (edit && patch?.align === "auto") delete result.align;
  validateLegendTitleAlignment(result);
  return result;
}
