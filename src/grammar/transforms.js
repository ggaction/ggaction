import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateBoxTransform } from "./boxPlot.js";
import { normalizeBinTransform, validateBinTransform } from "./bin.js";
import {
  normalizeBin2DTransform,
  requestedBin2DTransform,
  validateBin2DTransform
} from "./bin2d.js";
import {
  normalizeDensityTransform,
  validateDensityTransform
} from "./density.js";
import {
  normalizeECDFTransform,
  validateECDFTransform
} from "./ecdf.js";
import {
  normalizeComputedTransform,
  validateComputedTransform
} from "./computed.js";
import {
  normalizeCompleteTransform,
  validateCompleteTransform
} from "./complete.js";
import {
  normalizeFilterTransform,
  validateFilterTransform
} from "./filter.js";
import { normalizeFoldTransform, validateFoldTransform } from "./fold.js";
import {
  requestedGradientProfileTransform,
  validateGradientProfileTransform
} from "./gradientProfile.js";
import {
  normalizeIntervalTransform,
  validateIntervalTransform
} from "./interval.js";
import {
  normalizeImputeTransform,
  validateImputeTransform
} from "./impute.js";
import {
  requestedHorizonTransform,
  validateHorizonTransform
} from "./horizon.js";
import { validateMarkFilterTransform } from "./markFilter.js";
import {
  normalizeNormalizeTransform,
  validateNormalizeTransform
} from "./normalize.js";
import {
  normalizeRegressionTransform,
  validateRegressionTransform
} from "./regression/index.js";
import { normalizeWindowTransform, validateWindowTransform } from "./window.js";
import {
  normalizeTimeUnitTransform,
  validateTimeUnitTransform
} from "./timeUnit.js";
import {
  normalizeSummaryTransform,
  validateSummaryTransform
} from "./summary.js";
import { normalizeStackTransform, validateStackTransform } from "./stack.js";
import { findTransformTopology } from "./transformTopology.js";

function requestedTransform(transform) {
  const { resolved: _resolved, ...requested } = transform;
  return cloneAndFreeze(requested);
}

const requestedDensityTransform = requestedTransform;

function requestedOptions(transform) {
  const { type: _type, resolved: _resolved, ...options } = transform;
  return options;
}

function mergedOptions(transform, patch) {
  const options = { ...requestedOptions(transform) };
  if (patch.weight === false) delete options.weight;
  return {
    ...options,
    ...Object.fromEntries(
      Object.entries(patch).filter(
        ([key, value]) => !(key === "weight" && value === false)
      )
    )
  };
}

function replaceExclusive(options, patch, keys) {
  if (!keys.some(key => Object.hasOwn(patch, key))) return options;
  const next = { ...options };
  for (const key of keys) delete next[key];
  return next;
}

function normalizeSimple(normalize) {
  return (transform, patch) => normalize(mergedOptions(transform, patch));
}

function normalizeFilterEdit(transform, patch) {
  const base = replaceExclusive(
    requestedOptions(transform),
    patch,
    ["oneOf", "predicate", "range"]
  );
  return normalizeFilterTransform({ ...base, ...patch });
}

function normalizeBinEdit(transform, patch) {
  const prior = requestedOptions(transform);
  const base = replaceExclusive(
    { ...prior, ...prior.bin },
    patch,
    ["maxBins", "step", "boundaries"]
  );
  delete base.bin;
  if (patch.weight === false) delete base.weight;
  return normalizeBinTransform({
    ...base,
    ...Object.fromEntries(
      Object.entries(patch).filter(
        ([key, value]) => !(key === "weight" && value === false)
      )
    )
  });
}

function normalizeBin2DEdit(transform, patch, owner) {
  return normalizeBin2DTransform({
    id: owner,
    ...requestedOptions(transform),
    ...patch
  });
}

function normalizeCompleteEdit(transform, patch) {
  const base = replaceExclusive(
    requestedOptions(transform),
    patch,
    ["values", "sequence"]
  );
  return normalizeCompleteTransform({ ...base, ...patch });
}

function normalizeImputeEdit(transform, patch) {
  const base = { ...requestedOptions(transform) };
  if (Object.hasOwn(patch, "method") && patch.method !== base.method) {
    delete base.value;
    if (patch.method === "constant") base.sortBy = [];
  }
  return normalizeImputeTransform({ ...base, ...patch });
}

function normalizeIntervalEdit(transform, patch) {
  const base = { ...requestedOptions(transform) };
  const extent = patch.extent ?? base.extent;
  if (extent !== "ci") {
    delete base.method;
    delete base.level;
  }
  return normalizeIntervalTransform({ ...base, ...patch, extent });
}

function normalizeNormalizeEdit(transform, patch) {
  const base = { ...requestedOptions(transform) };
  const method = patch.method ?? base.method;
  if (method !== base.method) {
    if (method !== "zscore") delete base.variance;
    if (method === "change") delete base.zeroDenominator;
    if (!["index", "change", "percentChange"].includes(method)) {
      delete base.baseline;
      delete base.sortBy;
    }
    if (
      !["index", "change", "percentChange"].includes(base.method) &&
      ["index", "change", "percentChange"].includes(method)
    ) {
      delete base.baseline;
      delete base.sortBy;
    }
  }
  return normalizeNormalizeTransform({ ...base, ...patch, method });
}

function normalizeRegressionEdit(transform, patch) {
  const base = { ...requestedOptions(transform) };
  const method = patch.method ?? base.method;
  if (method !== base.method) {
    if (method !== "polynomial") delete base.degree;
    if (method !== "loess") delete base.span;
    if (method === "loess" || base.method === "loess") {
      for (const key of [
        "confidenceMethod", "level", "confidence", "interval"
      ]) delete base[key];
    }
  }
  return normalizeRegressionTransform({ ...base, ...patch, method });
}

function normalizeTimeUnitEdit(transform, patch) {
  const base = { ...requestedOptions(transform) };
  const unit = patch.unit ?? base.unit;
  if (unit !== "week" && unit !== base.unit) {
    delete base.weekStartsOn;
    delete base.weekRule;
  }
  return normalizeTimeUnitTransform({ ...base, ...patch, unit });
}

function fixedRoles(as, roles) {
  return Object.fromEntries(roles.flatMap(role =>
    typeof as?.[role] === "string" ? [[role, as[role]]] : []
  ));
}

function uniqueRoles(values, key, field = "as") {
  const counts = new Map();
  for (const value of values) {
    const role = key(value);
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return Object.fromEntries(values.flatMap(value => {
    const role = key(value);
    return counts.get(role) === 1 && typeof value[field] === "string"
      ? [[role, value[field]]]
      : [];
  }));
}

function summaryOutputRoles(transform) {
  return {
    ...uniqueRoles(
      transform.aggregates,
      aggregate => `aggregate:${JSON.stringify(aggregate.op)}:${aggregate.field ?? ""}`
    ),
    ...(typeof transform.members === "string"
      ? { members: transform.members }
      : {})
  };
}

function windowOutputRoles(transform) {
  return uniqueRoles(
    transform.operations,
    operation => [
      "operation",
      operation.op,
      operation.field ?? "",
      operation.offset ?? "",
      JSON.stringify(operation.frame ?? null)
    ].join(":"),
    "as"
  );
}

function facetHorizonTransform(transform, { scales = {} } = {}) {
  if (
    transform.extent !== "auto" ||
    (scales.y ?? "shared") !== "shared" ||
    !Array.isArray(transform.resolved?.extents)
  ) return transform;
  let extent = -Infinity;
  for (const item of transform.resolved.extents) {
    extent = Math.max(extent, item.extent);
  }
  if (!(extent > 0)) return transform;
  return {
    ...requestedHorizonTransform(transform),
    extent
  };
}

const TRANSFORM_POLICIES = Object.freeze({
  bin: Object.freeze({
    ...findTransformTopology("bin"),
    validate: validateBinTransform,
    materializeOp: "materializeBinData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeBinEdit,
    outputRoles: transform => fixedRoles(
      transform.as,
      ["lower", "upper", "count", "members"]
    )
  }),
  bin2d: Object.freeze({
    ...findTransformTopology("bin2d"),
    validate: validateBin2DTransform,
    materializeOp: "materializeBin2DData",
    replayTransform: requestedBin2DTransform,
    editable: true,
    normalizeEdit: normalizeBin2DEdit,
    outputRoles: transform => fixedRoles(
      transform.as,
      ["x0", "x1", "y0", "y1", "count", "members"]
    )
  }),
  computed: Object.freeze({
    ...findTransformTopology("computed"),
    validate: validateComputedTransform,
    materializeOp: "materializeComputedData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeSimple(normalizeComputedTransform),
    outputRoles: transform => ({ value: transform.as })
  }),
  complete: Object.freeze({
    ...findTransformTopology("complete"),
    validate: validateCompleteTransform,
    materializeOp: "materializeCompleteData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeCompleteEdit,
    outputRoles: transform => typeof transform.members === "string"
      ? { members: transform.members }
      : {}
  }),
  boxOutlier: Object.freeze({
    ...findTransformTopology("boxOutlier"),
    validate: validateBoxTransform,
    materializeOp: "materializeBoxOutlierData"
  }),
  boxSummary: Object.freeze({
    ...findTransformTopology("boxSummary"),
    validate: validateBoxTransform,
    materializeOp: "materializeBoxSummaryData"
  }),
  density: Object.freeze({
    ...findTransformTopology("density"),
    validate: validateDensityTransform,
    materializeOp: "materializeDensityData",
    replayTransform: requestedDensityTransform,
    editable: true,
    normalizeEdit: normalizeSimple(normalizeDensityTransform),
    outputRoles: transform => ({
      value: transform.as[0],
      density: transform.as[1]
    })
  }),
  ecdf: Object.freeze({
    ...findTransformTopology("ecdf"),
    validate: validateECDFTransform,
    materializeOp: "materializeECDFData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeSimple(normalizeECDFTransform),
    outputRoles: transform => fixedRoles(
      transform.as,
      ["value", "cumulative", "probability"]
    )
  }),
  filter: Object.freeze({
    ...findTransformTopology("filter"),
    validate: validateFilterTransform,
    materializeOp: "materializeFilteredData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeFilterEdit,
    outputRoles: () => ({})
  }),
  fold: Object.freeze({
    ...findTransformTopology("fold"),
    validate: validateFoldTransform,
    materializeOp: "materializeFoldData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeSimple(normalizeFoldTransform),
    outputRoles: transform => fixedRoles(transform.as, ["key", "value"])
  }),
  gradientProfile: Object.freeze({
    ...findTransformTopology("gradientProfile"),
    validate: validateGradientProfileTransform,
    materializeOp: "materializeGradientProfileData",
    replayTransform: requestedGradientProfileTransform
  }),
  horizon: Object.freeze({
    ...findTransformTopology("horizon"),
    validate: validateHorizonTransform,
    materializeOp: "materializeHorizonData",
    replayTransform: requestedHorizonTransform,
    facetReplayTransform: facetHorizonTransform
  }),
  interval: Object.freeze({
    ...findTransformTopology("interval"),
    validate: validateIntervalTransform,
    materializeOp: "materializeIntervalData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeIntervalEdit,
    outputRoles: transform => fixedRoles(
      transform.as,
      ["center", "lower", "upper"]
    )
  }),
  impute: Object.freeze({
    ...findTransformTopology("impute"),
    validate: validateImputeTransform,
    materializeOp: "materializeImputedData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeImputeEdit,
    outputRoles: () => ({})
  }),
  markFilter: Object.freeze({
    ...findTransformTopology("markFilter"),
    validate: validateMarkFilterTransform,
    materializeOp: "materializeMarkFilteredData"
  }),
  normalize: Object.freeze({
    ...findTransformTopology("normalize"),
    validate: validateNormalizeTransform,
    materializeOp: "materializeNormalizedData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeNormalizeEdit,
    outputRoles: transform => ({ value: transform.as })
  }),
  regression: Object.freeze({
    ...findTransformTopology("regression"),
    validate: validateRegressionTransform,
    materializeOp: "materializeRegressionData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeRegressionEdit,
    outputRoles: () => ({})
  }),
  summary: Object.freeze({
    ...findTransformTopology("summary"),
    validate: validateSummaryTransform,
    materializeOp: "materializeSummaryData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeSimple(normalizeSummaryTransform),
    outputRoles: summaryOutputRoles
  }),
  stack: Object.freeze({
    ...findTransformTopology("stack"),
    validate: validateStackTransform,
    materializeOp: "materializeStackData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeSimple(normalizeStackTransform),
    outputRoles: transform => fixedRoles(
      transform.as,
      ["start", "end", "value", "share"]
    )
  }),
  timeUnit: Object.freeze({
    ...findTransformTopology("timeUnit"),
    validate: validateTimeUnitTransform,
    materializeOp: "materializeTimeUnitData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeTimeUnitEdit,
    outputRoles: transform => ({ value: transform.as })
  }),
  window: Object.freeze({
    ...findTransformTopology("window"),
    validate: validateWindowTransform,
    materializeOp: "materializeWindowData",
    replayTransform: requestedTransform,
    editable: true,
    normalizeEdit: normalizeSimple(normalizeWindowTransform),
    outputRoles: windowOutputRoles
  })
});

export function findTransformPolicy(type) {
  return TRANSFORM_POLICIES[type];
}

export function findTransformValidator(type) {
  return findTransformPolicy(type)?.validate;
}

export function requestedDatasetTransform(transform) {
  if (!isPlainObject(transform)) {
    throw new TypeError("Requested dataset transform must be a plain object.");
  }
  const policy = findTransformPolicy(transform.type);
  if (policy?.editable !== true) {
    throw new Error(`Dataset transform "${transform.type ?? "unknown"}" is not editable.`);
  }
  return policy.replayTransform?.(transform) ?? requestedTransform(transform);
}

export function normalizeDatasetTransformEdit(transform, patch, owner) {
  const policy = findTransformPolicy(transform?.type);
  if (policy?.editable !== true || typeof policy.normalizeEdit !== "function") {
    throw new Error(`Dataset transform "${transform?.type ?? "unknown"}" is not editable.`);
  }
  return policy.normalizeEdit(transform, patch, owner);
}

export function datasetTransformOutputRoles(transform) {
  const policy = findTransformPolicy(transform?.type);
  return policy?.outputRoles?.(transform) ?? {};
}

export function validateDatasetTransforms(value) {
  if (!Array.isArray(value) || value.length !== 1 || !isPlainObject(value[0])) {
    throw new TypeError(
      "Dataset transform must contain exactly one plain object."
    );
  }
  for (const transform of value) {
    const validate = findTransformValidator(transform.type);
    if (validate === undefined) {
      throw new Error(`Unsupported dataset transform "${transform.type}".`);
    }
    validate(transform);
  }
  return value;
}
