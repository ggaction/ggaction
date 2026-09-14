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
