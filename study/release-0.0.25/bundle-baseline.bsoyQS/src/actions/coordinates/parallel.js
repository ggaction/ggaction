import { validateUserId } from "../../core/identifiers.js";
import { findCoordinate } from "../../selectors/coordinates.js";

export function resolveParallelCoordinate(program, {
  requested,
  layer,
  operation,
  useCurrent = false
}) {
  const explicit = requested === undefined
    ? undefined
    : validateUserId(requested, "Parallel coordinate id");
  if (layer?.coordinate !== undefined) {
    if (explicit !== undefined && explicit !== layer.coordinate) {
      throw new Error(
        `Layer "${layer.id}" already uses coordinate "${layer.coordinate}".`
      );
    }
    const coordinate = findCoordinate(program, layer.coordinate);
    if (coordinate?.type !== "parallel") {
      throw new Error(`Coordinate "${layer.coordinate}" is not Parallel.`);
    }
    return { id: layer.coordinate, create: false };
  }
  if (explicit !== undefined) {
    const coordinate = findCoordinate(program, explicit);
    if (coordinate !== undefined && coordinate.type !== "parallel") {
      throw new Error(`Coordinate "${explicit}" is not Parallel.`);
    }
    return { id: explicit, create: coordinate === undefined };
  }
  const current = useCurrent ? program.context.currentCoordinate : undefined;
  if (current !== undefined && findCoordinate(program, current)?.type === "parallel") {
    return { id: current, create: false };
  }
  const compatible = program.semanticSpec.coordinates.filter(
    coordinate => coordinate.type === "parallel"
  );
  if (compatible.length > 1) {
    throw new Error(
      `${operation} requires coordinate when multiple Parallel coordinates are available.`
    );
  }
  if (compatible.length === 1) return { id: compatible[0].id, create: false };
  const conflict = findCoordinate(program, "parallel");
  if (conflict !== undefined) {
    throw new Error('Coordinate "parallel" already exists with a different type.');
  }
  return { id: "parallel", create: true };
}
