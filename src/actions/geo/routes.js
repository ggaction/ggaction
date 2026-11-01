import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { createGeoRouteResource } from "../../materialization/geo/routeResource.js";
import { resolveGeometryResource } from "../../selectors/geometry.js";
import { findStoredResource, requireStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { newDatasetNamespace } from "../primitives/datasetIdentity.js";
import { writeGeometryResource } from "./closure.js";

function routeSource(program, id) {
  validateUserId(id, "Geographic edge-route id");
  return requireStoredResource(program, { kind: "edge-route", id });
}
export const createGeoRouteData = /* @__PURE__ */ closedAction(
  { op: "createGeoRouteData", description: "Interpret retained graph edge routes as geographic or planar lines." },
  ["id", "routes", "coordinateKind"], function (args = {}) {
    const { id, routes, ...definition } = args;
    validateUserId(id, "Geographic route geometry id");
    if (findStoredResource(this, "geometry", id)) throw annotateError(new Error("Geometry already exists."), { code: "duplicate-id", resourceId: id });
    const resource = createGeoRouteResource({ id, routes: routeSource(this, routes), definition,
      logicalId: newDatasetNamespace(), allocationId: newDatasetNamespace() });
    return this.editSemantic({ property: `resource[geometry:${id}]`, value: resource });
  });

export const editGeoRouteData = /* @__PURE__ */ closedAction(
  { op: "editGeoRouteData", description: "Revise retained route geometry and its geographic consumers." },
  ["target", "routes", "coordinateKind"], function (args = {}) {
    const previous = resolveGeometryResource(this, args.target, { method: "geo-routes" });
    if (Object.keys(args).every(key => key === "target") || Object.values(args).some(value => value === undefined)) throw new TypeError("Geographic route edits require a nonempty patch without undefined values.");
    const { target, routes, ...patch } = args, { method, ...definition } = previous.options;
    const resource = createGeoRouteResource({ id: previous.id, revision: previous.revision + 1, definition: { ...definition, ...patch },
      routes: routes === undefined ? resolveInputReference(this, previous.inputs[0]) : routeSource(this, routes),
      logicalId: previous.result.identity.logicalId, allocationId: previous.result.identity.allocationId });
    return writeGeometryResource(this, resource);
  });

export function registerGeoRouteActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createGeoRouteData, editGeoRouteData });
}
