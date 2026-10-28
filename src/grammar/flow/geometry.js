const compareKey = (left, right) => left < right ? -1 : left > right ? 1 : 0;
function finite(value) {
  if (!Number.isFinite(value)) throw new RangeError("Flow geometry must remain finite.");
  return value;
}

// Shared attachment and lane policy consumes computed node rectangles.
// It performs no relaxation and does not choose node positions.
export function routeFlowEdges(model, indexed, positioned, topology, options) {
  const { nodes, scale, cross, primary } = positioned, { nodeIndexes, edgeIndexes, charge } = indexed;
  const edges = model.edges.map(edge => ({ key: edge.key, sourceKey: edge.sourceKey, targetKey: edge.targetKey,
    value: edge.weight, thickness: finite(edge.weight * scale), source: null, target: null,
    route: edge.sourceKey === edge.targetKey ? "loop" : topology.membership[nodeIndexes.get(edge.sourceKey)] === topology.membership[nodeIndexes.get(edge.targetKey)] ? "feedback" : "forward", lane: null }));
  for (let index = 0; index < nodes.length; index++) for (const source of [true, false]) {
    const node = nodes[index], edgeList = [...model.adjacency[index][source ? "outgoing" : "incoming"]];
    edgeList.sort((a, b) => {
      charge(3);
      const ea = edges[edgeIndexes.get(a)], eb = edges[edgeIndexes.get(b)];
      const na = nodes[nodeIndexes.get(source ? ea.targetKey : ea.sourceKey)], nb = nodes[nodeIndexes.get(source ? eb.targetKey : eb.sourceKey)];
      return (na.y + na.height / 2) - (nb.y + nb.height / 2) || compareKey(a, b);
    });
    let cursor = node.y;
    for (const key of edgeList) {
      charge(3);
      const edge = edges[edgeIndexes.get(key)];
      edge[source ? "source" : "target"] = { x: source ? node.x + node.width : node.x, y: cursor + edge.thickness / 2 };
      cursor += edge.thickness;
    }
  }
  const lanes = edges.filter(edge => edge.route !== "forward");
  lanes.sort((a, b) => { charge(1); return compareKey(a.key, b.key); });
  const reserved = [0, 0], counts = [0, 0], bounds = { left: 0, top: 0, right: primary, bottom: cross };
  lanes.forEach((edge, index) => {
    charge(12);
    const side = index % 2, half = edge.thickness / 2;
    const offset = finite(reserved[side] + options.laneGap + half);
    const center = side === 0 ? -offset : finite(cross + offset);
    const sourceX = finite(edge.source.x + offset), targetX = finite(edge.target.x - offset);
    edge.lane = { side: side === 0 ? "top" : "bottom", index: counts[side]++, center, sourceX, targetX };
    reserved[side] = finite(offset + half);
    bounds.left = Math.min(bounds.left, finite(targetX - half)); bounds.right = Math.max(bounds.right, finite(sourceX + half));
    bounds.top = Math.min(bounds.top, finite(center - half)); bounds.bottom = Math.max(bounds.bottom, finite(center + half));
  });
  return { edges, bounds };
}

