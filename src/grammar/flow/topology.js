// Iterative Kosaraju traversal avoids a call-stack limit for a long flow chain.
// The caller has already validated keys and supplies the shared work counter.
export function flowTopology(model, indexed, method, align) {
  const { nodeIndexes, charge } = indexed, count = model.nodes.length;
  const outgoing = Array.from({ length: count }, () => []), incoming = Array.from({ length: count }, () => []);
  for (const edge of model.edges) {
    charge(4);
    const source = nodeIndexes.get(edge.sourceKey), target = nodeIndexes.get(edge.targetKey);
    outgoing[source].push(target); incoming[target].push(source);
  }
  const seen = new Set(), finished = [];
  for (let start = 0; start < count; start++) {
    if (seen.has(start)) continue;
    seen.add(start);
    const stack = [{ node: start, cursor: 0 }];
    while (stack.length) {
      charge(2);
      const entry = stack[stack.length - 1], next = outgoing[entry.node][entry.cursor++];
      if (next === undefined) { finished.push(entry.node); stack.pop(); }
      else if (!seen.has(next)) { seen.add(next); stack.push({ node: next, cursor: 0 }); }
    }
  }
  seen.clear();
  const members = [];
  for (let cursor = finished.length - 1; cursor >= 0; cursor--) {
    const start = finished[cursor];
    if (seen.has(start)) continue;
    const pending = [start], component = []; seen.add(start);
    for (let i = 0; i < pending.length; i++) {
      const node = pending[i]; component.push(node); charge(2);
      for (const next of incoming[node]) {
        charge(1);
        if (!seen.has(next)) { seen.add(next); pending.push(next); }
      }
    }
    component.sort((a, b) => { charge(1); return a - b; }); members.push(component);
  }
  members.sort((a, b) => { charge(1); return a[0] - b[0]; });
  const membership = new Array(count), components = members.map((indices, id) => {
    indices.forEach(index => { membership[index] = id; });
    return { indices, incoming: new Set(), outgoing: new Set(), rank: 0, reverseRank: 0 };
  });
  for (const edge of model.edges) {
    charge(4);
    const source = nodeIndexes.get(edge.sourceKey), target = nodeIndexes.get(edge.targetKey);
    const from = membership[source], to = membership[target];
    if (from === to) {
      if (method === "dag") throw new Error("DAG flow layout cannot contain a cycle or self-loop.");
    } else { components[from].outgoing.add(to); components[to].incoming.add(from); }
  }
  const indegrees = components.map(component => component.incoming.size), queue = [];
  components.forEach((_, index) => { if (indegrees[index] === 0) queue.push(index); });
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const component = components[queue[cursor]];
    for (const next of component.outgoing) {
      charge(3);
      components[next].rank = Math.max(components[next].rank, component.rank + 1);
      if (--indegrees[next] === 0) queue.push(next);
    }
  }
  let maximum = 0;
  for (let cursor = queue.length - 1; cursor >= 0; cursor--) {
    const component = components[queue[cursor]]; maximum = Math.max(maximum, component.rank);
    for (const next of component.outgoing) { charge(2); component.reverseRank = Math.max(component.reverseRank, components[next].reverseRank + 1); }
  }
  const ranks = components.map(component => {
    if (align === "right") return maximum - component.reverseRank;
    if (align === "justify" || align === "center") {
      if (!component.outgoing.size) return maximum;
      if (align === "center" && !component.incoming.size) {
        let first = maximum;
        for (const next of component.outgoing) first = Math.min(first, components[next].rank);
        return first - 1;
      }
    }
    return component.rank;
  });
  return { components: components.map((component, index) => ({ keys: component.indices.map(node => model.nodes[node].key), rank: ranks[index] })),
    membership, ranks: model.nodes.map((_, index) => ranks[membership[index]]), maximum };
}
