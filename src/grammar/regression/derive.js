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
  confidenceMethod,
  level,
  confidence,
  interval,
  predict,
  missing
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
    confidenceMethod,
    level,
    confidence,
    interval
  });
  let missingRows = 0;
  const eligibleValues = missing === undefined ? values : values.filter((row, index) => {
    const xValue = row?.[x];
    const yValue = row?.[y];
    if (xValue === null || xValue === undefined || yValue === null || yValue === undefined) {
      if (missing === "error") throw new TypeError(`Regression x/y pair is missing at row ${index}.`);
      missingRows += 1;
      return false;
    }
    if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
      throw new TypeError(`Regression x/y fields must contain finite numbers at row ${index}.`);
    }
    return true;
  });
  readQuantitativeField(eligibleValues, x);
  readQuantitativeField(eligibleValues, y);
  if (groupBy !== undefined) readNominalField(eligibleValues, groupBy);

  const groupedRows = new Map();
  if (groupBy === undefined) {
    groupedRows.set(undefined, eligibleValues);
  } else {
    for (const row of eligibleValues) {
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
    const observedX = [...new Set(groupRows.map(row => row[x]))]
      .sort((left, right) => left - right);
    const xValues = predict?.values ?? (predict?.domain === undefined
      ? observedX
      : Array.from({ length: predict.steps }, (_, index) => {
          if (index === 0) return predict.domain[0];
          if (index === predict.steps - 1) return predict.domain[1];
          const ratio = index / (predict.steps - 1);
          return requireFiniteResult(
            predict.domain[0] * (1 - ratio) + predict.domain[1] * ratio,
            "Regression prediction grid"
          );
        }));
    validateGeneratedItemLimit(rows.length + xValues.length, "Regression generated row count");
    if (parameters.method === "polynomial") {
      const size = parameters.degree + 1;
      work += groupRows.length * size ** 2 + size ** 3;
    } else if (parameters.method === "loess") {
      work += groupRows.length * xValues.length *
        Math.ceil(Math.log2(groupRows.length + 1));
    }
    validateWorkLimit(work, "Regression computation");
    const model = fitRegressionGroup(groupRows, {
      x,
      y,
      group,
      parameters
    });
    models.push({ ...(groupBy === undefined ? {} : { group }), ...model, xValues });

    for (const xValue of xValues) {
      const prediction = predictRegressionAt(model, xValue, parameters);
      const fitted = requireFiniteResult(
        prediction.prediction,
        `Regression group "${group === undefined ? "all" : String(group)}" prediction`
      );
      const lower = parameters.method === "loess" || parameters.interval === false
        ? undefined
        : requireFiniteResult(
            fitted - prediction.margin,
            `Regression group "${group === undefined ? "all" : String(group)}" lower interval`
          );
      const upper = parameters.method === "loess" || parameters.interval === false
        ? undefined
        : requireFiniteResult(
            fitted + prediction.margin,
            `Regression group "${group === undefined ? "all" : String(group)}" upper interval`
          );
      rows.push({
        ...(groupBy === undefined ? {} : { [groupBy]: group }),
        [x]: xValue,
        [y]: fitted,
        ...(parameters.method === "loess" || parameters.interval === false ? {} : {
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
      ...(parameters.method === "loess" || parameters.interval === false ? {} : {
        lower: REGRESSION_LOWER_FIELD,
        upper: REGRESSION_UPPER_FIELD
      })
    },
    parameters,
    groups,
    models,
    values: rows,
    ...(missing === undefined ? {} : {
      report: {
        version: 1,
        owner: { kind: "data", id: "pending" },
        inputs: [],
        units: [{
          role: "fit",
          group: {},
          inputRows: values.length,
          usedRows: eligibleValues.length,
          excludedRows: missingRows,
          excludedByReason: missingRows === 0 ? {} : { "missing-value": missingRows }
        }]
      }
    })
  });
}

export function deriveLinearRegression(values, options = {}) {
  return deriveRegression(values, { ...options, method: "linear" });
}
