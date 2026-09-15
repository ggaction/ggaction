import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  findHistogramBinIndex,
  normalizeHistogramBin,
  resolveHistogramBins
} from "./histogram.js";
import {
  normalizeStatisticalWeight,
  readStatisticalWeights,
  sumEntryWeights,
  summarizeStatisticalWeights,
  validateWeightedNumericFields,
  weightedRows
} from "./weightedStatistics.js";

const TRANSFORM_KEYS = Object.freeze([
  "type", "field", "bin", "extent", "nice", "zero", "includeEmpty",
  "members", "as", "weight", "missing", "resolved"
]);
const AS_KEYS = Object.freeze(["lower", "upper", "count", "members"]);
const RESOLVED_KEYS = Object.freeze(["domain", "step", "boundaries"]);

function rejectUnknownKeys(value, supported, label) {
  const unknown = Object.keys(value).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label} property "${unknown}".`);
  }
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function normalizeAs(field, value, members) {
  const requested = value ?? {};
  if (!isPlainObject(requested)) return requested;
  const result = {
    ...requested,
    lower: requested.lower ?? `${field}_start`,
    upper: requested.upper ?? `${field}_end`,
    count: requested.count ?? "count"
  };
  if (members) result.members = requested.members ?? "members";
  else if (Object.hasOwn(requested, "members")) result.members = requested.members;
  return result;
}

export function normalizeBinTransform({
  field,
  maxBins,
  step,
  boundaries,
  extent,
  nice,
  zero,
  includeEmpty,
  members,
  as,
  weight,
  missing
} = {}) {
  const selected = [maxBins, step, boundaries].filter(value => value !== undefined);
  if (selected.length > 1) {
    throw new Error("Bin data accepts only one of maxBins, step, or boundaries.");
  }
  const bin = normalizeHistogramBin(
    boundaries !== undefined ? { boundaries }
      : step !== undefined ? { step }
        : { maxBins: maxBins ?? 10 }
  );
  const resolvedMembers = members ?? false;
  const transform = {
    type: "bin",
    field,
    bin,
    extent: extent ?? "auto",
    nice: nice ?? true,
    zero: zero ?? false,
    includeEmpty: includeEmpty ?? true,
    members: resolvedMembers,
    as: normalizeAs(field, as, resolvedMembers),
    ...(weight === undefined
      ? {}
      : { weight: normalizeStatisticalWeight(weight, "Bin weight") }),
    ...(missing === undefined ? {} : { missing })
  };
  validateBinTransform(transform);
  return cloneAndFreeze(transform);
}

export function validateBinTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Bin transform must be a plain object.");
  }
  rejectUnknownKeys(transform, TRANSFORM_KEYS, "bin transform");
  if (transform.type !== "bin") {
    throw new Error(`Unsupported bin transform "${transform.type}".`);
  }
  requireField(transform.field, "Bin field");
  if (transform.weight !== undefined) {
    normalizeStatisticalWeight(transform.weight, "Bin weight");
  }
  if (transform.missing !== undefined && !["error", "drop"].includes(transform.missing)) {
    throw new Error('Bin missing must be "error" or "drop".');
  }
  normalizeHistogramBin(transform.bin);
  if (
    transform.extent !== "auto" &&
    (!Array.isArray(transform.extent) || transform.extent.length !== 2 ||
      !transform.extent.every(Number.isFinite) || transform.extent[0] >= transform.extent[1])
  ) {
    throw new TypeError("Bin extent must be auto or two ascending finite numbers.");
  }
  for (const property of ["nice", "zero", "includeEmpty", "members"]) {
    if (typeof transform[property] !== "boolean") {
      throw new TypeError(`Bin ${property} must be a boolean.`);
    }
  }
  if (!isPlainObject(transform.as)) {
    throw new TypeError("Bin as must be a plain object.");
  }
  rejectUnknownKeys(transform.as, AS_KEYS, "bin as");
  const required = ["lower", "upper", "count", ...(transform.members ? ["members"] : [])];
  if (!transform.members && Object.hasOwn(transform.as, "members")) {
    throw new Error("Bin as.members requires members: true.");
  }
  const outputs = required.map(key => requireField(transform.as[key], `Bin as.${key}`));
  if (new Set(outputs).size !== outputs.length) {
    throw new Error("Bin output fields must be unique.");
  }
  if (transform.resolved !== undefined) {
    if (!isPlainObject(transform.resolved)) {
      throw new TypeError("Bin resolved must be a plain object.");
    }
    rejectUnknownKeys(transform.resolved, RESOLVED_KEYS, "bin resolved");
    resolveHistogramBins({
      values: transform.resolved.boundaries ?? [],
      bin: { boundaries: transform.resolved.boundaries },
      domain: transform.resolved.domain,
      nice: transform.nice,
      zero: transform.zero
    });
  }
  return transform;
}

function readValues(rows, field, missing) {
  const eligible = [];
  let excluded = 0;
  rows.forEach((row, index) => {
    const value = row[field];
    if (value === null || value === undefined) {
      if (missing === "drop") { excluded += 1; return; }
      throw new TypeError(`Bin field "${field}" must contain a finite number at row ${index}.`);
    }
    if (!Number.isFinite(value)) {
      throw new TypeError(`Bin field "${field}" must contain a finite number at row ${index}.`);
    }
    eligible.push({ row, index });
  });
  return { eligible, excluded };
}

export function deriveBinRows(rows, transform) {
  validateBinTransform(transform);
  const selected = readValues(rows, transform.field, transform.missing);
  const eligibleRows = selected.eligible.map(entry => entry.row);
  const values = eligibleRows.map(row => row[transform.field]);
  const weights = transform.weight === undefined
    ? undefined
    : readStatisticalWeights(eligibleRows, transform.weight, "Bin");
  if (weights !== undefined) {
    validateWeightedNumericFields(weights.entries, [transform.field], "Bin");
  }
  const weightSummary = weights === undefined
    ? undefined
    : summarizeStatisticalWeights(
        weights.entries,
        weights.definition.kind,
        "Bin data"
      );
  const contributingValues = weightSummary === undefined
    ? values
    : weightSummary.positive.map(entry => entry.row[transform.field]);
  if (
    transform.extent !== "auto" &&
    contributingValues.some(value =>
      value < transform.extent[0] || value > transform.extent[1]
    )
  ) {
    throw new RangeError("Bin extent must contain the histogram data extent.");
  }
  const resolved = resolveHistogramBins({
    values: contributingValues,
    bin: transform.bin,
    domain: transform.extent,
    nice: transform.nice,
    zero: transform.zero
  });
  const members = resolved.boundaries.slice(0, -1).map(() => []);
  const entries = weightSummary === undefined
    ? selected.eligible
    : weightSummary.positive;
  entries.forEach(entry => {
    const value = entry.row[transform.field];
    const bin = findHistogramBinIndex(value, resolved.boundaries);
    if (bin !== -1) members[bin].push(entry);
  });
  const output = members.flatMap((group, index) =>
    !transform.includeEmpty && group.length === 0 ? [] : [{
      [transform.as.lower]: resolved.boundaries[index],
      [transform.as.upper]: resolved.boundaries[index + 1],
      [transform.as.count]: weightSummary === undefined
        ? group.length
        : sumEntryWeights(group, weightSummary, "Bin mass"),
      ...(transform.members
        ? {
            [transform.as.members]: weightSummary === undefined
              ? group.map(entry => entry.row)
              : weightedRows({ positive: group })
          }
        : {})
    }]
  );
  return {
    values: output,
    resolved: {
      domain: resolved.domain,
      ...(resolved.step === undefined ? {} : { step: resolved.step }),
      boundaries: resolved.boundaries
    },
    ...(transform.missing === undefined ? {} : {
      report: {
        version: 1,
        owner: { kind: "data", id: "pending" },
        inputs: [],
        units: [{
          role: transform.as.count,
          group: {},
          inputRows: rows.length,
          usedRows: eligibleRows.length,
          excludedRows: selected.excluded,
          excludedByReason: selected.excluded === 0 ? {} : { "missing-value": selected.excluded }
        }]
      }
    })
  };
}

export function resolveBinTransform(result, transform) {
  return cloneAndFreeze([{ ...transform, resolved: result.resolved }]);
}
