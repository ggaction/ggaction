import { annotateError } from "../../core/diagnostics.js";
import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  canonicalResourcePath,
  collectResourceReferences
} from "../../core/resourceReferences.js";
import { releaseNamedResourceOwnership } from "../../core/programState.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";

const OPTIONS = Object.freeze(["id"]);

function dataOwners(program) {
  return Object.entries(program.materializationConfigs.data ?? {}).flatMap(
    ([family, owners]) => Object.entries(owners ?? {}).flatMap(([owner, config]) =>
      typeof config?.current === "string"
        ? [{ family, owner, current: config.current }]
        : []
    )
  );
}

function ownedGeneratedDatasetIds(program) {
  const result = new Set();
  for (const [id, config] of Object.entries(program.markConfigs)) {
    const layer = findLayer(program, id);
    for (const value of [
      config.errorBar?.data,
      config.errorBand?.data,
      config.regression?.dataId,
      config.boxPlot?.summaryId,
      config.boxPlot?.outlierDataId,
      config.gradientPlot?.profileId,
      config.violinPlot?.materialized === true ? layer?.data : undefined,
      config.ecdfPlot?.data,
      config.endpointPlot?.data,
      config.statisticalReference?.dataId
    ]) {
      if (typeof value === "string") result.add(value);
    }
    const dataset = findDataset(program, layer?.data);
    if (dataset?.transform?.[0]?.type === "markFilter") result.add(dataset.id);
  }
  return Object.freeze([...result].sort());
}

function exactResource(program, kind, id) {
  if (kind === "data") return findDataset(program, id);
  if (kind === "scale") return findSemanticScale(program, id);
  return findCoordinate(program, id);
}

function existingKind(program, id) {
  if (findDataset(program, id) !== undefined ||
      dataOwners(program).some(owner => owner.owner === id)) return "data";
  if (findSemanticScale(program, id) !== undefined) return "scale";
  if (findCoordinate(program, id) !== undefined) {
    return "coordinate";
  }
  if (findLayer(program, id) !== undefined) return "mark";
  return undefined;
}

export function resolveResourceOwnership(program, { kind, id }) {
  const resource = exactResource(program, kind, id);
  if (kind !== "data") {
    if (resource !== undefined) return { ownership: "named", resource };
    const other = existingKind(program, id);
    if (other !== undefined) {
      throw annotateError(new Error(`Resource "${id}" exists as ${other}, not ${kind}.`), { code: "incompatible-resource", resourceId: id });
    }
    throw annotateError(new Error(`Unknown ${kind} "${id}".`), { code: "missing-resource", resourceId: id });
  }

  const owners = dataOwners(program).filter(owner => owner.owner === id);
  if (owners.length > 1) {
    throw annotateError(new Error(`Data resource "${id}" has ambiguous logical ownership.`), { code: "ambiguous-resource", resourceId: id });
  }
  if (owners.length === 1) {
    const owner = owners[0];
    const current = exactResource(program, "data", owner.current);
    if (current === undefined) {
      throw annotateError(new Error(`Data owner "${id}" has no current dataset.`), { code: "missing-resource", resourceId: id });
    }
    return { ownership: "standalone", resource: current, dataOwner: owner };
  }
  if (resource !== undefined) {
    if (ownedGeneratedDatasetIds(program).includes(id) ||
        dataOwners(program).some(owner => owner.current === id)) {
      throw new Error(
        `Dataset "${id}" is chart-owned; use its owning resource action.`
      );
    }
    return { ownership: "named", resource };
  }
  const other = existingKind(program, id);
  if (other !== undefined) {
    throw annotateError(new Error(`Resource "${id}" exists as ${other}, not data.`), { code: "incompatible-resource", resourceId: id });
  }
  throw annotateError(new Error(`Unknown data "${id}".`), { code: "missing-resource", resourceId: id });
}

function assertSupportedProgram(program, operation) {
  if (program.compositionSpec !== undefined && program.compositionSpec.type !== "facet") {
    throw new Error(`${operation} supports unit and facet composition programs.`);
  }
}

function formatReference(value) {
  return `${value.ownerKind} "${value.ownerId}" at ` +
    canonicalResourcePath(value.path);
}

export function planResourceRemoval(program, { kind, id, operation }) {
  assertSupportedProgram(program, operation);
  const resolved = resolveResourceOwnership(program, { kind, id });
  const actualId = resolved.resource.id;
  const references = collectResourceReferences(program, { kind, id: actualId });
  const live = references.filter(value => value.strength === "live" && !(
    resolved.ownership === "standalone" &&
    value.ownerKind === "dataOwner" &&
    value.ownerId === resolved.dataOwner.owner &&
    value.path.at(-1) === "current"
  ));
  if (live.length > 0) {
    throw annotateError(new Error(
      `Cannot remove ${kind} "${id}"; live references: ` +
      live.map(formatReference).join("; ")
    ), { code: "resource-in-use", resourceId: id, candidates: [...new Set(live.map(value => value.ownerId))] });
  }
  return Object.freeze({
    kind,
    id,
    semanticIds: Object.freeze([actualId]),
    ...(resolved.dataOwner === undefined
      ? {}
      : { dataOwner: Object.freeze({ ...resolved.dataOwner }) })
  });
}

function removeResource(kind, operation, description) {
  return action(
    { op: operation, description, scope: "any" },
    function (args = {}) {
      validateOptionObject(args, OPTIONS, operation);
      const id = validateUserId(args.id, `${operation} id`);
      const plan = planResourceRemoval(this, { kind, id, operation });
      // Release a validated logical owner before removing its physical revision.
      // The primitive then checks the remaining consumers without mistaking the
      // owner's own replay entry for an independently chart-owned resource.
      let next = releaseNamedResourceOwnership(this, plan);
      const selector = kind === "data" ? "dataset" : kind;
      for (const semanticId of plan.semanticIds) {
        next = next.editSemantic({ property: `${selector}[${semanticId}]`, remove: true });
      }
      return next;
    }
  );
}

export const removeData = removeResource(
  "data", "removeData", "Remove one unreferenced named dataset."
);
export const removeScale = removeResource(
  "scale", "removeScale", "Remove one unreferenced named scale."
);
export const removeCoordinate = removeResource(
  "coordinate", "removeCoordinate", "Remove one unreferenced named coordinate."
);
