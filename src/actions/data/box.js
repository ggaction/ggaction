import { BOX_FIELDS, deriveBoxData, normalizeBoxTransform } from "../../grammar/boxPlot.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "category", "field", "whisker", "factor", "as"
]);

function materializer(type, op, select) {
  return derivedMaterializer(
    op,
    `Materialize ${type} box-plot data.`,
    type,
    (values, transform) => select(deriveBoxData(values, transform))
  );
}

export const materializeBoxSummaryData = /* @__PURE__ */ materializer("boxSummary", "materializeBoxSummaryData", value => value.summaries);
export const materializeBoxOutlierData = /* @__PURE__ */ materializer("boxOutlier", "materializeBoxOutlierData", value => value.outliers);

function creator(type, op, materialize) {
  return derivedCreator(
    op,
    `Create immutable ${type} box-plot data.`,
    OPTIONS,
    "Box dataset id",
    "Box source dataset id",
    args => normalizeBoxTransform({
      type,
      category: args.category,
      field: args.field,
      ...(args.whisker === undefined ? {} : { whisker: args.whisker }),
      ...(args.factor === undefined ? {} : { factor: args.factor }),
      as: args.as ?? BOX_FIELDS
    }),
    materialize
  );
}

export const createBoxSummaryData = /* @__PURE__ */ creator("boxSummary", "createBoxSummaryData", "materializeBoxSummaryData");
export const createBoxOutlierData = /* @__PURE__ */ creator("boxOutlier", "createBoxOutlierData", "materializeBoxOutlierData");
