import {
  cloneAndFreeze,
  freezeOwned,
  isOwned,
  isPlainObject
} from "./immutable.js";
import { removeMaterializationConfig } from "./materializationState.js";

export function ownProgramState(value) {
  return isOwned(value) ? value : cloneAndFreeze(value);
}

export function ownChildPrograms(children, ProgramClass) {
  if (!isPlainObject(children)) {
    throw new TypeError("ChartProgram children must be a plain object.");
  }
  if (isOwned(children)) return children;
  const owned = {};
  for (const [id, program] of Object.entries(children)) {
    if (typeof id !== "string" || id.length === 0) {
      throw new TypeError("ChartProgram child IDs must be non-empty strings.");
    }
    if (!(program instanceof ProgramClass)) {
      throw new TypeError(`ChartProgram child "${id}" must be a ChartProgram.`);
    }
    owned[id] = program;
  }
  return freezeOwned(owned);
}

const COLLECTION_BY_RESOURCE_KIND = Object.freeze({
  data: "datasets",
  scale: "scales",
  coordinate: "coordinates"
});

const CONTEXT_BY_RESOURCE_KIND = Object.freeze({
  data: "currentData",
  scale: "currentScale",
  coordinate: "currentCoordinate"
});

export function removeNamedSemanticResourceState(program, {
  kind,
  id,
  semanticIds = [id],
  dataOwner
}) {
  const collection = COLLECTION_BY_RESOURCE_KIND[kind];
  if (collection === undefined) {
    throw new Error(`Unknown removable resource kind "${kind}".`);
  }
  const removed = new Set(semanticIds);
  const semanticSpec = freezeOwned({
    ...program.semanticSpec,
    [collection]: freezeOwned(program.semanticSpec[collection].filter(
      resource => !removed.has(resource.id)
    ))
  });
  const resolvedScales = kind === "scale"
    ? freezeOwned(Object.fromEntries(Object.entries(program.resolvedScales).filter(
        ([scaleId]) => !removed.has(scaleId)
      )))
    : program.resolvedScales;
  const contextKey = CONTEXT_BY_RESOURCE_KIND[kind];
  const contextTargets = new Set([id, ...semanticIds]);
  const context = contextTargets.has(program.context[contextKey])
    ? freezeOwned({ ...program.context, [contextKey]: undefined })
    : program.context;
  const materializationConfigs = dataOwner === undefined
    ? program.materializationConfigs
    : removeMaterializationConfig(
        program.materializationConfigs,
        ["data", dataOwner.family, dataOwner.owner]
      ).value;
  return program._clone({
    semanticSpec,
    resolvedScales,
    context,
    materializationConfigs
  });
}
