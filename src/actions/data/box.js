import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { BOX_FIELDS, deriveBoxData, normalizeBoxTransform } from "../../grammar/boxPlot.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "category", "field", "whisker", "factor", "as"
]);

function materializer(type, op, select) {
  return action({ op, description: `Materialize ${type} box-plot data.` }, function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, op);
    const { id, source, transform } = requireDerivedDataset(this, args.id, type);
    return this.editSemantic({ property: `dataset[${id}].values`, value: select(deriveBoxData(source.values, transform)) });
  });
}

export const materializeBoxSummaryData = materializer("boxSummary", "materializeBoxSummaryData", value => value.summaries);
export const materializeBoxOutlierData = materializer("boxOutlier", "materializeBoxOutlierData", value => value.outliers);

function creator(type, op, materialize) {
  return action({ op, description: `Create immutable ${type} box-plot data.` }, function (args = {}) {
    validateKeys(args, OPTIONS, op);
    const id = validateUserId(args.id, "Box dataset id");
    const source = validateUserId(args.source ?? this.context.currentData, "Box source dataset id");
    const transform = normalizeBoxTransform({
      type,
      category: args.category,
      field: args.field,
      ...(args.whisker === undefined ? {} : { whisker: args.whisker }),
      ...(args.factor === undefined ? {} : { factor: args.factor }),
      as: args.as ?? BOX_FIELDS
    });
    return this.createDerivedData({ id, source, transform: [transform] })[materialize]({ id });
  });
}

export const createBoxSummaryData = creator("boxSummary", "createBoxSummaryData", "materializeBoxSummaryData");
export const createBoxOutlierData = creator("boxOutlier", "createBoxOutlierData", "materializeBoxOutlierData");
