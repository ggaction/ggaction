import { datasetInputIds } from "../core/datasetReferences.js";
import { validateWorkLimit } from "../core/validation.js";
export { datasetInputReferences, datasetInputIds, rebindTransformDatasetInputs } from "../core/datasetReferences.js";

// Iterative union traversal keeps a deep or shared multi-root dependency graph
// independent from the host call stack. Its passes are linear in vertices/edges.
export function orderedDatasetClosure(datasets, roots, { skip = () => false } = {}) {
  let work = 0;
  const charge = () => validateWorkLimit(++work, "Dataset dependency work");
  const byId = new Map(), children = new Map(), indegree = new Map();
  for (const dataset of datasets) {
    charge();
    if (byId.has(dataset.id)) throw new Error("Dataset dependency graph contains duplicate ids.");
    byId.set(dataset.id, dataset);
  }
  for (const dataset of datasets) {
    const inputs = datasetInputIds(dataset);
    indegree.set(dataset.id, inputs.length);
    for (const input of inputs) {
      charge();
      if (!byId.has(input)) throw new Error(`Dataset "${dataset.id}" references missing input "${input}".`);
      if (!children.has(input)) children.set(input, []);
      children.get(input).push(dataset.id);
    }
  }
  const affected = new Set(), pending = [];
  for (const root of roots) {
    charge();
    if (!byId.has(root)) throw new Error(`Dataset dependency graph has no root "${root}".`);
    if (!affected.has(root)) { affected.add(root); pending.push(root); }
  }
  for (let index = 0; index < pending.length; index += 1) {
    for (const child of children.get(pending[index]) ?? []) {
      charge();
      if (affected.has(child) || skip(byId.get(child))) continue;
      affected.add(child); pending.push(child);
    }
  }
  const ready = datasets.filter(dataset => indegree.get(dataset.id) === 0).map(dataset => dataset.id);
  const result = [];
  for (let index = 0; index < ready.length; index += 1) {
    const id = ready[index]; charge();
    if (affected.has(id)) result.push(byId.get(id));
    for (const child of children.get(id) ?? []) {
      charge();
      const count = indegree.get(child) - 1;
      indegree.set(child, count);
      if (count === 0) ready.push(child);
    }
  }
  if (ready.length !== datasets.length) throw new Error("Dataset dependency graph contains a cycle.");
  return result;
}

export function orderedDatasetAncestors(datasets, root) {
  const byId = new Map(datasets.map(dataset => [dataset.id, dataset]));
  const visiting = new Set(), visited = new Set(), result = [];
  if (byId.size !== datasets.length) throw new Error("Dataset dependency graph contains duplicate ids.");
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Dataset dependency graph contains a cycle at "${id}".`);
    if (visited.has(id)) return;
    const dataset = byId.get(id);
    if (dataset === undefined) throw new Error(`Dataset dependency graph references missing input "${id}".`);
    visiting.add(id);
    for (const input of datasetInputIds(dataset)) visit(input);
    visiting.delete(id);
    visited.add(id);
    result.push(dataset);
  }
  visit(root);
  return result;
}

// A stable topological extension of the historical primary-tree DFS order.
// A binary input waits for both changed parents; an ordinary tree keeps its old order.
export function orderedDatasetDependents(datasets, root, { skip = () => false } = {}) {
  const byId = new Map(datasets.map(dataset => [dataset.id, dataset]));
  if (byId.size !== datasets.length) throw new Error("Dataset dependency graph contains duplicate ids.");
  if (!byId.has(root)) throw new Error(`Dataset dependency graph has no root "${root}".`);
  const children = new Map();
  for (const dataset of datasets) {
    for (const input of datasetInputIds(dataset)) {
      if (!byId.has(input)) throw new Error(`Dataset "${dataset.id}" references missing input "${input}".`);
      const values = children.get(input) ?? [];
      values.push(dataset);
      children.set(input, values);
    }
  }
  const rank = new Map(), visiting = new Set(), visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Dataset dependency graph contains a cycle at "${id}".`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dataset of children.get(id) ?? []) {
      if (skip(dataset)) continue;
      if (!rank.has(dataset.id)) rank.set(dataset.id, rank.size);
      visit(dataset.id);
    }
    visiting.delete(id);
    visited.add(id);
  }
  visit(root);
  const remaining = new Map([...rank].map(([id]) => [id,
    datasetInputIds(byId.get(id)).filter(parent => rank.has(parent)).length]));
  const ready = [];
  const less = (a, b) => rank.get(a) < rank.get(b);
  function push(id) {
    ready.push(id);
    let index = ready.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!less(ready[index], ready[parent])) break;
      [ready[index], ready[parent]] = [ready[parent], ready[index]];
      index = parent;
    }
  }
  function pop() {
    const first = ready[0], last = ready.pop();
    if (ready.length) {
      ready[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1, right = left + 1;
        let next = index;
        if (left < ready.length && less(ready[left], ready[next])) next = left;
        if (right < ready.length && less(ready[right], ready[next])) next = right;
        if (next === index) break;
        [ready[index], ready[next]] = [ready[next], ready[index]];
        index = next;
      }
    }
    return first;
  }
  for (const [id, count] of remaining) if (count === 0) push(id);
  const result = [];
  while (ready.length) {
    const id = pop();
    result.push(byId.get(id));
    for (const child of children.get(id) ?? []) {
      if (!remaining.has(child.id)) continue;
      const count = remaining.get(child.id) - 1;
      remaining.set(child.id, count);
      if (count === 0) push(child.id);
    }
  }
  if (result.length !== rank.size) throw new Error("Dataset dependency graph contains a cycle.");
  return result;
}
