import { validateGeneratedItemLimit } from "../../core/validation.js";
import { isTransformedScaleType, transformedTicks, mapOrdinalPositionValues, mapContinuousScaleValues } from "../../grammar/scales/index.js";
import { niceTicks, timeTicks, validateTickSelectionRounding } from "../../grammar/ticks.js";

// Read-only guide value selection and mapping shared by native actions, hit
// association and animation preparation. No rematerialization or trace writes.
export function valuesFromTickConfig(program, config) {
  const scale = program.resolvedScales[config.scale];
  validateTickSelectionRounding(config, scale?.type);
  if (config.mode === "values") return config.values;
  if (scale?.type === "time") return timeTicks(scale.domain, config.count);
  if (scale?.type === "linear") return niceTicks(scale.domain, config.count, config.rounding);
  if (isTransformedScaleType(scale?.type)) {
    return transformedTicks(scale.type, scale.domain, config.count, {
      ...(scale.base === undefined ? {} : { base: scale.base }),
      ...(scale.exponent === undefined ? {} : { exponent: scale.exponent }),
      ...(scale.constant === undefined ? {} : { constant: scale.constant })
    });
  }
  throw new Error(
    `Guide values require resolved continuous scale "${config.scale}".`
  );
}

export function resolvePolarTickValues(program, config) {
  const scale = program.resolvedScales[config.scale];
  const discrete = ["ordinal", "band", "point"].includes(scale?.type);
  if (discrete) {
    if (config.mode !== "values") {
      throw new Error("Discrete theta guides require explicit or inferred values.");
    }
    validateGeneratedItemLimit(config.values.length, "Polar guide value count");
    const domain = new Set(scale.domain);
    if (!config.values.every(value => domain.has(value))) {
      throw new RangeError("Polar guide values must be inside the scale domain.");
    }
    return config.values;
  }
  const values = valuesFromTickConfig(program, config);
  validateGeneratedItemLimit(values.length, "Polar guide value count");
  const low = Math.min(...scale.domain);
  const high = Math.max(...scale.domain);
  if (!values.every(value => value >= low && value <= high)) {
    throw new RangeError("Polar guide values must be inside the scale domain.");
  }
  return values;
}

export function mapPolarGuideValues(program, config) {
  const scale = program.resolvedScales[config.scale];
  const values = resolvePolarTickValues(program, config);
  const positions = ["ordinal", "band", "point"].includes(scale.type)
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
  return Object.freeze({ values, positions });
}

// Parallel axes deliberately use their existing numeric tick policy, including
// time-valued dimensions. Keep preparation and native rendering on that owner.
export function resolveParallelTickValues(scale, config, field) {
  const discrete = ["ordinal", "band", "point"].includes(scale.type);
  if (discrete && config.mode === "count") throw new Error("Ordinal Parallel axes use domain values, not count.");
  const values = config.mode === "values" ? config.values : discrete ? scale.domain
    : isTransformedScaleType(scale.type) ? transformedTicks(scale.type, scale.domain, config.count ?? 5, {
      ...(scale.base === undefined ? {} : { base: scale.base }),
      ...(scale.exponent === undefined ? {} : { exponent: scale.exponent }),
      ...(scale.constant === undefined ? {} : { constant: scale.constant })
    }) : niceTicks(scale.domain, config.count ?? 5);
  if (new Set(values).size !== values.length || values.some(value => discrete
    ? !scale.domain.includes(value)
    : !Number.isFinite(value) || value < Math.min(...scale.domain) || value > Math.max(...scale.domain))) {
    throw new Error(`Parallel axis values must be distinct values inside the scale domain for "${field}".`);
  }
  if (config.labelMap !== undefined && !discrete) throw new Error("Parallel labelMap requires a categorical axis.");
  return values;
}
