import { closedAction } from "../../core/action.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { GEO_LIMITS } from "../../grammar/geo/input.js";
import { rejectUnknownProperties, validateGeneratedItemLimit } from "../../core/validation.js";
import { validateUserId } from "../../core/identifiers.js";
import { createGeoLODResource } from "../../materialization/geo/lodResource.js";
import { resolveGeometryResource } from "../../selectors/geometry.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { newDatasetNamespace } from "../primitives/datasetIdentity.js";
import { writeGeometryResource } from "./closure.js";

function levelsFor(program, input) {
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Geographic level count", GEO_LIMITS.maxDepth);
  ownArray(input, "Geographic levels");
  const geometries = [], levels = input.map((level, index) => {
    ownRecord(level, "Geographic level");
    rejectUnknownProperties(level, index ? ["id", "geometry", "tolerance", "parents", "enterZoom", "exitZoom"] : ["id", "geometry", "tolerance"], "geographic level");
    if (Object.values(level).some(value => value === undefined)) throw new TypeError("Geographic level fields cannot be undefined.");
    validateUserId(level.geometry, "Geographic level geometry");
    const { geometry, ...definition } = level;
    geometries.push(resolveGeometryResource(program, geometry));
    return { ...definition, input: index };
  });
  return { levels, geometries };
}
export const createGeoLODData = /* @__PURE__ */ closedAction(
  { op: "createGeoLODData", description: "Create geographic detail levels with stable region correspondence." },
  ["id", "levels", "zoom"], function (args = {}) {
    validateUserId(args.id, "Geographic level resource id");
    if (findStoredResource(this, "geometry", args.id)) throw new Error("Geometry already exists.");
    const { levels, geometries } = levelsFor(this, args.levels);
    const resource = createGeoLODResource({ program: this, id: args.id, geometries,
      definition: { levels, ...(Object.hasOwn(args, "zoom") ? { zoom: args.zoom } : {}) },
      logicalId: newDatasetNamespace(), allocationId: newDatasetNamespace() });
    return this.editSemantic({ property: `resource[geometry:${resource.id}]`, value: resource });
  });
export const editGeoLODData = /* @__PURE__ */ closedAction(
  { op: "editGeoLODData", description: "Revise geographic detail levels and all dependent representations." },
  ["target", "levels", "zoom"], function (args = {}) {
    const previous = resolveGeometryResource(this, args.target, { method: "geo-lod" });
    if (Object.keys(args).every(key => key === "target") || Object.values(args).some(value => value === undefined)) throw new TypeError("Geographic level edits require a nonempty patch without undefined values.");
    const supplied = Object.hasOwn(args, "levels") ? levelsFor(this, args.levels) : {
      levels: previous.options.levels, geometries: previous.inputs.map(ref => resolveInputReference(this, ref)) };
    const resource = createGeoLODResource({ program: this, id: previous.id, revision: previous.revision + 1,
      geometries: supplied.geometries, definition: { levels: supplied.levels,
        zoom: Object.hasOwn(args, "zoom") ? args.zoom : previous.options.zoom, activeLevel: previous.options.activeLevel },
      logicalId: previous.result.identity.logicalId, allocationId: previous.result.identity.allocationId });
    return writeGeometryResource(this, resource);
  });
export function registerGeoLODActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createGeoLODData, editGeoLODData });
}
