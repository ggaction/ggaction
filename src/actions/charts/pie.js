import { action } from "../../core/action.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeCategoricalColor, normalizeCategoricalGuides,
  normalizeArcCategory, normalizeCategoryAggregate, omitUndefinedOptions,
  resolveFacadeData, resolveFacadeId, validateFacadeOptions
} from "./shared.js";

const OPERATION = "createPiePlot";
const OPTIONS = ["id", "data", "coordinate", "category", "value", "aggregate", "color", "arc", "guides"];
const ARC_OPTIONS = ["innerRadius", "padAngle", "fill", "opacity", "stroke", "strokeWidth"];
function guideOptions(value, color) {
  const guides = normalizeCategoricalGuides(value, OPERATION, color);
  if (guides === false) return false;
  for (const key of ["axes", "grid"]) {
    if (guides[key] !== undefined && guides[key] !== false) {
      throw new TypeError(`${OPERATION} guides.${key} only accepts false.`);
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
  const category = normalizeArcCategory(args.category, OPERATION);
  const aggregate = normalizeCategoryAggregate(args, OPERATION);
  const arc = omitUndefinedOptions(normalizeAppearance(args.arc, ARC_OPTIONS, `${OPERATION} arc`));
  const color = args.color === false ? undefined
    : normalizeCategoricalColor(args.color === undefined ? category.field : args.color, `${OPERATION} color`);
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
