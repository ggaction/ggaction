import { validateItemMissing } from '../../grammar/itemMissing.js';

// Complete-case source ownership for composite statistical charts. Keep the
// original source in the facade config; every child consumes this same view.
// Native filters preserve schemas, dependencies, trace and rematerialization.
export function prepareFacadeMissingData(program, { id, source, fields, missing }) {
  const policy = validateItemMissing(missing ?? 'error', 'Chart missing');
  if (policy === 'error') return { program, data: source, ownedData: [] };
  let next = program, data = source;
  const ownedData = [];
  for (const [index, field] of [...new Set(fields.filter(Boolean))].entries()) {
    const target = `${id}CompleteCases${index + 1}`;
    next = next.filterData({ id: target, source: data, field, noneOf: [null], nulls: 'exclude' });
    data = target; ownedData.unshift(target);
  }
  return { program: next, data, ownedData };
}
