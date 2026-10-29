import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { createGeoJoinResource } from "../../materialization/geo/joinResource.js";
import { resolveGeometryResource } from "../../selectors/geometry.js";
import { resolveMaterializedDataset } from "../../selectors/datasets.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { writeGeometryResource } from "./closure.js";

export const createGeoJoinData = /* @__PURE__ */ closedAction(
  { op: "createGeoJoinData", description: "Join geometry features to a table by exact typed keys." },
  ["id", "geometry", "data", "geometryKey", "dataKey"], function (args = {}) {
    const { id, geometry, data, ...definition } = args;
    validateUserId(id, "Geometry join id");
    if (findStoredResource(this, "geometry", id)) throw annotateError(new Error("Geometry already exists."), { code: "duplicate-id", resourceId: id });
    const resource = createGeoJoinResource({ id, definition, geometry: resolveGeometryResource(this, geometry),
      dataset: resolveMaterializedDataset(this, data, "Geographic join data") });
    return this.editSemantic({ property: `resource[geometry:${id}]`, value: resource });
  });

export const editGeoJoinData = /* @__PURE__ */ closedAction(
  { op: "editGeoJoinData", description: "Revise a geometry-table join and its dependent geographic consumers." },
  ["target", "geometry", "data", "geometryKey", "dataKey"], function (args = {}) {
    const previous = resolveGeometryResource(this, args.target, { method: "geo-join" });
    if (Object.keys(args).every(key => key === "target") || Object.values(args).some(value => value === undefined)) throw new TypeError("Geographic join edits require a nonempty patch without undefined values.");
    const { target, geometry, data, ...patch } = args, { method, ...definition } = previous.options;
    const resource = createGeoJoinResource({ id: previous.id, revision: previous.revision + 1, definition: { ...definition, ...patch },
      geometry: geometry === undefined ? resolveInputReference(this, previous.inputs[0]) : resolveGeometryResource(this, geometry),
      dataset: data === undefined ? resolveInputReference(this, previous.inputs[1]) : resolveMaterializedDataset(this, data, "Geographic join data") });
    return writeGeometryResource(this, resource);
  });

export function registerGeoJoinActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createGeoJoinData, editGeoJoinData });
}
