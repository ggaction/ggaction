import { action } from "../../core/action.js";
import { validateNonEmptyString, validateOptionObject } from "../../core/validation.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeCategoricalColor, normalizeCategoricalGuides,
  omitUndefinedOptions, resolveFacadeData, resolveFacadeId, validateFacadeOptions
} from "./shared.js";

const OPERATION = "createDensityPlot";
const OPTIONS = ["id", "data", "coordinate", "field", "groupBy", "bandwidth", "extent", "steps",
  "kernel", "normalization", "as", "densityChannel", "valueScale", "densityScale", "color", "area", "guides"];
const AREA_OPTIONS = ["fill", "opacity", "stroke", "strokeWidth", "curve"];

export const createDensityPlot = action({
  op: OPERATION, description: "Create a baseline kernel-density area plot with optional explicit groups."
}, function (args = {}) {
  validateFacadeOptions(args, OPTIONS, OPERATION);
  const id = resolveFacadeId(this, args.id, { defaultId: "densityPlot", operation: OPERATION });
  const data = resolveFacadeData(this, args.data, OPERATION);
  validateNonEmptyString(args.field, `${OPERATION} field`);
  const { id: requestedId, data: requestedData, color: requestedColor, area: requestedArea,
    guides: requestedGuides, ...density } = omitUndefinedOptions(args);
  const area = omitUndefinedOptions(normalizeAppearance(requestedArea, AREA_OPTIONS, `${OPERATION} area`));
  for (const [key, value] of Object.entries({ ...density, ...area })) {
    if (value === null) throw new TypeError(`${OPERATION} ${key} cannot be null.`);
  }
  for (const key of ["valueScale", "densityScale"]) {
    if (density[key] === undefined) continue;
    validateOptionObject(density[key], undefined, `${OPERATION} ${key}`);
    density[key] = omitUndefinedOptions(density[key]);
  }
  const color = requestedColor === undefined ? undefined
    : normalizeCategoricalColor(requestedColor, `${OPERATION} color`, ["field", "fieldType", "scale", "palette", "layout"]);
  if (color !== undefined && (color.field !== density.groupBy ||
    color.layout !== undefined && color.layout !== "overlay")) {
    throw new Error(`${OPERATION} color requires the same explicit groupBy field and overlay layout.`);
  }
  if (color !== undefined && area.fill !== undefined) {
    throw new Error(`${OPERATION} area.fill cannot be combined with color.`);
  }
  const guides = normalizeCategoricalGuides(requestedGuides, OPERATION, color);
  let next = this.createAreaMark({ id, data, ...area }).encodeDensity({ ...density, target: id });
  if (color !== undefined) next = next.encodeColor({ ...color, target: id });
  return applyFacadeGuides(next, guides, id, requestedGuides ?? {});
});
