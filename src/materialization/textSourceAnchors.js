import { isGeoLabelSource } from "../grammar/geo/mark.js";

const geoResolvers = new WeakMap();

// The Full assembly supplies geographic math; Basic keeps native Text without
// importing projection algorithms. This private function is never persisted.
export function registerGeoLabelAnchorResolver(ProgramClass, resolver) {
  if (typeof ProgramClass !== "function" || ProgramClass.prototype === undefined || typeof resolver !== "function") throw new TypeError("Geographic labels require a program constructor and anchor resolver.");
  if (geoResolvers.has(ProgramClass)) throw new Error("Geographic label anchors are already registered.");
  geoResolvers.set(ProgramClass, resolver);
}

export function resolveSourceTextAnchors(program, source, items) {
  if (!isGeoLabelSource(source)) return undefined;
  const resolver = geoResolvers.get(program.constructor);
  if (resolver === undefined) throw new Error("Geographic label anchors are unavailable for this program constructor.");
  return resolver(program, source, items);
}
