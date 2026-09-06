import { cloneAndFreeze } from "../../core/immutable.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { normalizeConfidenceInterval } from
  "../statistics/confidenceInterval.js";

const MAX_POLYNOMIAL_DEGREE = 32;

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
    "degree", "span"
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
  if (normalized.method === "loess") return transform;
  if (
    transform.confidence === undefined &&
    (transform.confidenceMethod === undefined || transform.level === undefined)
  ) {
    throw new Error("Regression confidence provenance requires method and level.");
  }
  if (transform.interval === undefined) {
    throw new Error(`Unsupported regression interval "${transform.interval}".`);
  }
  return transform;
}
