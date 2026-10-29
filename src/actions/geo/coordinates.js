import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { createNativeCoordinate, validateCoordinateLayers } from "../coordinates/actions.js";
import { editNativeCoordinate } from "../coordinates/edit.js";
import { findCoordinate, requireCoordinate } from "../../selectors/coordinates.js";
import { requireLayer } from "../../selectors/layers.js";
import { resolveProjectionResource } from "../../selectors/projections.js";
import { validateResourceGraph } from "../../materialization/resourceState.js";
import { applyMaterializationPlan, planCoordinateRematerialization } from "../../materialization/dependencies.js";

const projectionRef = resource => ({ kind: "projection", id: resource.id, revision: resource.revision });

export const createGeoAwareCoordinate = /* @__PURE__ */ closedAction(
  { op: "createCoordinate", description: "Create a named native or geographic coordinate and attach compatible layers." },
  ["id", "type", "layers", "projection"], function (args = {}) {
    if (args.type !== "geo") return createNativeCoordinate(this, args);
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Geo coordinate options cannot be undefined.");
    const id = validateUserId(args.id ?? "main", "Coordinate id"), existing = findCoordinate(this, id);
    if (existing !== undefined && existing.type !== "geo") throw new TypeError("Coordinate already exists with a different type.");
    const projection = resolveProjectionResource(this, args.projection ?? existing?.projection.id), ref = projectionRef(projection);
    if (existing !== undefined && (existing.projection.id !== ref.id || existing.projection.revision !== ref.revision)) throw new TypeError("Use editCoordinate to replace an existing projection binding.");
    const layers = validateCoordinateLayers(this, args.layers ?? []);
    for (const id of layers) {
      const layer = requireLayer(this, id);
      if (layer.mark?.type !== "geo") throw new TypeError("Geo coordinates require geographic marks.");
      if (layer.coordinate !== undefined && layer.coordinate !== (existing?.id ?? args.id ?? "main")) throw new TypeError("Layer already uses another coordinate.");
    }
    let next = existing === undefined ? this.editSemantic({ property: `coordinate[${id}].type`, value: "geo" })
      .editSemantic({ property: `coordinate[${id}].projection`, value: ref }) : this;
    for (const layerId of layers) if (requireLayer(next, layerId).coordinate === undefined) next = next.editSemantic({ property: `layer[${layerId}].coordinate`, value: id });
    validateResourceGraph(next, this.constructor);
    return next;
  });

export const editGeoAwareCoordinate = /* @__PURE__ */ closedAction(
  { op: "editCoordinate", description: "Edit a coordinate constraint or geographic projection binding and its consumers." },
  ["target", "aspect", "polarFrame", "projection"], function (args = {}) {
    const id = validateUserId(args.target, "Coordinate id"), coordinate = requireCoordinate(this, id);
    if (coordinate.type !== "geo") return editNativeCoordinate(this, args);
    rejectUnknownProperties(args, ["target", "projection"], "Geo coordinate edit");
    validateUserId(args.projection, "Projection id");
    const projection = projectionRef(resolveProjectionResource(this, args.projection));
    const proposed = this.editSemantic({ property: `coordinate[${id}].projection`, value: projection });
    validateResourceGraph(proposed, this.constructor);
    const plan = planCoordinateRematerialization(proposed, id);
    applyMaterializationPlan(proposed, plan);
    return applyMaterializationPlan(proposed, plan);
  });

export function registerGeoCoordinateActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createCoordinate: createGeoAwareCoordinate, editCoordinate: editGeoAwareCoordinate });
}
