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

export function resolveCartesianCoordinate(program, requested, label = "Mark") {
  if (requested !== undefined) {
    const coordinate = requireCoordinate(program, requested);
    if (coordinate.type !== "cartesian") throw new TypeError(`${label} requires a Cartesian coordinate.`);
    return coordinate;
  }
  const eligible = program.semanticSpec.coordinates.filter(coordinate => coordinate.type === "cartesian");
  const current = eligible.find(coordinate => coordinate.id === program.context.currentCoordinate);
  if (current) return current;
  if (eligible.length > 1) throw annotateError(new Error(`${label} coordinate is ambiguous; provide an explicit coordinate.`), { code: "ambiguous-resource" });
  if (eligible.length === 1) return eligible[0];
  if (program.semanticSpec.coordinates.some(coordinate => coordinate.id === "main")) throw new TypeError(`${label} default coordinate conflicts with an existing coordinate.`);
  return { id: "main", type: "cartesian" };
}
