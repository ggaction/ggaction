// Exhaustive simple-path enumeration for small positive-cost graphs. This uses
// no priority queue, predecessor optimization, or production imports.
export function enumerateShortestPath(edges, costs, source, target, skipped = []) {
  const paths = [];
  function visit(node, nodes, path, cost) {
    if (node === target) { paths.push({ edges: path, nodes, cost }); return; }
    edges.forEach(([from, to], index) => {
      if (from === node && !skipped[index] && !nodes.includes(to)) visit(to, [...nodes, to], [...path, index], cost + costs[index]);
    });
  }
  visit(source, [source], [], 0);
  return paths.sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    for (let index = 0; index < Math.min(a.edges.length, b.edges.length); index++) if (a.edges[index] !== b.edges[index]) return a.edges[index] - b.edges[index];
    return a.edges.length - b.edges.length;
  })[0];
}
