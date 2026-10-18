import { quantileSorted, requireFiniteResult } from "../numeric.js";
import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { studentTCriticalValue } from "./studentT.js";

export const CONFIDENCE_INTERVAL_METHODS = Object.freeze([
  "normal",
  "student-t"
]);

function validateMethod(method, label, allowBootstrap = false) {
  if (allowBootstrap && isPlainObject(method)) {
    const unknown = Object.keys(method).find(key => !["type", "seed", "samples"].includes(key));
    if (unknown !== undefined) throw new Error(`Unknown bootstrap method property "${unknown}".`);
    if (method.type !== "bootstrap") throw new Error(`Unsupported ${label} method type.`);
    if (!Number.isInteger(method.seed) || method.seed < 1 || method.seed > 2147483646) {
      throw new RangeError("Bootstrap seed must be an integer between 1 and 2147483646.");
    }
    const samples = method.samples === undefined ? 1000 : method.samples;
    if (!Number.isInteger(samples) || samples < 1 || samples > 10000) {
      throw new RangeError("Bootstrap samples must be an integer between 1 and 10000.");
    }
    return { type: "bootstrap", seed: method.seed, samples };
  }
  if (!CONFIDENCE_INTERVAL_METHODS.includes(method)) {
    throw new Error(`Unsupported ${label} method "${method}".`);
  }
  return method;
}

function validateLevel(level, label) {
  if (!Number.isFinite(level) || level <= 0 || level >= 1) {
    throw new RangeError(`${label} level must be between 0 and 1.`);
  }
}

// Peter J. Acklam's inverse-normal approximation. The exact 95% compatibility
// value is handled by normalCriticalValue before this approximation is used.
function inverseNormal(probability) {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996, 3.754408661907416
  ];
  const low = 0.02425;
  const high = 1 - low;
  if (probability < low) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (probability > high) {
    const q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = probability - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function normalizeConfidenceInterval({
  method,
  level
} = {}, {
  defaultMethod,
  defaultLevel = 0.95,
  label = "Confidence interval",
  allowBootstrap = false
} = {}) {
  validateMethod(defaultMethod, label);
  const resolvedMethod = validateMethod(method ?? defaultMethod, label, allowBootstrap);
  const resolvedLevel = level ?? defaultLevel;
  validateLevel(resolvedLevel, label);
  return cloneAndFreeze({ method: resolvedMethod, level: resolvedLevel });
}

export function normalCriticalValue(level) {
  validateLevel(level, "Normal confidence interval");
  if (level === 0.95) return 1.96;
  return inverseNormal((1 + level) / 2);
}

export function confidenceCriticalValue({
  method,
  level,
  degreesOfFreedom
}) {
  const normalized = normalizeConfidenceInterval(
    { method, level },
    { defaultMethod: method, label: "Confidence interval" }
  );
  if (normalized.method === "normal") {
    return normalCriticalValue(normalized.level);
  }
  if (!Number.isInteger(degreesOfFreedom) || degreesOfFreedom < 1) {
    throw new RangeError(
      "Student-t confidence interval degreesOfFreedom must be a positive integer."
    );
  }
  return studentTCriticalValue(normalized.level, degreesOfFreedom);
}


export function validateBootstrapDrawCount(draws) {
  if (!Number.isSafeInteger(draws) || draws < 0 || draws > 50000000) {
    throw new RangeError("Bootstrap resampling cannot exceed 50000000 draws per action.");
  }
}

// One action-owned sampler per field/samples/seed. Its stream advances in group
// first-appearance order; all interval levels reuse the same sorted sample means.
export function createBootstrapMeanSampler(method) {
  const normalized = validateMethod(method, "Bootstrap mean interval", true);
  if (normalized?.type !== "bootstrap") throw new Error("Bootstrap sampler requires a bootstrap method.");
  let state = normalized.seed;
  return values => {
    if (values.length === 0) return [];
    const means = [];
    for (let sample = 0; sample < normalized.samples; sample += 1) {
      let sum = 0;
      for (let draw = 0; draw < values.length; draw += 1) {
        state = (1103515245 * state + 12345) % 2147483647;
        sum += values[Math.floor(state / 2147483647 * values.length)];
      }
      means.push(requireFiniteResult(sum / values.length, "Bootstrap sample mean"));
    }
    return means.sort((left, right) => left - right);
  };
}

export function bootstrapMeanBounds(sortedMeans, level = 0.95) {
  validateLevel(level, "Bootstrap mean interval");
  if (sortedMeans.length === 0) return undefined;
  const tail = (1 - level) / 2;
  return {
    lower: requireFiniteResult(quantileSorted(sortedMeans, tail), "Bootstrap lower endpoint"),
    upper: requireFiniteResult(quantileSorted(sortedMeans, 1 - tail), "Bootstrap upper endpoint")
  };
}
