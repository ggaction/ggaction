import { findDataset } from "../../selectors/datasets.js";
import { deriveBin2DRows } from "../../grammar/bin2d.js";
import { deriveBoxData } from "../../grammar/boxPlot.js";
import { deriveFilteredRows } from '../../grammar/filter.js';
import { deriveSortedRows } from '../../grammar/sort.js';

const cache = new WeakMap();

// Provenance is an inspection cache, never an injected data column. Identical
// observations retain distinct indices. Only explicit transform semantics are
// used to traverse a derived dataset; unknown lineage is not guessed by value.
function indexRows(program) {
  if (cache.has(program.semanticSpec.datasets)) return cache.get(program.semanticSpec.datasets);
  const datasets = new Map(program.semanticSpec.datasets.filter(d => Array.isArray(d.values)).map(d => [d.id, d]));
  const references = new Map(), building = new Set();
  function visit(id) {
    if (references.has(id)) return references.get(id);
    if (building.has(id)) throw new Error('Cyclic dataset lineage.');
    building.add(id);
    const d = datasets.get(id);
    if (!d) throw new Error(`Unknown row dataset "${id}".`);
    const result = d.values.map((_, index) => [{ data: id, index }]);
    references.set(id, result);
    if (d.source && datasets.has(d.source)) {
      const source = datasets.get(d.source), parents = visit(d.source), t = d.transform?.length === 1 ? d.transform[0] : null;
      let mapping;
      if (t && ['filter', 'sort'].includes(t.type)) {
        const derived = (t.type === 'filter' ? deriveFilteredRows : deriveSortedRows)(source.values, t);
        const positions = new Map(source.values.map((row, i) => [row, i]));
        mapping = derived.map(row => [positions.get(row)]);
      } else if (t && ['computed', 'timeUnit', 'lookup', 'window', 'normalize'].includes(t.type) && d.values.length === source.values.length) {
        mapping = d.values.map((_, i) => [i]);
      } else if (t?.type === 'fold') {
        mapping = d.values.map((_, i) => [Math.floor(i / t.fields.length)]);
      } else if (t?.type === 'bin2d') {
        const memberField = '__selection_members';
        mapping = deriveBin2DRows(source.values, { ...t, members: true, as: { ...t.as, members: memberField } }).values.map(row => row[memberField]);
      } else if (t?.type === 'boxOutlier') {
        const summaries = deriveBoxData(source.values, { ...t, type: 'boxSummary' }).summaries;
        const groups = new Map(summaries.map(row => [row[t.category], row]));
        mapping = source.values.flatMap((row,i) => { const group = groups.get(row[t.category]); return group && (row[t.field] < group[t.as.lowerWhisker] || row[t.field] > group[t.as.upperWhisker]) ? [[i]] : []; });
      } else if (t && ['ecdf', 'horizon', 'boxSummary', 'summary', 'interval', 'density', 'gradientProfile', 'regression', 'regressionStatistics'].includes(t.type)) {
        const fields = [...new Set([...(Array.isArray(t.groupBy) ? t.groupBy : t.groupBy ? [t.groupBy] : []), ...(t.category ? [t.category] : [])])];
        const groups = new Map();
        source.values.forEach((row, i) => { const key = JSON.stringify(fields.map(f => row[f])); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); });
        mapping = d.values.map(row => groups.get(JSON.stringify(fields.map(f => row[f]))) ?? []);
      }
      if (mapping?.length === result.length) mapping.forEach((indices, i) => {
        for (const index of indices) if (Number.isInteger(index)) result[i].push(...parents[index]);
      });
    }
    building.delete(id);
    return result;
  }
  const byRow = new Map();
  for (const d of datasets.values()) {
    const refs = visit(d.id);
    d.values.forEach((row, i) => byRow.set(row, [...(byRow.get(row) ?? []), ...refs[i]]));
  }
  cache.set(program.semanticSpec.datasets, byRow);
  return byRow;
}

export function memberRowReferences(program, members) {
  const index = indexRows(program), refs = new Map();
  for (const row of members) for (const ref of index.get(row) ?? []) refs.set(`${ref.data}:${ref.index}`, ref);
  return [...refs.values()];
}

export function validateRowSelection(program, rows, items) {
  const dataset = findDataset(program, rows.data);
  if (!dataset) throw new Error(`Unknown row dataset "${rows.data}".`);
  if (rows.indices.some(index => index >= dataset.values.length)) throw new RangeError('Selected row index exceeds the dataset length.');
  if (items.length && !items.some(item => item.rows.some(ref => ref.data === rows.data))) {
    throw new Error(`Row lineage from "${rows.data}" is unavailable for this mark; select its materialized dataset instead.`);
  }
}

export function rowsForSelectedItems(program, items, keys, preferredData) {
  const available = new Set(items.flatMap(item => item.rows.map(ref => ref.data)));
  const data = available.has(preferredData) ? preferredData
    : program.semanticSpec.datasets.filter(dataset => available.has(dataset.id))[0]?.id ?? preferredData;
  const selected = new Set(keys);
  const indices = [...new Set(items.filter(item => selected.has(item.key)).flatMap(item => item.rows)
    .filter(ref => ref.data === data).map(ref => ref.index))];
  return { data, indices };
}
