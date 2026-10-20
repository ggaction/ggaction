import { findDataset, hasDataset } from "../../selectors/datasets.js";
import { findRaincloudParent } from "../../selectors/raincloud.js";
import { normalizeMarkSelector, selectMarkItemKeys } from "../../grammar/markSelection.js";
import { deriveMarkFilteredRows, normalizeMarkFilterTransform } from "../../grammar/markFilter.js";

export function deriveRaincloudFilteredRows(values, selectors) {
  let rows = values;
  for (const selector of selectors) {
    if (selector.field === undefined || selector.grain !== "item") {
      throw new Error("Raincloud parent filters require an item-grain observation field selector; use a child target for rendered channels or properties.");
    }
    const items = rows.map((row, index) => ({ key: String(index), fields: row,
      channels: {}, properties: {}, members: [row] }));
    rows = deriveMarkFilteredRows(rows, items, selectMarkItemKeys(items, selector));
  }
  return rows;
}

export function materializeRaincloudFilter(program, { id, source, transform }, owner) {
  const values = deriveRaincloudFilteredRows(source.values, transform.selectors);
  let next = program.editSemantic({ property: `dataset[${id}].values`, value: values });
  next = next.editRaincloudPlot({ target: owner.id, data: id });
  const revised = findRaincloudParent(next, owner.id);
  return next._withMarkConfig(revised.ownerId, {
    ...next.markConfigs[revised.ownerId], raincloudPlot: { ...revised,
      sourceFilter: { dataset: id, source: source.id, selectors: transform.selectors } }
  });
}

export function filterRaincloud(program, args, owner, selectorOptions) {
  const selector = normalizeMarkSelector(selectorOptions);
  const previous = owner.sourceFilter;
  if (previous !== undefined && JSON.stringify(previous.selectors.at(-1)) === JSON.stringify(selector)) return program;
  if (previous !== undefined && args.mode === undefined) {
    throw new Error('Repeated filterMarks requires mode "replace" or "compose".');
  }
  const selectors = previous === undefined || args.mode === "replace"
    ? [selector] : [...previous.selectors, selector];
  const source = previous?.source ?? owner.source;
  // Validate against observations before changing any owner or resource.
  deriveRaincloudFilteredRows(findDataset(program, source).values, selectors);
  const base = `${owner.id}FilteredData`;
  let id = base;
  for (let revision = 2; hasDataset(program, id); revision += 1) id = `${base}${revision}`;
  let next = program.createDerivedData({ id, source,
    transform: [normalizeMarkFilterTransform(owner.id, selectors)] })
    .materializeMarkFilteredData({ id });
  if (previous !== undefined) next = next.releaseDerivedData({ id: previous.dataset });
  return next;
}

export function removeRaincloudFilter(program, owner) {
  if (owner.sourceFilter === undefined) throw new Error(`Raincloud plot "${owner.id}" has no active mark filter.`);
  return program.editRaincloudPlot({ target: owner.id, data: owner.sourceFilter.source })
    .releaseDerivedData({ id: owner.sourceFilter.dataset });
}
