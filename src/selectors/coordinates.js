import { annotateError } from "../core/diagnostics.js";

export function findCoordinate(program, id) {
  return program.semanticSpec.coordinates.find(coordinate => coordinate.id === id);
}

export function hasCoordinate(program, id) {
  return findCoordinate(program, id) !== undefined;
}

export function requireCoordinate(program, id) {
  const coordinate = findCoordinate(program, id);
  if (coordinate === undefined) throw annotateError(new Error(`Unknown coordinate "${id}".`), { code: "missing-resource", resourceId: id });
  return coordinate;
}

function resolveTypedCoordinate(program, requested, type, defaultId, label) {
  if (requested !== undefined) {
    const coordinate = requireCoordinate(program, requested);
    if (coordinate.type !== type) throw new TypeError(`${label} requires a ${type === "cartesian" ? "Cartesian" : "Polar"} coordinate.`);
    return coordinate;
  }
  const eligible = program.semanticSpec.coordinates.filter(coordinate => coordinate.type === type);
  const current = eligible.find(coordinate => coordinate.id === program.context.currentCoordinate);
  if (current) return current;
  if (eligible.length > 1) throw annotateError(new Error(`${label} coordinate is ambiguous; provide an explicit coordinate.`), { code: "ambiguous-resource" });
  if (eligible.length === 1) return eligible[0];
  if (program.semanticSpec.coordinates.some(coordinate => coordinate.id === defaultId)) throw new TypeError(`${label} default coordinate conflicts with an existing coordinate.`);
  return { id: defaultId, type };
}

export function resolveCartesianCoordinate(program, requested, label = "Mark") {
  return resolveTypedCoordinate(program, requested, "cartesian", "main", label);
}
export function resolvePolarCoordinate(program, requested, label = "Mark") {
  return resolveTypedCoordinate(program, requested, "polar", "polar", label);
}

export function resolveGeoCoordinate(program, requested) {
  if (requested !== undefined) {
    const coordinate = requireCoordinate(program, requested);
    if (coordinate.type !== "geo") throw new TypeError("Geographic marks require a Geo coordinate.");
    return coordinate;
  }
  const eligible = program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "geo");
  const current = eligible.find(coordinate => coordinate.id === program.context.currentCoordinate);
  if (current !== undefined) return current;
  if (eligible.length !== 1) throw annotateError(new Error("An explicit Geo coordinate is required unless one exists."), {
    code: eligible.length ? "ambiguous-resource" : "missing-resource", candidates: eligible.map(coordinate => coordinate.id)
  });
  return eligible[0];
}
