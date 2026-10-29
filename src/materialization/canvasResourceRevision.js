import { ownRecord } from "../core/ownData.js";

// Full-only resource computation stays outside the shared Canvas/Basic import
// graph. Like data revision, assembly registers one exact constructor owner.
const handlers = new WeakMap();
export function registerCanvasResourceRevision(ProgramClass, handler) {
  ownRecord(handler, "Canvas resource revision handler");
  if (typeof ProgramClass !== "function" || handlers.has(ProgramClass) || Object.keys(handler).length !== 2 ||
      typeof handler.prepare !== "function" || typeof handler.apply !== "function") throw new TypeError("Canvas resource revision requires one exact constructor and prepare/apply owner.");
  handlers.set(ProgramClass, Object.freeze({ prepare: handler.prepare, apply: handler.apply }));
}
export function prepareCanvasResourceRevision(program) { return handlers.get(program.constructor)?.prepare(program); }
export function applyCanvasResourceRevision(program, plan) {
  return plan === undefined ? program : handlers.get(program.constructor).apply(program, plan);
}
