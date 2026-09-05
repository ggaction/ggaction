import { action } from "../../core/action.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeArcCategory, normalizeCategoryAggregate,
  normalizeCategoricalColor, normalizeCategoricalGuides, omitUndefinedOptions,
  resolveFacadeData, resolveFacadeId, validateFacadeOptions
} from "./shared.js";

const OPTIONS = ["id", "data", "coordinate", "category", "value", "aggregate", "radiusScale", "color", "arc", "guides"];
const ARC_OPTIONS = ["innerRadius", "padAngle", "fill", "opacity", "stroke", "strokeWidth"];
const RADIUS_OPTIONS = ["id", "type", "domain", "range", "zero", "nice", "reverse", "clamp"];

function createMeasuredPlot(program, args, { operation, defaultId, mapping }) {
  validateFacadeOptions(args, OPTIONS, operation);
  const id = resolveFacadeId(program, args.id, { defaultId, operation });
  const data = resolveFacadeData(program, args.data, operation);
  const category = normalizeArcCategory(args.category, operation);
  const aggregate = normalizeCategoryAggregate(args, operation);
  const arc = omitUndefinedOptions(normalizeAppearance(args.arc, ARC_OPTIONS, `${operation} arc`));
  if (arc.padAngle !== undefined && arc.padAngle !== 0) throw new Error(`${operation} requires padAngle 0.`);
  const radiusScale = args.radiusScale === undefined ? undefined
    : omitUndefinedOptions(normalizeAppearance(args.radiusScale, RADIUS_OPTIONS, `${operation} radiusScale`));
  const color = args.color === false ? undefined
    : normalizeCategoricalColor(args.color === undefined ? category.field : args.color, `${operation} color`);
  if (color !== undefined && arc.fill !== undefined) {
    throw new Error(`${operation} arc.fill cannot be combined with color; use color:false.`);
  }
  const guides = normalizeCategoricalGuides(args.guides, operation, color);
  let next = program.createArcMark({ id, data, ...arc }).encodeTheta({
    ...category, target: id, ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate })
  }).encodeR({ target: id, aggregate, mapping,
    ...(aggregate === "sum" ? { field: args.value } : {}),
    ...(radiusScale === undefined ? {} : { scale: radiusScale }) });
  if (color !== undefined) next = next.encodeColor({ ...color, target: id });
  return applyFacadeGuides(next, guides, id, args.guides ?? {});
}

export const createRosePlot = action({ op: "createRosePlot", description: "Create equal-angle sectors with area proportional to category count or sum." }, function (args = {}) {
  return createMeasuredPlot(this, args, { operation: "createRosePlot", defaultId: "rosePlot", mapping: "area" });
});
export const createRadialBarPlot = action({ op: "createRadialBarPlot", description: "Create equal-angle sectors with radial length proportional to category count or sum." }, function (args = {}) {
  return createMeasuredPlot(this, args, { operation: "createRadialBarPlot", defaultId: "radialBarPlot", mapping: "radius-length" });
});
