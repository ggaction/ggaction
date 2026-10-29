import { isOwned } from "../../core/immutable.js";
import { DEFAULT_TEXT_MARK } from "../../grammar/text.js";
import { findLayer } from "../../selectors/layers.js";
import { AXIS_LABEL_FONT_SIZES, AXIS_TITLE_FONT_SIZE, AXIS_LABEL_FONT_WEIGHT, AXIS_TITLE_FONT_WEIGHT } from "../../theme/defaults.js";
import { TITLE_DEFAULTS } from "../titles/resolve.js";
import { ITEM_LEGEND_LABELS, ITEM_LEGEND_TITLE_STYLE } from "../guides/legends/continuous/common.js";
import { createDefaultFacetHeaders } from "../../materialization/facetHeaders.js";

const textCreationStyles = new WeakMap();
function textFamilyStyles(trace) {
  const cached = textCreationStyles.get(trace);
  if (cached !== undefined) return cached;
  const styles = new Map(), pending = [...trace.children].reverse();
  while (pending.length > 0) {
    const node = pending.pop();
    if (node.op === "createTextMark") styles.set(node.args.id ?? "text", {
      fontSize: node.args.fontSize ?? DEFAULT_TEXT_MARK.fontSize,
      fontWeight: node.args.fontWeight ?? DEFAULT_TEXT_MARK.fontWeight
    });
    if (node.op === "removeMark") styles.delete(node.args.target);
    pending.push(...[...(node.children ?? [])].reverse());
  }
  if (isOwned(trace)) textCreationStyles.set(trace, styles);
  return styles;
}

// Only native text owners participate. Their original wrapped creation retains
// family defaults (for example annotation labels) independently of theme frames.
export function themeTypographyDefault(program, path) {
  const property = path.at(-1);
  if (!["fontSize", "fontWeight"].includes(property)) return undefined;
  if (path[0] === "marks" && path.length === 3 && findLayer(program, path[1])?.mark.type === "text") {
    return (textFamilyStyles(program.trace).get(path[1]) ?? DEFAULT_TEXT_MARK)[property];
  }
  if (path[0] === "title") return TITLE_DEFAULTS[path[1]]?.[property];
  if (path[0] === "facets" && path.includes("headers")) return createDefaultFacetHeaders().common[property];
  if (path[0] !== "guides") return undefined;
  if (path[1] === "legend") {
    const role = path.includes("titleStyle") ? ITEM_LEGEND_TITLE_STYLE : ITEM_LEGEND_LABELS;
    return role[property];
  }
  if (path[1] !== "axis") return undefined;
  const role = path[2] === "parallel" ? path.at(-2) : path[3];
  if (!["labels", "title"].includes(role)) return undefined;
  if (property === "fontWeight") return role === "title" ? AXIS_TITLE_FONT_WEIGHT : AXIS_LABEL_FONT_WEIGHT;
  const family = path[2] === "parallel" ? "parallel" : ["theta", "radius"].includes(path[2]) ? "polar" : "cartesian";
  return role === "title" ? AXIS_TITLE_FONT_SIZE : AXIS_LABEL_FONT_SIZES[family];
}

export function themeTypographyValue(program, path, tokens, sourceTokens) {
  const property = path.at(-1);
  if (tokens[property] === undefined && sourceTokens[property] === undefined) return undefined;
  const defaultValue = themeTypographyDefault(program, path);
  if (defaultValue === undefined) return undefined;
  const role = path[2] === "parallel" ? path.at(-2) : path[3];
  const axisSize = path[0] === "guides" && path[1] === "axis" && property === "fontSize"
    ? tokens[role === "title" ? "axisTitleFontSize" : "axisLabelFontSize"] : undefined;
  return axisSize ?? tokens[property] ?? defaultValue;
}
