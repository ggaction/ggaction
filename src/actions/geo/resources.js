import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { ownRecord } from "../../core/ownData.js";
import { validateUserId } from "../../core/identifiers.js";
import { normalizeGeometryOptions } from "../../grammar/geo/options.js";
import { createGeometryResource } from "../../materialization/geo/resources.js";
import { resolveGeometryResource } from "../../selectors/geometry.js";
import { findStoredResource } from "../../selectors/resources.js";
import { newDatasetNamespace } from "../primitives/datasetIdentity.js";
import { writeGeometryResource } from "./closure.js";

export const createGeometryData = /* @__PURE__ */ closedAction(
  { op: "createGeometryData", description: "Normalize an immutable geographic or planar geometry source." },
  ["id", "format", "values", "coordinateKind", "featureKey", "topoObject", "limits", "polygonWinding"], function (args = {}) {
    const { id, values, ...intent } = args;
    validateUserId(id, "Geometry id");
    if (findStoredResource(this, "geometry", id)) throw annotateError(new Error("Geometry already exists."), { code: "duplicate-id", resourceId: id });
    const resource = createGeometryResource({ id, values, options: normalizeGeometryOptions(intent),
      logicalId: newDatasetNamespace(), allocationId: newDatasetNamespace() });
    return this.editSemantic({ property: `resource[geometry:${id}]`, value: resource });
  });

export const editGeometryData = /* @__PURE__ */ closedAction(
  { op: "editGeometryData", description: "Revise a geometry source while retaining its feature identity policy." },
  ["target", "values", "coordinateKind", "topoObject", "limits", "polygonWinding"], function (args = {}) {
    const previous = resolveGeometryResource(this, args.target, { method: "geo" }), { target, values, ...patch } = args;
    if (Object.keys(args).every(key => key === "target") || Object.values(args).some(value => value === undefined)) throw new TypeError("Geometry edits require a nonempty patch without undefined values.");
    const { method, ...intent } = previous.options;
    if (patch.coordinateKind === "planar" && !Object.hasOwn(patch, "polygonWinding")) delete intent.polygonWinding;
    const resource = createGeometryResource({ id: previous.id, options: normalizeGeometryOptions({ ...intent, ...patch,
      ...(Object.hasOwn(patch, "limits") ? { limits: { ...intent.limits, ...ownRecord(patch.limits, "Geometry limit patch") } } : {}) }),
      values: Object.hasOwn(args, "values") ? values : previous.result.source.values, allocationId: newDatasetNamespace(),
      previous, replaceValues: Object.hasOwn(args, "values") || Object.hasOwn(args, "topoObject") && args.topoObject !== previous.options.topoObject });
    return writeGeometryResource(this, resource);
  });

export function registerGeometryActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createGeometryData, editGeometryData });
}
