// Independent Manhattan-lattice oracle. No product metric, identity or search
// implementation is imported. Completing a distance shell proves that every
// unvisited lattice point is strictly farther away than the selected neighbors.
export function expectedGridNeighbors(rows, k = 10) {
  const count = rows.length, side = Math.ceil(Math.sqrt(count));
  if (!Number.isSafeInteger(k) || k < 1 || k >= count) throw new Error('Grid oracle requires 0 < k < node count.');
  const sourceIndexes = new Map();
  rows.forEach((row, index) => {
    if (!Number.isSafeInteger(row.id) || row.id < 0 || row.id >= count || sourceIndexes.has(row.id) ||
      row.x !== row.id % side || row.y !== Math.floor(row.id / side)) throw new Error('Grid oracle requires every original integer lattice point.');
    sourceIndexes.set(row.id, index);
  });
  const edges = [];
  for (let id = 0; id < count; id++) {
    const x = id % side, y = Math.floor(id / side), candidates = [];
    for (let radius = 1; candidates.length < k; radius++) {
      if (radius > 2 * side) throw new Error('Grid oracle failed to complete its bounded shells.');
      for (let dx = -radius; dx <= radius; dx++) {
        const dy = radius - Math.abs(dx);
        for (const offsetY of dy === 0 ? [0] : [-dy, dy]) {
          const targetX = x + dx, targetY = y + offsetY, target = targetY * side + targetX;
          if (targetX >= 0 && targetX < side && targetY >= 0 && targetY < side && target < count) candidates.push({ target, weight: radius });
        }
      }
    }
    candidates.sort((a, b) => a.weight - b.weight || a.target - b.target);
    for (const { target, weight } of candidates.slice(0, k).sort((a, b) => a.target - b.target)) {
      edges.push({ sourceIndex: sourceIndexes.get(id), targetIndex: sourceIndexes.get(target), weight });
    }
  }
  return edges;
}
