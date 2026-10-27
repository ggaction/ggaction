import { findSemanticScale } from "../../selectors/scales.js";
import { action } from "../../core/action.js";
import { STROKE_STYLE_PROPERTIES } from "../../grammar/strokeStyle.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeArcCategory, normalizeCategoryAggregate,
  normalizeCategoricalColor, normalizeCategoricalGuides, omitUndefinedOptions,
  resolveFacadeData, resolveFacadeId, validateFacadeOptions
} from "./shared.js";

const OPTIONS = ["id", "data", "coordinate", "category", "value", "aggregate", "color", "arc", "guides"];
const ARC_OPTIONS = [
  "innerRadius", "padAngle", "fill", "opacity", "stroke", "strokeWidth",
  ...STROKE_STYLE_PROPERTIES
];
const RADIUS_OPTIONS = ["id", "type", "domain", "range", "zero", "nice", "reverse", "clamp"];

export function createArcPlot(program, args, { operation, defaultId, mapping }) {
  const measured = mapping !== undefined;
  validateFacadeOptions(args, [...OPTIONS, measured ? "radiusScale" : "radius"], operation);
  const id = resolveFacadeId(program, args.id, { defaultId, operation });
  const data = resolveFacadeData(program, args.data, operation);
  const category = normalizeArcCategory(args.category, operation);
  const aggregate = normalizeCategoryAggregate(args, operation);
  const arc = omitUndefinedOptions(normalizeAppearance(args.arc, ARC_OPTIONS, `${operation} arc`));
  if (measured && arc.padAngle !== undefined && arc.padAngle !== 0) throw new Error(`${operation} requires padAngle 0.`);
  const radiusScale = args.radiusScale === undefined ? undefined
    : omitUndefinedOptions(normalizeAppearance(args.radiusScale, RADIUS_OPTIONS, `${operation} radiusScale`));
  const color = args.color === false ? undefined
    : normalizeCategoricalColor(args.color === undefined ? category.field : args.color, `${operation} color`);
  if (color !== undefined && arc.fill !== undefined) {
    throw new Error(`${operation} arc.fill cannot be combined with color; use color:false.`);
  }
  let guides = normalizeCategoricalGuides(args.guides, operation, color);
  if (!measured && guides !== false) {
    for (const key of ["axes", "grid"]) {
      if (guides[key] !== undefined && guides[key] !== false) {
        throw new TypeError(`${operation} guides.${key} only accepts false.`);
      }
    }
    guides = { ...guides, axes: false, grid: false };
  }
  let next = program.createArcMark({ id, data, ...arc }).encodeTheta({
    ...category, target: id, ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
    ...(!measured ? { aggregate, ...(aggregate === "sum" ? { weight: args.value } : {}) } : {})
  });
  if (measured) {
    next = next.encodeR({ target: id, aggregate, mapping,
      ...(aggregate === "sum" ? { field: args.value } : {}),
      ...(radiusScale === undefined ? {} : { scale: radiusScale }) });
  } else if (args.radius !== undefined) {
    const radius = typeof args.radius === "string" ? { field: args.radius }
      : normalizeAppearance(args.radius, ["field", "aggregate", "scale"], `${operation} radius`);
    const scale = radius.scale ?? {};
    next = next.encodeR({ target: id, ...omitUndefinedOptions(radius), scale: {
      ...(scale.type !== "log" && findSemanticScale(next, scale.id ?? "radius") === undefined ? { zero: true } : {}),
      ...scale
    } });
  }
  if (color !== undefined) next = next.encodeColor({ ...color, target: id });
  next = applyFacadeGuides(next, guides, id, args.guides ?? {});
  return next._withMarkConfig(id, {
    ...next.markConfigs[id],
    compositionRole: measured ? "rose" : "pie"
  });
}

export const createRosePlot = /* @__PURE__ */ action({ op: "createRosePlot", description: "Create equal-angle sectors with area proportional to category count or sum." }, function (args = {}) {
  return createArcPlot(this, args, { operation: "createRosePlot", defaultId: "rosePlot", mapping: "area" });
});
export const createRadialBarPlot = /* @__PURE__ */ action({ op: "createRadialBarPlot", description: "Create equal-angle sectors with radial length proportional to category count or sum." }, function (args = {}) {
  return createArcPlot(this, args, { operation: "createRadialBarPlot", defaultId: "radialBarPlot", mapping: "radius-length" });
});
