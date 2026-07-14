import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";

const BAND_OPTIONS = Object.freeze([
  "id", "data", "x", "lower", "upper", "groupBy", "coordinate", "xScale", "yScale",
  "color", "opacity"
]);
const LINE_OPTIONS = Object.freeze([
  "id", "data", "x", "y", "groupBy", "coordinate", "xScale", "yScale", "colorScale",
  "strokeWidth"
]);

export const createRegressionBand = action(
  {
    op: "createRegressionBand",
    description: "Create and encode a grouped regression confidence band."
  },
  function (args = {}) {
    validateKeys(args, BAND_OPTIONS, "createRegressionBand");
    const id = validateUserId(args.id, "Regression band id");
    let next = this
      .createAreaMark({
        id,
        data: args.data,
        fill: args.color ?? DEFAULT_COLORS.regressionBand,
        opacity: args.opacity ?? 0.18
      })
      .encodeX({
        target: id,
        field: args.x,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.xScale }
      })
      .encodeYRange({
        target: id,
        lower: args.lower,
        upper: args.upper,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.yScale }
      });
    if (args.groupBy !== undefined) {
      next = next.encodeGroup({ target: id, field: args.groupBy });
    }
    return next.rematerializeAreaMark({ id });
  }
);

export const createRegressionLine = action(
  {
    op: "createRegressionLine",
    description: "Create and encode grouped regression line paths."
  },
  function (args = {}) {
    validateKeys(args, LINE_OPTIONS, "createRegressionLine");
    const id = validateUserId(args.id, "Regression line id");
    let next = this
      .createLineMark({
        id,
        data: args.data,
        strokeWidth: args.strokeWidth ?? 3
      })
      .encodeX({
        target: id,
        field: args.x,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.xScale }
      })
      .encodeY({
        target: id,
        field: args.y,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.yScale }
      });
    if (args.groupBy !== undefined) {
      next = next
        .encodeColor({
          target: id,
          field: args.groupBy,
          scale: { id: args.colorScale }
        })
        .encodeGroup({ target: id, field: args.groupBy });
    }
    return next.rematerializeLineMark({ id });
  }
);
