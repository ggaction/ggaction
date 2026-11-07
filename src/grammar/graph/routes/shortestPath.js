// Edge ordinals already represent raw typed-key order. Predecessors belong to
// one search; only successful paths and exact-cost comparisons allocate vectors.
// No graph topology or shared adjacency is written by this owner.
export function shortestRoutePath(adjacency, costs, skip, source, target, budget, heldSamples = 0) {
  const heap = [], best = new Map(), settled = new Set();
  // Each predecessor state is allocated once. Count every allocated state for
  // the whole search, conservatively including stale states and queue/map refs.
  let retainedCells = 0;
  function state(node, cost, previous, edge) {
    budget.samples(heldSamples + retainedCells + 8); budget.charge(5);
    retainedCells += 8;
    return { node, cost, previous, edge, depth: previous === null ? 0 : previous.depth + 1 };
  }
  function sequence(value) {
    const edges = new Array(value.depth);
    for (let index = edges.length - 1; index >= 0; index--) { edges[index] = value.edge; value = value.previous; }
    return edges;
  }
  function compareSequence(a, b) {
    const length = Math.min(a.depth, b.depth);
    budget.samples(heldSamples + retainedCells + a.depth + b.depth);
    budget.charge(a.depth + b.depth + length + 1);
    const left = sequence(a), right = sequence(b);
    for (let index = 0; index < length; index++) if (left[index] !== right[index]) return left[index] - right[index];
    return left.length - right.length;
  }
  function result(value) {
    budget.samples(heldSamples + retainedCells + value.depth * 2 + 1); budget.charge(value.depth * 2 + 1);
    const cost = value.cost, edges = new Array(value.depth), nodes = new Array(value.depth + 1);
    for (let index = edges.length - 1; index >= 0; index--) {
      edges[index] = value.edge; nodes[index + 1] = value.node; value = value.previous;
    }
    nodes[0] = value.node;
    return { edges, nodes, cost };
  }
  const compare = (a, b) => { budget.charge(1); return a.cost - b.cost || compareSequence(a, b); };
  function push(state) {
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
  const first = state(source, 0, null, undefined);
  best.set(source, first); push(first);
  while (heap.length) {
    budget.check();
    const current = pop();
    if (best.get(current.node) !== current) continue;
    best.delete(current.node); settled.add(current.node);
    if (current.node === target) return result(current);
    for (const next of adjacency.get(current.node)) {
      budget.charge(1);
      if (skip[next.edge] || settled.has(next.target)) continue;
      const cost = current.cost + costs[next.edge];
      if (!Number.isFinite(cost)) throw new RangeError("Edge route path cost must be finite.");
      const previous = best.get(next.target);
      if (previous !== undefined && cost > previous.cost) continue;
      const candidate = state(next.target, cost, current, next.edge);
      if (previous !== undefined && cost === previous.cost && compareSequence(candidate, previous) >= 0) continue;
      best.set(next.target, candidate); push(candidate);
    }
  }
  return undefined;
}
