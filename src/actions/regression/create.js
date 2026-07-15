import { action } from "../../core/action.js";
import { validateKeys } from "../../core/validation.js";
import {
  findRegressionPoint,
  inferRegressionGroup,
  requireRegressionField,
  requireRegressionObject
} from "./resolve.js";

const REGRESSION_OPTIONS = Object.freeze([
  "target", "x", "y", "groupBy", "confidence", "band", "line"
]);

export const createRegression = action(
  {
    op: "createRegression",
    description: "Fit and layer a linear regression line with confidence band."
  },
  function (args = {}) {
    validateKeys(args, REGRESSION_OPTIONS, "createRegression");
    const point = findRegressionPoint(this, args.target);
    const x = args.x === undefined
      ? point.encoding.x.field
      : requireRegressionField(args.x, "Regression x");
    const y = args.y === undefined
      ? point.encoding.y.field
      : requireRegressionField(args.y, "Regression y");
    const groupBy = inferRegressionGroup(point, args);
    const coordinate = point.coordinate;
    const xScale = point.encoding.x.scale;
    const yScale = point.encoding.y.scale;
    if (coordinate === undefined || xScale === undefined || yScale === undefined) {
      throw new Error(
        "createRegression target requires stored coordinate and scales."
      );
    }
    const band = requireRegressionObject(args.band ?? {}, "Regression band");
    const line = requireRegressionObject(args.line ?? {}, "Regression line");
    validateKeys(
      band,
      ["color", "opacity", "stroke", "strokeWidth"],
      "regression band"
    );
    validateKeys(line, ["strokeWidth", "curve"], "regression line");
    const colorEncoding = point.encoding?.color;
    const namespace = point.id;
    const dataId = `${namespace}RegressionData`;
    const bandId = `${namespace}RegressionBands`;
    const lineId = `${namespace}RegressionLines`;
    const colorScale =
      groupBy !== undefined && colorEncoding?.field === groupBy
        ? colorEncoding.scale
        : `${namespace}RegressionColor`;

    return this
      .createRegressionData({
        id: dataId,
        source: point.data,
        x,
        y,
        ...(groupBy === undefined ? {} : { groupBy }),
        confidence: args.confidence ?? 0.95
      })
      .createRegressionBand({
        id: bandId,
        data: dataId,
        x,
        lower: "__regression_ci_lower",
        upper: "__regression_ci_upper",
        ...(groupBy === undefined ? {} : { groupBy }),
        coordinate,
        xScale,
        yScale,
        ...band
      })
      .createRegressionLine({
        id: lineId,
        data: dataId,
        x,
        y,
        ...(groupBy === undefined ? {} : { groupBy, colorScale }),
        coordinate,
        xScale,
        yScale,
        ...line
      });
  }
);
