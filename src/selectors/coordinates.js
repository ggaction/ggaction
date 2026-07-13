export function findCoordinate(program, id) {
  return program.semanticSpec.coordinates.find(coordinate => coordinate.id === id);
}

export function requireCoordinate(program, id) {
  const coordinate = findCoordinate(program, id);
  if (coordinate === undefined) throw new Error(`Unknown coordinate "${id}".`);
  return coordinate;
}
