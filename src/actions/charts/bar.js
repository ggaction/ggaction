import { action } from "../../core/action.js";
import { isBarCategoryEncoding } from "../../grammar/bars/policy.js";
import { RECT_STYLE_PROPERTIES } from "../../grammar/roundedRect.js";
import {
  applyFacadeGuides,
  inferFacadeFieldType,
  normalizeAppearance,
  normalizeEncoding,
  normalizeFieldEncoding,
  normalizeGuides,
  normalizeTargetOptions,
  positionArgs,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "orientation", "x", "y", "color", "width", "bar", "guides"
]);
const BAR_OPTIONS = Object.freeze([
  "fill", "opacity", "stroke", "strokeWidth", ...RECT_STYLE_PROPERTIES
]);

function normalizeBarPosition(value, label) {
  const encoding = normalizeFieldEncoding(value, label);
  if (!Object.hasOwn(encoding, "lower") && !Object.hasOwn(encoding, "upper")) return encoding;
  validateFacadeOptions(encoding, ["lower", "upper", "fieldType", "scale"], label);
  if (typeof encoding.lower !== "string" || !encoding.lower.length ||
      typeof encoding.upper !== "string" || !encoding.upper.length) {
    throw new TypeError(`${label} range requires lower and upper field names.`);
  }
  if (encoding.fieldType !== undefined && encoding.fieldType !== "quantitative") {
    throw new Error(`${label} range must be quantitative.`);
  }
  return { ...encoding, fieldType: "quantitative" };
}

export const createBarPlot = /* @__PURE__ */ action(
  {
    op: "createBarPlot",
    description: "Create a Cartesian bar plot from existing chart data."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, "createBarPlot");
    const id = resolveFacadeId(this, args.id, {
      defaultId: "barPlot",
      operation: "createBarPlot"
    });
    const data = resolveFacadeData(this, args.data, "createBarPlot");
    const bar = normalizeAppearance(args.bar, BAR_OPTIONS, "createBarPlot bar");
    const x = normalizeBarPosition(args.x, "createBarPlot x");
    const y = normalizeBarPosition(args.y, "createBarPlot y");
    const xRange = Object.hasOwn(x, "lower");
    const yRange = Object.hasOwn(y, "lower");
    if (xRange && yRange) throw new Error("createBarPlot accepts only one range channel.");
    x.fieldType = inferFacadeFieldType(this, data, x, "createBarPlot x");
    y.fieldType = inferFacadeFieldType(this, data, y, "createBarPlot y");
    const color = normalizeEncoding(args.color, "createBarPlot color");
    const width = normalizeTargetOptions(args.width, "createBarPlot width");
    const guides = normalizeGuides(args.guides, "createBarPlot");
    const numeric = x.fieldType === "quantitative" && y.fieldType === "quantitative" &&
      x.bin === undefined && y.bin === undefined && x.aggregate === undefined && y.aggregate === undefined;
    if (args.orientation !== undefined && !numeric) throw new Error("createBarPlot orientation requires raw numeric positions.");
    const orientation = numeric ? args.orientation ?? (xRange ? "horizontal" : "vertical") : undefined;
    if (numeric && ((xRange && orientation !== "horizontal") || (yRange && orientation !== "vertical"))) {
      throw new Error("createBarPlot range must match its numeric measure orientation.");
    }

    if (!numeric && ((xRange && !isBarCategoryEncoding(y)) || (yRange && !isBarCategoryEncoding(x)))) {
      throw new Error("createBarPlot range requires a categorical or temporal opposite position.");
    }
    const positions = isBarCategoryEncoding(y) || orientation === "horizontal"
      ? [["encodeY", y], [xRange ? "encodeXRange" : "encodeX", x]]
      : [["encodeX", x], [yRange ? "encodeYRange" : "encodeY", y]];
    let next = this.createBarMark({ id, data, ...bar, ...(orientation === undefined ? {} : { orientation }) });
    for (const [operation, encoding] of positions) {
      next = next[operation](positionArgs(encoding, {
        target: id, coordinate: args.coordinate
      }));
    }
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (width !== undefined) next = next.encodeBarWidth(targetArgs(width, id));
    return applyFacadeGuides(next, guides, id);
  }
);
