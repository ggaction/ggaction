import { ownRecord } from "../core/ownData.js";
import { BUILTIN_RESOURCE_KINDS } from "../core/resourceReference.js";

const handlersByClass = new WeakMap();

// Full assembly supplies trusted, validation-only owners once. This private
// table never falls back to a superclass or changes during validation.
export function registerBuiltinResourceKinds(ProgramClass, handlers) {
  if (typeof ProgramClass !== "function" || ProgramClass.prototype === undefined) {
    throw new TypeError("Builtin resources require a program constructor.");
  }
  if (handlersByClass.has(ProgramClass)) throw new Error("Builtin resource kinds are already registered for this constructor.");
  ownRecord(handlers, "Builtin resource handlers");
  const copied = Object.create(null);
  for (const [kind, handler] of Object.entries(handlers)) {
    if (!BUILTIN_RESOURCE_KINDS.includes(kind)) throw new TypeError("Unknown builtin resource kind.");
    ownRecord(handler, "Builtin resource handler");
    if (Object.keys(handler).length !== 2 || !Object.hasOwn(handler, "validateStored") || !Object.hasOwn(handler, "validateBindings") ||
        typeof handler.validateStored !== "function" || typeof handler.validateBindings !== "function") {
      throw new TypeError("Builtin resource handler requires validateStored and validateBindings.");
    }
    copied[kind] = Object.freeze({ validateStored: handler.validateStored, validateBindings: handler.validateBindings });
  }
  handlersByClass.set(ProgramClass, Object.freeze(copied));
}

export function getBuiltinResourceKindHandler(ProgramClass, kind) {
  return handlersByClass.get(ProgramClass)?.[kind];
}
