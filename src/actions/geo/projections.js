import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { ownRecord } from "../../core/ownData.js";
import { validateUserId } from "../../core/identifiers.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { normalizeProjectionDefinition, projectionParameters } from "../../grammar/geo/projectionDefinition.js";
import { createProjectionResource } from "../../materialization/geo/projectionResource.js";
import { resolveProjectionResource } from "../../selectors/projections.js";
import { resolveGeometryResource } from "../../selectors/geometry.js";
import { findStoredResource } from "../../selectors/resources.js";

const PARAMETERS = ["type", "centerDeg", "rotateDeg", "parallelsDeg", "scalePx", "translatePx", "reflectX", "reflectY", "precisionPx", "clipAngleDeg", "clipExtentPx", "fit"];
function intent(program, args, previous) {
  const { id, target, fit, ...patch } = args;
  const existing = previous === undefined ? {} : projectionParameters(previous);
  const math = { ...(patch.type !== undefined && patch.type !== existing.type ? {} : existing), ...patch };
  const explicitTransform = Object.hasOwn(patch, "scalePx") || Object.hasOwn(patch, "translatePx");
  let policy = explicitTransform ? undefined : previous?.options.fit;
  let geometryId = previous?.inputs[0]?.id;
  if (Object.hasOwn(args, "fit")) {
    ownRecord(fit, "Projection fit request");
    rejectUnknownProperties(fit, ["geometry", "width", "height", "padding", "pointScale"], "projection fit");
    if (explicitTransform) throw new TypeError("Projection fit conflicts with explicit scalePx or translatePx.");
    const { geometry, ...viewport } = fit;
    if (Object.hasOwn(fit, "geometry")) geometryId = validateUserId(geometry, "Fit geometry id");
    policy = { ...(existing.scalePx === undefined ? {} : { pointScale: existing.scalePx }), ...viewport };
  }
  if (policy !== undefined) { delete math.scalePx; delete math.translatePx; }
  const options = normalizeProjectionDefinition({ ...math, ...(policy === undefined ? {} : { fit: policy }) });
  return { options, ...(policy === undefined ? {} : { geometry: resolveGeometryResource(program, geometryId) }) };
}

export const createProjection = /* @__PURE__ */ closedAction(
  { op: "createProjection", description: "Create a named geographic or planar projection." }, ["id", ...PARAMETERS], function (args = {}) {
    validateUserId(args.id, "Projection id");
    if (findStoredResource(this, "projection", args.id)) throw annotateError(new Error("Projection already exists."), { code: "duplicate-id", resourceId: args.id });
    const resource = createProjectionResource({ id: args.id, ...intent(this, args) });
    return this.editSemantic({ property: `resource[projection:${resource.id}]`, value: resource });
  });

export const editProjection = /* @__PURE__ */ closedAction(
  { op: "editProjection", description: "Revise a named projection and its explicit fit policy." }, ["target", ...PARAMETERS], function (args = {}) {
    const previous = resolveProjectionResource(this, args.target);
    if (Object.keys(args).every(key => key === "target") || Object.values(args).some(value => value === undefined)) throw new TypeError("Projection edits require a nonempty patch without undefined values.");
    const resource = createProjectionResource({ id: previous.id, revision: previous.revision + 1, ...intent(this, args, previous) });
    return this.editSemantic({ property: `resource[projection:${resource.id}]`, value: resource });
  });

export function registerProjectionActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createProjection, editProjection });
}
