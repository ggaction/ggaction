import { cloneAndFreeze } from "../../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField
} from "../scales/index.js";
import {
  REGRESSION_LOWER_FIELD,
  REGRESSION_UPPER_FIELD
} from "./fields.js";
import { fitRegressionGroup, predictRegressionAt } from "./models.js";
import {
  normalizeRegressionParameters,
  requireRegressionField
} from "./parameters.js";

export function deriveRegression(values, {
  x,
  y,
  groupBy,
  method,
  degree,
  span,
  confidence,
  interval
} = {}) {
  if (!Array.isArray(values)) {
    throw new TypeError("Regression values must be an array.");
  }
  requireRegressionField(x, "Regression x field");
  requireRegressionField(y, "Regression y field");
  if (groupBy !== undefined) {
    requireRegressionField(groupBy, "Regression groupBy field");
  }
  const parameters = normalizeRegressionParameters({
    method,
    degree,
    span,
    confidence,
    interval
  });
  readQuantitativeField(values, x);
  readQuantitativeField(values, y);
  if (groupBy !== undefined) readNominalField(values, groupBy);

  const groups = groupBy === undefined
    ? [undefined]
    : [...new Set(values.map(row => row[groupBy]))];
  const models = [];
  const rows = [];

  for (const group of groups) {
    const groupRows = groupBy === undefined
      ? values
      : values.filter(row => row[groupBy] === group);
    const model = fitRegressionGroup(groupRows, {
      x,
      y,
      group,
      parameters
    });
    const xValues = [...new Set(groupRows.map(row => row[x]))]
      .sort((left, right) => left - right);
    models.push({ ...(groupBy === undefined ? {} : { group }), ...model, xValues });

    for (const xValue of xValues) {
      const prediction = predictRegressionAt(model, xValue, parameters);
      rows.push({
        ...(groupBy === undefined ? {} : { [groupBy]: group }),
        [x]: xValue,
        [y]: prediction.prediction,
        ...(parameters.method === "loess" ? {} : {
          [REGRESSION_LOWER_FIELD]: prediction.prediction - prediction.margin,
          [REGRESSION_UPPER_FIELD]: prediction.prediction + prediction.margin
        })
      });
    }
  }

  return cloneAndFreeze({
    fields: {
      x,
      y,
      ...(groupBy === undefined ? {} : { group: groupBy }),
      ...(parameters.method === "loess" ? {} : {
        lower: REGRESSION_LOWER_FIELD,
        upper: REGRESSION_UPPER_FIELD
      })
    },
    parameters,
    groups,
    models,
    values: rows
  });
}

export function deriveLinearRegression(values, options = {}) {
  return deriveRegression(values, { ...options, method: "linear" });
}
