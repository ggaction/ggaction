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
