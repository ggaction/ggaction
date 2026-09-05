import { action } from "../../core/action.js";
import { validateNonEmptyString, validateOptionObject } from "../../core/validation.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeFieldEncoding, normalizeGuides, omitUndefinedOptions,
  resolveFacadeData, resolveFacadeId, validateFacadeOptions
} from "./shared.js";

const OPERATION = "createPiePlot";
const OPTIONS = ["id", "data", "coordinate", "category", "value", "aggregate", "color", "arc", "guides"];
const ARC_OPTIONS = ["innerRadius", "padAngle", "fill", "opacity", "stroke", "strokeWidth"];
const CATEGORY_SCALE_OPTIONS = ["id", "type", "domain", "range", "reverse"];

function categoryOptions(value) {
  const category = normalizeFieldEncoding(value, `${OPERATION} category`);
  validateOptionObject(category, ["field", "fieldType", "scale"], `${OPERATION} category`);
  validateNonEmptyString(category.field, `${OPERATION} category field`);
  const fieldType = category.fieldType === undefined ? "nominal" : category.fieldType;
  if (!["nominal", "ordinal"].includes(fieldType)) {
    throw new TypeError(`${OPERATION} category must be nominal or ordinal.`);
  }
  if (category.scale !== undefined) {
    validateOptionObject(category.scale, CATEGORY_SCALE_OPTIONS, `${OPERATION} category.scale`);
    if (category.scale.type !== undefined && category.scale.type !== "band") {
      throw new TypeError(`${OPERATION} category.scale.type must be band.`);
    }
  }
  return { ...omitUndefinedOptions(category), fieldType,
    ...(category.scale === undefined ? {} : { scale: omitUndefinedOptions(category.scale) }) };
}

function colorOptions(value) {
  const color = normalizeFieldEncoding(value, `${OPERATION} color`);
  validateOptionObject(color, ["field", "fieldType", "scale", "palette"], `${OPERATION} color`);
  validateNonEmptyString(color.field, `${OPERATION} color field`);
  if (color.fieldType !== undefined && !["nominal", "ordinal"].includes(color.fieldType)) {
    throw new TypeError(`${OPERATION} color must be nominal or ordinal.`);
  }
  if (color.scale !== undefined) validateOptionObject(color.scale, undefined, `${OPERATION} color.scale`);
  return { ...omitUndefinedOptions(color),
    ...(color.scale === undefined ? {} : { scale: omitUndefinedOptions(color.scale) }) };
}

function guideOptions(value, color) {
  const guides = normalizeGuides(value, OPERATION);
  if (guides === false) return false;
  validateOptionObject(guides, ["axes", "grid", "legend"], `${OPERATION} guides`);
  for (const key of ["axes", "grid"]) {
    if (guides[key] !== undefined && guides[key] !== false) {
      throw new TypeError(`${OPERATION} guides.${key} only accepts false.`);
    }
  }
  const legend = guides.legend;
  if (legend !== undefined && legend !== false) {
    validateOptionObject(legend, undefined, `${OPERATION} guides.legend`);
    if (color === undefined) throw new Error(`${OPERATION} legend requires color.`);
    if (Object.hasOwn(legend, "gradient") || Object.hasOwn(legend, "count") ||
      legend.channels !== undefined && (!Array.isArray(legend.channels) ||
        legend.channels.length !== 1 || legend.channels[0] !== "color")) {
      throw new Error(`${OPERATION} only supports a categorical color legend.`);
    }
  }
  return { ...guides, axes: false, grid: false };
}

export const createPiePlot = action({
  op: OPERATION, description: "Create a categorical count or weighted-sum pie or donut plot."
}, function (args = {}) {
  validateFacadeOptions(args, OPTIONS, OPERATION);
  const id = resolveFacadeId(this, args.id, { defaultId: "piePlot", operation: OPERATION });
  const data = resolveFacadeData(this, args.data, OPERATION);
  const category = categoryOptions(args.category);
  const aggregate = args.aggregate === undefined ? "count" : args.aggregate;
  if (!["count", "sum"].includes(aggregate) ||
    (aggregate === "sum") !== (args.value !== undefined)) {
    throw new Error(`${OPERATION} requires count without value or explicit sum with value.`);
  }
  if (args.value !== undefined) validateNonEmptyString(args.value, `${OPERATION} value`);
  const arc = omitUndefinedOptions(normalizeAppearance(args.arc, ARC_OPTIONS, `${OPERATION} arc`));
  const color = args.color === false ? undefined
    : colorOptions(args.color === undefined ? category.field : args.color);
  if (color !== undefined && arc.fill !== undefined) {
    throw new Error(`${OPERATION} arc.fill cannot be combined with color; use color:false.`);
  }
  const guides = guideOptions(args.guides, color);
  let next = this.createArcMark({ id, data, ...arc }).encodeTheta({
    ...category, target: id, aggregate,
    ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
    ...(aggregate === "sum" ? { weight: args.value } : {})
  });
  if (color !== undefined) next = next.encodeColor({ ...color, target: id });
  return applyFacadeGuides(next, guides, id, args.guides ?? {});
});
