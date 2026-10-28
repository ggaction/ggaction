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
  if (Object.keys(handler).length !== 2 || typeof handler.revise !== "function" || handler.kinds.length === 0 ||
      handler.kinds.some(kind => !STORED_RESOURCE_KINDS.includes(kind)) || new Set(handler.kinds).size !== handler.kinds.length) {
    throw new TypeError("Data resource revision requires unique stored kinds and one revise function.");
  }
  handlers.set(ProgramClass, Object.freeze({ kinds: Object.freeze([...handler.kinds]), revise: handler.revise }));
}
export function reviseDataResources(program, replacements) {
  return handlers.get(program.constructor)?.revise(program, replacements) ?? program;
}

export function hasDataResourceRevision(program, kind) {
  return handlers.get(program.constructor)?.kinds.includes(kind) ?? false;
}
