import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { CONTOUR_DENSITY_FIELDS } from "../../grammar/contour/input.js";
import { createContourResource } from "../../materialization/contour/resources.js";
import { resolveMaterializedDataset } from "../../selectors/datasets.js";
import { resolveContourResource } from "../../selectors/contours.js";
import { findStoredResource, resolveInputReference } from "../../selectors/resources.js";
import { preflightContourConsumers, materializeContourConsumers } from "./closure.js";

function requireMissing(program, id) {
  validateUserId(id, "Contour id");
  if (findStoredResource(program, "geometry", id)) throw annotateError(new Error("Geometry already exists."), { code: "duplicate-id", resourceId: id });
}

export const createContourData = /* @__PURE__ */ closedAction(
  { op: "createContourData", description: "Extract contours from an explicit scalar grid." }, ["id", "grid", "thresholds"], function (args = {}) {
    requireMissing(this, args.id);
    const resource = createContourResource(args);
    return this.editSemantic({ property: `resource[geometry:${resource.id}]`, value: resource });
  });

export const createDensityContourData = /* @__PURE__ */ closedAction(
  { op: "createDensityContourData", description: "Extract contours from explicit two-dimensional point density." },
  ["id", "data", "thresholds", ...CONTOUR_DENSITY_FIELDS], function (args = {}) {
    const { id, data, thresholds, ...definition } = args;
    requireMissing(this, id);
    const resource = createContourResource({ id, thresholds, definition, dataset: resolveMaterializedDataset(this, data, "Contour data") });
    return this.editSemantic({ property: `resource[geometry:${id}]`, value: resource });
  });

export function writeContourResource(program, resource) {
  return writeContourResources(program, [resource]);
}

function writeContourResources(program, resources) {
  if (resources.length === 0) return program;
  const ids = preflightContourConsumers(program, resources);
  let next = program;
  for (const resource of resources) next = next.editSemantic({ property: `resource[geometry:${resource.id}]`, value: resource });
  return materializeContourConsumers(next, ids);
}

export const editContourData = /* @__PURE__ */ closedAction(
  { op: "editContourData", description: "Revise contour data and its consumers." }, ["target", "grid", "thresholds", "data", "definition"], function (args = {}) {
    const previous = resolveContourResource(this, args.target);
    const patch = Object.fromEntries(Object.entries(args).filter(([key]) => key !== "target"));
    if (!Object.keys(patch).length || Object.values(patch).some(value => value === undefined)) throw new TypeError("Contour edits require a nonempty patch without undefined values.");
    const density = previous.options.source === "density";
    if (density ? Object.hasOwn(args, "grid") : Object.hasOwn(args, "data") || Object.hasOwn(args, "definition")) throw new TypeError("Contour edits must preserve their source kind; density grid belongs in definition.");
    if (Object.hasOwn(args, "definition")) {
      ownRecord(args.definition, "Contour definition patch");
      if (!Object.keys(args.definition).length && Object.keys(patch).length === 1) throw new TypeError("Contour definition patch cannot be empty.");
    }
    const resource = createContourResource({ id: previous.id, revision: previous.revision + 1,
      thresholds: args.thresholds ?? previous.options.thresholds,
      ...(density ? { dataset: args.data === undefined ? resolveInputReference(this, previous.inputs[0]) : resolveMaterializedDataset(this, args.data),
        definition: { ...previous.options.definition, ...args.definition } } : { grid: args.grid ?? previous.result.contours.grid }) });
    return writeContourResource(this, resource);
  });

export function reviseContourInputs(program, replacements) {
  const resources = [];
  for (const resource of program.semanticSpec.resources) {
    if (resource.kind !== "geometry" || resource.options.method !== "contour" || resource.options.source !== "density") continue;
    const data = replacements.get(resource.inputs[0].id);
    if (data !== undefined) resources.push(createContourResource({ id: resource.id, revision: resource.revision + 1,
      dataset: resolveMaterializedDataset(program, data, "Contour data"), definition: resource.options.definition, thresholds: resource.options.thresholds }));
  }
  return writeContourResources(program, resources);
}

export function registerContourResourceActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { createContourData, createDensityContourData, editContourData });
}
