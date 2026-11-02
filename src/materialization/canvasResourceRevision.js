import { ownRecord } from "../core/ownData.js";

// Full-only resource computation stays outside the shared Canvas/Basic import
// graph. Like data revision, assembly registers one exact constructor owner.
const handlers = new WeakMap();
export function registerCanvasResourceRevision(ProgramClass, handler) {
  ownRecord(handler, "Canvas resource revision handler");
  if (typeof ProgramClass !== "function" || handlers.has(ProgramClass) || Object.keys(handler).length !== 3 ||
      typeof handler.prepare !== "function" || typeof handler.apply !== "function" || typeof handler.prepareStages !== "function") throw new TypeError("Canvas resource revision requires one exact constructor and prepare/apply/stages owner.");
  handlers.set(ProgramClass, Object.freeze({ prepare: handler.prepare, apply: handler.apply, prepareStages: handler.prepareStages }));
}
export function prepareCanvasResourceRevision(program) { return handlers.get(program.constructor)?.prepare(program); }
export function applyCanvasResourceRevision(program, plan) {
  return plan === undefined ? program : handlers.get(program.constructor).apply(program, plan);
}

export function* prepareCanvasResourceRevisionStages(program, scope) {
  const handler = handlers.get(program.constructor);
  if (handler !== undefined) {
    if (scope === undefined) return handler.prepare(program);
    return yield* handler.prepareStages(program, scope);
  }
}

// Native Canvas owners share synchronous consumption; this has no host timers
// and does not change action() or introduce an asynchronous authoring contract.
export function finishCanvasStages(iterator) {
  try {
    let next;
    do { next = iterator.next(); } while (!next.done);
    return next.value;
  } finally { iterator.return(); }
}
