import { action } from "../../core/action.js";
import { normalizeGroupFields } from "../../grammar/pathSeries.js";
import { normalizeAreaBound, validateAreaEndpointPair } from "../../grammar/areaEndpoints.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeCategoricalColor, normalizeCategoricalGuides,
  normalizeFieldEncoding, omitUndefinedOptions, positionArgs, resolveFacadeData, resolveFacadeId,
  validateFacadeOptions
} from "./shared.js";

const OPERATION = "createAreaPlot";
const OPTIONS = ["id", "data", "coordinate", "x", "y", "valueChannel", "baseline", "groupBy", "layout", "missing", "color", "area", "guides"];

export const createAreaPlot = action({ op: OPERATION, description: "Create a simple, ranged, or stacked Cartesian area plot." }, function (args = {}) {
  validateFacadeOptions(args, OPTIONS, OPERATION);
  for (const [key, value] of Object.entries(args)) if (value === null) throw new TypeError(`${OPERATION} ${key} cannot be null.`);
  const id = resolveFacadeId(this, args.id, { defaultId: "areaPlot", operation: OPERATION });
  const data = resolveFacadeData(this, args.data, OPERATION);
  const valueChannel = args.valueChannel ?? "y";
  if (!["x", "y"].includes(valueChannel)) throw new Error("createAreaPlot valueChannel must be x or y.");
  const independentChannel = valueChannel === "y" ? "x" : "y";
  const independent = omitUndefinedOptions(normalizeFieldEncoding(args[independentChannel], `${OPERATION} ${independentChannel}`));
  validateFacadeOptions(independent, ["field", "fieldType", "temporalUnit", "scale"], `${OPERATION} independent position`);
  if (independent.fieldType !== undefined && !["quantitative", "temporal"].includes(independent.fieldType)) {
    throw new Error("createAreaPlot independent position must be quantitative or temporal.");
  }
  const measurement = omitUndefinedOptions(normalizeFieldEncoding(args[valueChannel], `${OPERATION} ${valueChannel}`));
  const ranged = Object.hasOwn(measurement, "lower") || Object.hasOwn(measurement, "upper");
  validateFacadeOptions(measurement, ranged ? ["lower", "upper", "scale"] : ["field", "scale"], `${OPERATION} measurement`);
  if (ranged && args.baseline !== undefined) throw new Error("createAreaPlot baseline cannot be combined with a range.");
  const lower = ranged ? measurement.lower : measurement.field;
  const upper = ranged ? measurement.upper : { datum: args.baseline ?? 0 };
  validateAreaEndpointPair(normalizeAreaBound(lower), normalizeAreaBound(upper));
  const groupBy = args.groupBy === undefined ? undefined : normalizeGroupFields(args.groupBy);
  const area = omitUndefinedOptions(normalizeAppearance(args.area, ["fill", "opacity", "stroke", "strokeWidth", "curve"], `${OPERATION} area`));
  const color = args.color === undefined ? undefined : normalizeCategoricalColor(args.color, `${OPERATION} color`);
  if (color !== undefined && area.fill !== undefined) throw new Error("createAreaPlot area.fill cannot be combined with color.");
  const guides = normalizeCategoricalGuides(args.guides, OPERATION, color);
  let next = this.createAreaMark({ id, data, ...area, missing: args.missing ?? "error" });
  if (groupBy !== undefined) next = next.encodeGroup({ target: id, fields: groupBy });
  next = next[independentChannel === "x" ? "encodeX" : "encodeY"](positionArgs(independent, { target: id, coordinate: args.coordinate }))
    [valueChannel === "y" ? "encodeYRange" : "encodeXRange"]({ target: id, lower, upper,
      ...(measurement.scale === undefined ? {} : { scale: measurement.scale }),
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }) })
    .layoutSeries({ target: id, mode: args.layout ?? "overlay" });
  if (color !== undefined) next = next.encodeColor({ target: id, ...color });
  return applyFacadeGuides(next, guides, id, args.guides ?? {});
});
