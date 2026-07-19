import { cloneAndFreeze } from "../../core/immutable.js";

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
    if (confidence !== undefined || interval !== undefined) {
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
  const resolvedConfidence = confidence ?? 0.95;
  if (
    !Number.isFinite(resolvedConfidence) ||
    resolvedConfidence <= 0 ||
    resolvedConfidence >= 1
  ) {
    throw new RangeError("Regression confidence must be between 0 and 1.");
  }
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
    return cloneAndFreeze({
      method,
      degree: resolvedDegree,
      confidence: resolvedConfidence,
      interval: resolvedInterval
    });
  }
  if (degree !== undefined) {
    throw new Error("Regression degree requires the polynomial method.");
  }
  return cloneAndFreeze({
    method,
    confidence: resolvedConfidence,
    interval: resolvedInterval
  });
}

export function validateRegressionTransform(transform) {
  const supported = [
    "type", "method", "x", "y", "groupBy", "confidence", "interval",
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
  const normalized = normalizeRegressionParameters({
    method: transform.method,
    degree: transform.degree,
    span: transform.span,
    confidence: transform.confidence,
    interval: transform.interval
  });
  if (normalized.method === "loess") return transform;
  if (!Number.isFinite(transform.confidence)) {
    throw new RangeError("Regression confidence must be between 0 and 1.");
  }
  if (transform.interval === undefined) {
    throw new Error(`Unsupported regression interval "${transform.interval}".`);
  }
  return transform;
}
