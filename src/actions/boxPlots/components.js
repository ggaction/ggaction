import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { closedAction } from "../../core/action.js";

import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../grammar/strokeStyle.js";

const MEDIAN_OPTIONS = Object.freeze([
  "id", "owner", "data", "category", "categoryType", "measure",
  "coordinate", "categoryScale", "measureScale", "orientation", "stroke",
  "strokeWidth", ...STROKE_STYLE_PROPERTIES
]);
const OUTLIER_OPTIONS = Object.freeze([
  "id", "data", "category", "categoryType", "measure", "coordinate",
  "categoryScale", "measureScale", "orientation", "shape", "radius", "opacity",
  ...STROKE_STYLE_PROPERTIES
]);

export const createBoxMedian = /* @__PURE__ */ closedAction(
  {
    op: "createBoxMedian",
    description: "Create a median rule spanning one concrete box body."
  }, MEDIAN_OPTIONS,
  function (args = {}) {
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported box median orientation "${args.orientation}".`);
    }
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    let next = this.createRuleMark({
      id: args.id,
      data: args.data,
      ...requestedStrokeDetails(args, "Box median")
    });
    next = next[categoryAction]({
      target: args.id,
      field: args.category,
      fieldType: args.categoryType,
      coordinate: args.coordinate,
      scale: { id: args.categoryScale }
    });
    next = next[measureAction]({
      target: args.id,
      field: args.measure,
      fieldType: "quantitative",
      coordinate: args.coordinate,
      scale: { id: args.measureScale }
    });
    next = next
      .encodeStroke({ target: args.id, value: args.stroke })
      .encodeStrokeWidth({ target: args.id, value: args.strokeWidth });
    next = next._withMarkConfig(args.id, {
      ...next.markConfigs[args.id],
      boxSpanOwner: args.owner
    });
    return next.rematerializeRuleMark({ id: args.id });
  }
);

export const createBoxOutliers = /* @__PURE__ */ closedAction(
  {
    op: "createBoxOutliers",
    description: "Create concrete point symbols for box-plot outlier rows."
  }, OUTLIER_OPTIONS,
  function (args = {}) {
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported box outlier orientation "${args.orientation}".`);
    }
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    let next = this.createPointMark({
      id: args.id,
      data: args.data,
      shape: args.shape,
      fill: "#111111",
      ...requestedStrokeDetails(args, "Box outlier")
    });
    next = next[categoryAction]({
      target: args.id,
      field: args.category,
      fieldType: args.categoryType,
      coordinate: args.coordinate,
      scale: { id: args.categoryScale }
    });
    next = next[measureAction]({
      target: args.id,
      field: args.measure,
      fieldType: "quantitative",
      coordinate: args.coordinate,
      scale: { id: args.measureScale }
    });
    return next
      .encodeRadius({ target: args.id, value: args.radius })
      .encodeOpacity({ target: args.id, value: args.opacity });
  }
);


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