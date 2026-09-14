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
    Object.defineProperty(owned, id, { value: program, enumerable: true });
  }
  return freezeOwned(owned);
}

// Semantic entries, resolved scale caches, and physical current-resource IDs
// are removed by editSemantic. A logical data owner also retains its own ID
// and replay configuration; release those non-semantic references after the
// domain's dependency validation and before the primitive deletion.
export function releaseNamedResourceOwnership(program, { kind, id, dataOwner }) {
  if (kind !== "data") return program;
  const materializationConfigs = dataOwner === undefined
    ? program.materializationConfigs
    : removeMaterializationConfig(
        program.materializationConfigs,
        ["data", dataOwner.family, dataOwner.owner]
      ).value;
  const context = program.context.currentData === id
    ? freezeOwned({ ...program.context, currentData: undefined })
    : program.context;
  if (context === program.context && materializationConfigs === program.materializationConfigs) return program;
  return program._clone({ context, materializationConfigs });
}
