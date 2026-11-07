import { applyMaterializationPlanStages, planLayersDataRematerialization } from "../../materialization/dependencies.js";
import { orderConditionalMarkIds } from "../../materialization/conditionalState.js";
// Full assembly supplies the domain action that revises data-backed resources.
// Basic has no extended resource kinds and imports no hierarchy algorithms.
import { ownArray, ownRecord } from "../../core/ownData.js";
import { STORED_RESOURCE_KINDS } from "../../core/resourceReference.js";

const handlers = new WeakMap();
export function registerDataResourceRevision(ProgramClass, handler) {
  if (typeof ProgramClass !== "function") throw new TypeError("Data resource revision requires a program constructor.");
  if (handlers.has(ProgramClass)) throw new Error("Data resource revision is already registered.");
  ownRecord(handler, "Data resource revision handler");
  ownArray(handler.kinds, "Data resource revision kinds");
  if (Object.keys(handler).some(key => !["kinds", "revise", "reviseSourceStages", "project"].includes(key)) || typeof handler.revise !== "function" ||
      (Object.hasOwn(handler, "project") && typeof handler.project !== "function") ||
      (Object.hasOwn(handler, "reviseSourceStages") && typeof handler.reviseSourceStages !== "function") || handler.kinds.length === 0 ||
      handler.kinds.some(kind => !STORED_RESOURCE_KINDS.includes(kind)) || new Set(handler.kinds).size !== handler.kinds.length) {
    throw new TypeError("Data resource revision requires unique stored kinds and one revise function.");
  }
  handlers.set(ProgramClass, Object.freeze({ kinds: Object.freeze([...handler.kinds]), revise: handler.revise,
    reviseSourceStages: handler.reviseSourceStages, project: handler.project }));
}
export function reviseDataResources(program, replacements) {
  return handlers.get(program.constructor)?.revise(program, replacements) ?? program;
}

// Projection has separate authority because a cell owns a derived logical ID.
export function projectDataResources(program, replacements) {
  const handler = handlers.get(program.constructor);
  return (handler?.project ?? handler?.revise)?.(program, replacements) ?? program;
}

// The staged source revision is the synchronous one with yields between rows.
export function* reviseSourceDataResourcesStages(program, replacements, marks) {
  const handler = handlers.get(program.constructor);
  if (handler?.reviseSourceStages !== undefined) return yield* handler.reviseSourceStages(program, replacements, marks);
  return marks.length === 0 ? program : yield* applyMaterializationPlanStages(program,
    planLayersDataRematerialization(program, orderConditionalMarkIds(program, marks)));
}

export function hasDataResourceRevision(program, kind) {
  return handlers.get(program.constructor)?.kinds.includes(kind) ?? false;
}
