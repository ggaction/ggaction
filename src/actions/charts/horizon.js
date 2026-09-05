import { action } from "../../core/action.js";
import { validateNonEmptyString, validateOptionObject, validateUnitInterval } from "../../core/validation.js";
import {
  applyFacadeGuides, normalizeAppearance, normalizeFieldEncoding, normalizeGuides,
  omitUndefinedOptions, resolveFacadeData, resolveFacadeId, validateFacadeOptions
} from "./shared.js";

const OPERATION = "createHorizonPlot";
const OPTIONS = ["id", "data", "coordinate", "x", "y", "groupBy", "bands", "baseline", "extent",
  "resolve", "missing", "overflow", "palette", "area", "guides"];

function position(value, role) {
  const label = `${OPERATION} ${role}`;
  const field = normalizeFieldEncoding(value, label);
  validateOptionObject(field, ["field", "fieldType", "scale", ...(role === "x" ? ["temporalUnit"] : [])], label);
  validateNonEmptyString(field.field, `${label} field`);
  if (field.fieldType === null || field.temporalUnit === null) throw new TypeError(`${label} type/unit cannot be null.`);
  if (field.scale !== undefined) validateOptionObject(field.scale, undefined, `${label}.scale`);
  return { ...omitUndefinedOptions(field),
    ...(field.scale === undefined ? {} : { scale: omitUndefinedOptions(field.scale) }) };
}

function guideOptions(value) {
  const guides = normalizeGuides(value, OPERATION);
  if (guides === false) return false;
  validateOptionObject(guides, ["axes", "grid", "legend"], `${OPERATION} guides`);
  for (const [family, forbidden, supported] of [
    ["axes", "y", ["coordinate", "x", "y"]], ["grid", "horizontal", ["horizontal", "vertical"]]
  ]) {
    const options = guides[family];
    if (options === undefined || options === false) continue;
    validateOptionObject(options, supported, `${OPERATION} guides.${family}`);
    if (options[forbidden] !== undefined && options[forbidden] !== false) {
      throw new Error(`${OPERATION} guides.${family}.${forbidden} only accepts false.`);
    }
  }
  if (guides.legend !== undefined && guides.legend !== false) {
    throw new Error(`${OPERATION} guides.legend only accepts false.`);
  }
  return guides;
}

export const createHorizonPlot = action({
  op: OPERATION, description: "Create a signed, folded horizon area with original-x guides."
}, function (args = {}) {
  validateFacadeOptions(args, OPTIONS, OPERATION);
  const id = resolveFacadeId(this, args.id, { defaultId: "horizonPlot", operation: OPERATION });
  const data = resolveFacadeData(this, args.data, OPERATION);
  const x = position(args.x, "x");
  const y = position(args.y, "y");
  const { id: requestedId, data: requestedData, coordinate, x: requestedX, y: requestedY,
    area: requestedArea, guides: requestedGuides, ...horizon } = omitUndefinedOptions(args);
  const { opacity, ...area } = omitUndefinedOptions(normalizeAppearance(requestedArea,
    ["opacity", "stroke", "strokeWidth", "curve"], `${OPERATION} area`));
  for (const [key, value] of Object.entries({ ...horizon, ...area })) {
    if (value === null) throw new TypeError(`${OPERATION} ${key} cannot be null.`);
  }
  if (horizon.palette !== undefined) {
    validateOptionObject(horizon.palette, ["positive", "negative"], `${OPERATION} palette`);
    if (Object.values(horizon.palette).some(value => value === null)) {
      throw new TypeError(`${OPERATION} palette entries cannot be null.`);
    }
  }
  if (opacity !== undefined) validateUnitInterval(opacity, `${OPERATION} area.opacity`);
  const guides = guideOptions(requestedGuides);
  let next = this.createAreaMark({ id, data, ...area });
  if (coordinate !== undefined) next = next.createCoordinate({ id: coordinate, type: "cartesian", layers: [id] });
  next = next.encodeHorizon({ ...horizon, target: id, x, y });
  if (opacity !== undefined) next = next.editAreaMark({ target: id, opacity });
  return applyFacadeGuides(next, guides, id, requestedGuides ?? {});
});
