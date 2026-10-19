import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";

// A box selection retains complete categories, including the median, whisker
// caps and outliers. All members must be rebound before any scale consumer runs.
export function synchronizeBoxFilter(program, target, filteredData) {
  const box = program.markConfigs[target]?.boxPlot;
  if (box?.materialized !== true) return program;
  const whisker = program.markConfigs[box.whiskerId]?.errorBar;
  const summaryMembers = [box.whiskerId, box.medianId,
    whisker?.lowerCapId, whisker?.upperCapId].filter(id => findLayer(program, id));
  const summary = filteredData ?? box.summaryId;
  const rows = findDataset(program, summary).values;
  let next = program;
  const bind = (id, data) => {
    next = next.editSemantic({ property: `layer[${id}].data`, value: data });
    const { markFilter: previous, ...config } = next.markConfigs[id] ?? {};
    next = next._withMarkConfig(id, filteredData === undefined ? config : {
      ...config, markFilter: { owner: target, dataset: data, empty: findDataset(next, data).values.length === 0 }
    });
  };
  for (const id of summaryMembers) bind(id, summary);
  if (findLayer(next, box.outlierId) && box.outlierDataId) {
    const filterId = `${filteredData ?? program.markConfigs[target]?.markFilter?.dataset}Outliers`;
    if (filteredData !== undefined) {
      const categories = [...new Set(rows.map(row => row[box.category]))];
      const selector = categories.length > 0 ? { oneOf: categories } : {
        noneOf: [...new Set(findDataset(next, box.outlierDataId).values.map(row => row[box.category]))]
      };
      if (findDataset(next, filterId)) {
        bind(box.outlierId, box.outlierDataId);
        next = next.releaseDerivedData({ id: filterId });
      }
      next = next.filterData({ id: filterId, source: box.outlierDataId,
        field: box.category, ...selector });
      bind(box.outlierId, filterId);
    } else {
      bind(box.outlierId, box.outlierDataId);
      if (findDataset(next, filterId)) next = next.releaseDerivedData({ id: filterId });
    }
  }
  return next;
}
