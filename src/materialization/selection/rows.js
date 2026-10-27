import { validateWorkLimit } from "../../core/validation.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateRowSelectionDataset } from "../../grammar/markSelection.js";
import { findDataset } from "../../selectors/datasets.js";

const cache = new WeakMap();

function indexRows(program) {
  const cached = cache.get(program.semanticSpec.datasets);
  if (cached) return cached;
  const datasets = new Map(program.semanticSpec.datasets.filter(dataset => Array.isArray(dataset.values)).map(dataset => [dataset.id, dataset]));
  const indices = new Map([...datasets.values()].map(dataset => [dataset.id, new Map(dataset.rowKeys.map((key, index) => [key, index]))]));
  const references = new Map();
  let work = 0;
  function visit(id, index) {
    const root = JSON.stringify([id, index]);
    if (references.has(root)) return references.get(root);
    const active = new Set(), stack = [{ id, index, done: false }];
    while (stack.length) {
      const frame = stack.pop(), identity = JSON.stringify([frame.id, frame.index]);
      if (references.has(identity)) continue;
      validateWorkLimit(++work, "Expanded row lineage work");
      const dataset = datasets.get(frame.id);
      const inputs = (dataset.lineage?.entries[dataset.lineage.rowRefs[frame.index]] ?? []).map(input => {
        const position = indices.get(input.data)?.get(input.rowKey);
        if (position === undefined) throw new Error("Missing input row identity.");
        return { input, position, key: JSON.stringify([input.data, position]) };
      });
      if (!frame.done) {
        if (active.has(identity)) throw annotateError(new Error("Cyclic dataset lineage."), { code: "cyclic-dependency" });
        active.add(identity); stack.push({ ...frame, done: true });
        for (const { input, position } of inputs) stack.push({ id: input.data, index: position, done: false });
        continue;
      }
      const refs = new Map();
      const add = ref => { validateWorkLimit(++work, "Expanded row lineage work"); refs.set(JSON.stringify([ref.data, ref.index, ref.role]), ref); };
      add({ data: frame.id, index: frame.index, logicalDataId: dataset.logicalId,
        revision: dataset.revision, rowKey: dataset.rowKeys[frame.index], role: "source" });
      for (const { input, key } of inputs) for (const ref of references.get(key)) {
        add(input.role === "source" ? ref : { ...ref, role: input.role });
      }
      active.delete(identity); references.set(identity, [...refs.values()]);
    }
    return references.get(root);
  }
  const byRow = new Map([...datasets.values()].map(dataset => {
    const rows = new Map();
    dataset.values.forEach((row, index) => rows.set(row, [...(rows.get(row) ?? []), index]));
    return [dataset.id, rows];
  }));
  const result = { byRow, indices, visit };
  cache.set(program.semanticSpec.datasets, result);
  return result;
}

// Record identity while the retained rows still share their source objects.
// Persisting these positions avoids guessing between equal-valued rows on restore.
export function markFilterSourceIndices(sourceRows, rows) {
  const positions = new Map(), consumed = new Map();
  sourceRows.forEach((row, index) => positions.set(row, [...(positions.get(row) ?? []), index]));
  return rows.map(row => {
    const count = consumed.get(row) ?? 0;
    const index = positions.get(row)?.[count];
    if (index === undefined) throw new Error('Filtered row has no source identity.');
    consumed.set(row, count + 1);
    return index;
  });
}

export function memberRowReferences(program, members, data, rowKeys) {
  const { byRow, indices, visit } = indexRows(program);
  const refs = new Map();
  const add = (id, index) => {
    if (index === undefined) throw new Error("Missing materialized row identity.");
    for (const ref of visit(id, index)) refs.set(JSON.stringify([ref.data, ref.index, ref.role]), ref);
  };
  if (rowKeys !== undefined) {
    for (const key of rowKeys) add(data, indices.get(data)?.get(key));
  } else for (const [id, index] of byRow) {
    if (data !== undefined && data !== id) continue;
    for (const row of members) for (const position of index.get(row) ?? []) add(id, position);
  }
  const order = new Map(program.semanticSpec.datasets.map((dataset, index) => [dataset.id, index]));
  return [...refs.values()].sort((a, b) => order.get(a.data) - order.get(b.data) || a.index - b.index || (a.role < b.role ? -1 : a.role > b.role ? 1 : 0));
}

export function validateRowSelection(program, rows, items) {
  const dataset = findDataset(program, rows.data);
  validateRowSelectionDataset(rows, dataset);
  if (items.length && !items.some(item => item.rows.some(ref => ref.data === rows.data))) {
    throw new Error(`Row lineage from "${rows.data}" is unavailable for this mark; select its materialized dataset instead.`);
  }
}

export function rowsForSelectedItems(program, items, keys, preferredData) {
  const available = new Set(items.flatMap(item => item.rows.map(ref => ref.data)));
  const data = available.has(preferredData) ? preferredData
    : available.size === 0 ? preferredData : available.size === 1 ? [...available][0]
      : (() => { throw new Error("Selected row projection requires an explicit common dataset."); })();
  const selected = new Set(keys);
  const indices = [...new Set(items.filter(item => selected.has(item.key)).flatMap(item => item.rows)
    .filter(ref => ref.data === data).map(ref => ref.index))];
  return { data, indices };
}
