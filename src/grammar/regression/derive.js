import { cloneAndFreeze } from "../../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField
} from "../scales/index.js";
import { fitRegressionGroup, predictRegressionAt } from "./models.js";
import { requireFiniteResult } from "../numeric.js";
import {
  validateGeneratedItemLimit,
  validateWorkLimit
} from "../../core/validation.js";
import {
  normalizeRegressionParameters,
  requireRegressionField
} from "./parameters.js";

export const REGRESSION_LOWER_FIELD = "__regression_ci_lower";
export const REGRESSION_UPPER_FIELD = "__regression_ci_upper";

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

  const groupedRows = new Map();
  if (groupBy === undefined) {
    groupedRows.set(undefined, values);
  } else {
    for (const row of values) {
      const group = row[groupBy];
      const rows = groupedRows.get(group) ?? [];
      rows.push(row);
      groupedRows.set(group, rows);
    }
  }
  const groups = [...groupedRows.keys()];
  const models = [];
  const rows = [];
  let work = 0;

  for (const group of groups) {
    const groupRows = groupedRows.get(group);
    const xCount = new Set(groupRows.map(row => row[x])).size;
    validateGeneratedItemLimit(rows.length + xCount, "Regression generated row count");
    if (parameters.method === "polynomial") {
      const size = parameters.degree + 1;
      work += groupRows.length * size ** 2 + size ** 3;
    } else if (parameters.method === "loess") {
      work += groupRows.length * xCount *
        Math.ceil(Math.log2(groupRows.length + 1));
    }
    validateWorkLimit(work, "Regression computation");
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
      const fitted = requireFiniteResult(
        prediction.prediction,
        `Regression group "${group === undefined ? "all" : String(group)}" prediction`
      );
      const lower = parameters.method === "loess"
        ? undefined
        : requireFiniteResult(
            fitted - prediction.margin,
            `Regression group "${group === undefined ? "all" : String(group)}" lower interval`
          );
      const upper = parameters.method === "loess"
        ? undefined
        : requireFiniteResult(
            fitted + prediction.margin,
            `Regression group "${group === undefined ? "all" : String(group)}" upper interval`
          );
      rows.push({
        ...(groupBy === undefined ? {} : { [groupBy]: group }),
        [x]: xValue,
        [y]: fitted,
        ...(parameters.method === "loess" ? {} : {
          [REGRESSION_LOWER_FIELD]: lower,
          [REGRESSION_UPPER_FIELD]: upper
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
