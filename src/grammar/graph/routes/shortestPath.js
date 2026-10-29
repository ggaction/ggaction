function compareSequence(a, b, budget) {
  const length = Math.min(a.length, b.length);
  budget.charge(length + 1);
  for (let index = 0; index < length; index++) if (a[index] !== b[index]) return a[index] - b[index];
  return a.length - b.length;
}

// Edge ordinals already represent raw typed-key order. All buffers belong to one
// search; no graph topology or shared adjacency is written by this owner.
export function shortestRoutePath(adjacency, costs, skip, source, target, budget, heldSamples = 0) {
  const heap = [], best = new Map(), settled = new Set();
  let activeCells = 0;
  const compare = (a, b) => { budget.charge(1); return a.cost - b.cost || compareSequence(a.edges, b.edges, budget); };
  function push(state) {
    const cells = state.edges.length + state.nodes.length + 1;
    budget.samples(heldSamples + activeCells + cells); budget.charge(cells); activeCells += cells;
    let child = heap.length; heap.push(state);
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (compare(heap[parent], state) <= 0) break;
      heap[child] = heap[parent]; child = parent;
    }
    heap[child] = state;
  }
  function pop() {
    const first = heap[0], last = heap.pop();
    if (heap.length) {
      let parent = 0;
      while (parent * 2 + 1 < heap.length) {
        let child = parent * 2 + 1;
        if (child + 1 < heap.length && compare(heap[child + 1], heap[child]) < 0) child++;
        if (compare(last, heap[child]) <= 0) break;
        heap[parent] = heap[child]; parent = child;
      }
      heap[parent] = last;
    }
    return first;
  }
  const first = { node: source, cost: 0, edges: [], nodes: [source] };
  best.set(source, first); push(first);
  while (heap.length) {
    budget.check();
    const current = pop(), cells = current.edges.length + current.nodes.length + 1;
    if (best.get(current.node) !== current) { activeCells -= cells; continue; }
    best.delete(current.node); settled.add(current.node);
    if (current.node === target) return { edges: current.edges, nodes: current.nodes, cost: current.cost };
    for (const next of adjacency.get(current.node)) {
      budget.charge(1);
      if (skip[next.edge] || settled.has(next.target)) continue;
      const cost = current.cost + costs[next.edge];
      if (!Number.isFinite(cost)) throw new RangeError("Edge route path cost must be finite.");
      const previous = best.get(next.target);
      if (previous !== undefined && cost > previous.cost) continue;
      budget.charge(current.edges.length + current.nodes.length + 2);
      budget.samples(heldSamples + activeCells + current.edges.length + current.nodes.length + 3);
      const state = { node: next.target, cost, edges: [...current.edges, next.edge], nodes: [...current.nodes, next.target] };
      if (previous !== undefined && cost === previous.cost && compareSequence(state.edges, previous.edges, budget) >= 0) continue;
      best.set(next.target, state); push(state);
    }
    activeCells -= cells;
  }
  return undefined;
}
