// Independent Prim traversal: used only for minimum cost and component count.
export function spanningCost(nodeCount, edges) {
  const visited = new Set();
  let cost = 0, components = 0;
  for (let start = 0; start < nodeCount; start++) {
    if (visited.has(start)) continue;
    components++;
    visited.add(start);
    while (true) {
      let best;
      for (const [a, b, weight] of edges) {
        if (visited.has(a) === visited.has(b)) continue;
        if (!best || weight < best[2]) best = [a, b, weight];
      }
      if (!best) break;
      visited.add(best[0]); visited.add(best[1]); cost += best[2];
    }
  }
  return { cost, components };
}
