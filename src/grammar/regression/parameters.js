import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { normalizeConfidenceInterval } from
  "../statistics/confidenceInterval.js";

const MAX_POLYNOMIAL_DEGREE = 32;

export function normalizeRegressionPredict(predict) {
  if (predict === undefined) return undefined;
  if (predict === false) throw new TypeError("Regression predict false is only valid in edits.");
  if (!isPlainObject(predict)) {
    throw new TypeError("Regression predict must be a plain object.");
  }
  const unknown = Object.keys(predict).find(key => !["values", "domain", "steps"].includes(key));
  if (unknown !== undefined) throw new Error(`Unknown regression predict property "${unknown}".`);
  const usesValues = Object.hasOwn(predict, "values");
  const usesDomain = Object.hasOwn(predict, "domain") || Object.hasOwn(predict, "steps");
  if (usesValues === usesDomain) throw new Error("Regression predict requires values or domain with steps.");
  if (usesValues) {
    const values = predict.values;
    if (!Array.isArray(values) || values.length === 0 || values.some((value, index) =>
      !Number.isFinite(value) || (index > 0 && !(value > values[index - 1]))
    )) throw new TypeError("Regression predict values must be finite, unique, and strictly ascending.");
    return cloneAndFreeze({ values: [...values] });
  }
  if (!Array.isArray(predict.domain) || predict.domain.length !== 2 ||
      !predict.domain.every(Number.isFinite) || !(predict.domain[0] < predict.domain[1])) {
    throw new TypeError("Regression predict domain must be two increasing finite numbers.");
  }
  if (!Number.isInteger(predict.steps) || predict.steps < 2) {
    throw new RangeError("Regression predict steps must be an integer of at least two.");
  }
  validateGeneratedItemLimit(predict.steps, "Regression predict steps");
  return cloneAndFreeze({ domain: [...predict.domain], steps: predict.steps });
}

export function requireRegressionField(field, label) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return field;
}

export function normalizeRegressionParameters({
  method = "linear",
  degree,
  span,
  confidenceMethod,
  level,
  confidence,
  interval
} = {}) {
  if (!["linear", "polynomial", "loess"].includes(method)) {
    throw new Error(`Unsupported regression method "${method}".`);
  }
  if (method === "loess") {
    if (degree !== undefined) {
      throw new Error("Regression degree requires the polynomial method.");
    }
    if (
      confidenceMethod !== undefined || level !== undefined ||
      confidence !== undefined || interval !== undefined
    ) {
      throw new Error("LOESS regression does not support confidence intervals.");
    }
    const resolvedSpan = span ?? 0.75;
    if (!Number.isFinite(resolvedSpan) || resolvedSpan <= 0 || resolvedSpan > 1) {
      throw new RangeError(
        "Regression LOESS span must be greater than zero and at most one."
      );
    }
    return cloneAndFreeze({ method, span: resolvedSpan });
  }
  if (span !== undefined) {
    throw new Error("Regression span requires the loess method.");
  }
  if (interval === false) {
    if (confidenceMethod !== undefined || level !== undefined || confidence !== undefined) {
      throw new Error("Regression interval false cannot include confidence options.");
    }
    if (method === "polynomial") {
      const resolvedDegree = degree ?? 2;
      if (!Number.isInteger(resolvedDegree) || resolvedDegree < 1) {
        throw new RangeError("Regression polynomial degree must be a positive integer.");
      }
      validateGeneratedItemLimit(resolvedDegree, "Regression polynomial degree", MAX_POLYNOMIAL_DEGREE);
      return cloneAndFreeze({ method, degree: resolvedDegree, interval: false });
    }
    if (degree !== undefined) throw new Error("Regression degree requires the polynomial method.");
    return cloneAndFreeze({ method, interval: false });
  }
  if (level !== undefined && confidence !== undefined && level !== confidence) {
    throw new Error(
      "Regression level and confidence alias must match when both are provided."
    );
  }
  const confidenceInterval = normalizeConfidenceInterval({
    method: confidenceMethod,
    level: level ?? confidence
  }, {
    defaultMethod: "student-t",
    label: "Regression confidence interval"
  });
  const resolvedInterval = interval ?? "mean";
  if (!["mean", "prediction"].includes(resolvedInterval)) {
    throw new Error(`Unsupported regression interval "${resolvedInterval}".`);
  }
  if (method === "polynomial") {
    const resolvedDegree = degree ?? 2;
    if (!Number.isInteger(resolvedDegree) || resolvedDegree < 1) {
      throw new RangeError(
        "Regression polynomial degree must be a positive integer."
      );
    }
    validateGeneratedItemLimit(
      resolvedDegree,
      "Regression polynomial degree",
      MAX_POLYNOMIAL_DEGREE
    );
    return cloneAndFreeze({
      method,
      degree: resolvedDegree,
      confidenceMethod: confidenceInterval.method,
      level: confidenceInterval.level,
      interval: resolvedInterval
    });
  }
  if (degree !== undefined) {
    throw new Error("Regression degree requires the polynomial method.");
  }
  return cloneAndFreeze({
    method,
    confidenceMethod: confidenceInterval.method,
    level: confidenceInterval.level,
    interval: resolvedInterval
  });
}

export function validateRegressionTransform(transform) {
  const supported = [
    "type", "method", "x", "y", "groupBy", "confidenceMethod", "level",
    "confidence", "interval",
    "degree", "span", "predict", "missing"
  ];
  const unknown = Object.keys(transform).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown regression transform property "${unknown}".`);
  }
  if (transform.type !== "regression") {
    throw new Error(`Unsupported regression transform "${transform.type}".`);
  }
  requireRegressionField(transform.x, "Regression x field");
  requireRegressionField(transform.y, "Regression y field");
  if (transform.groupBy !== undefined) {
    requireRegressionField(transform.groupBy, "Regression groupBy field");
  }
  if (
    transform.confidence !== undefined &&
    (transform.confidenceMethod !== undefined || transform.level !== undefined)
  ) {
    throw new Error(
      "Regression confidence provenance must use either the legacy confidence field or method and level."
    );
  }
  const normalized = normalizeRegressionParameters({
    method: transform.method,
    degree: transform.degree,
    span: transform.span,
    confidenceMethod: transform.confidenceMethod,
    level: transform.level,
    confidence: transform.confidence,
    interval: transform.interval
  });
  normalizeRegressionPredict(transform.predict);
  if (transform.missing !== undefined && !["error", "drop"].includes(transform.missing)) {
    throw new Error('Regression missing must be "error" or "drop".');
  }
  if (normalized.method === "loess") return transform;
  if (
    transform.confidence === undefined &&
    transform.interval !== false &&
    (transform.confidenceMethod === undefined || transform.level === undefined)
  ) {
    throw new Error("Regression confidence provenance requires method and level.");
  }
  if (transform.interval === undefined) {
    throw new Error(`Unsupported regression interval "${transform.interval}".`);
  }
  return transform;
}

export function normalizeRegressionTransform(args = {}) {
  const parameters = normalizeRegressionParameters(args);
  const predict = normalizeRegressionPredict(args.predict);
  const transform = {
    type: "regression",
    method: parameters.method,
    x: args.x,
    y: args.y,
    ...(args.groupBy === undefined ? {} : { groupBy: args.groupBy }),
    ...(parameters.method === "polynomial"
      ? { degree: parameters.degree }
      : {}),
    ...(parameters.method === "loess"
      ? { span: parameters.span }
      : parameters.interval === false ? { interval: false } : {
          confidenceMethod: parameters.confidenceMethod,
          level: parameters.level,
          interval: parameters.interval
        }),
    ...(predict === undefined ? {} : { predict }),
    ...(args.missing === undefined ? {} : { missing: args.missing })
  };
  validateRegressionTransform(transform);
  return cloneAndFreeze(transform);
}
