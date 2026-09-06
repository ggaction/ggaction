export const SCALE_ROLES = Object.freeze({
  quantitativePosition: "quantitative-position",
  temporalPosition: "temporal-position",
  bandPosition: "band-position",
  pointPosition: "point-position",
  discreteAppearance: "discrete-appearance",
  continuousColor: "continuous-color",
  discretizedColor: "discretized-color"
});

export const SCALE_TYPES_BY_ROLE = Object.freeze({
  [SCALE_ROLES.quantitativePosition]: Object.freeze([
    "linear", "log", "pow", "sqrt", "symlog"
  ]),
  [SCALE_ROLES.temporalPosition]: Object.freeze(["time"]),
  [SCALE_ROLES.bandPosition]: Object.freeze(["band"]),
  [SCALE_ROLES.pointPosition]: Object.freeze(["point"]),
  [SCALE_ROLES.discreteAppearance]: Object.freeze(["ordinal"]),
  [SCALE_ROLES.continuousColor]: Object.freeze(["sequential"]),
  [SCALE_ROLES.discretizedColor]: Object.freeze([
    "quantize", "quantile", "threshold"
  ])
});

export const COMPLETE_SCALE_TYPES = Object.freeze([
  ...new Set(Object.values(SCALE_TYPES_BY_ROLE).flat())
]);

const SCALE_PROPERTY_TYPES = Object.freeze({
  midpoint: Object.freeze(["sequential"]),
  nice: Object.freeze(["linear", "log", "pow", "sqrt", "symlog", "time"]),
  zero: Object.freeze(["linear", "pow", "sqrt", "symlog"]),
  clamp: Object.freeze([
    "linear", "log", "pow", "sqrt", "symlog", "time", "sequential",
    "quantize"
  ]),
  base: Object.freeze(["log"]),
  exponent: Object.freeze(["pow"]),
  constant: Object.freeze(["symlog"]),
  paddingInner: Object.freeze(["band"]),
  paddingOuter: Object.freeze(["band"]),
  padding: Object.freeze(["point"]),
  align: Object.freeze(["band", "point"])
});

export function validateCompleteScaleType(type) {
  if (!COMPLETE_SCALE_TYPES.includes(type)) {
    throw new Error(`Unsupported scale type "${type}".`);
  }
  return type;
}

export function isDiscretePositionScaleType(type) {
  return type === "band" || type === "point";
}

export function isContinuousPositionScaleType(type) {
  return (
    SCALE_TYPES_BY_ROLE[SCALE_ROLES.quantitativePosition].includes(type) ||
    SCALE_TYPES_BY_ROLE[SCALE_ROLES.temporalPosition].includes(type)
  );
}

export function isOrdinalScaleType(type) {
  return type === "ordinal";
}

export function hasOrdinalDomain(type) {
  return isOrdinalScaleType(type) || isDiscretePositionScaleType(type);
}

export function isContinuousColorScaleType(type) {
  return SCALE_TYPES_BY_ROLE[SCALE_ROLES.continuousColor].includes(type);
}

export function isDiscretizedColorScaleType(type) {
  return SCALE_TYPES_BY_ROLE[SCALE_ROLES.discretizedColor].includes(type);
}

export function isColorScaleType(type) {
  return isContinuousColorScaleType(type) || isDiscretizedColorScaleType(type);
}

export function validateScaleTypeForRole(type, role) {
  const accepted = SCALE_TYPES_BY_ROLE[role];
  if (accepted === undefined) {
    throw new Error(`Unknown scale role "${role}".`);
  }
  if (!accepted.includes(type)) {
    throw new Error(`Scale type "${type}" is not valid for ${role}.`);
  }
  return type;
}

export function validateScalePropertyForType(type, property) {
  validateCompleteScaleType(type);
  const accepted = SCALE_PROPERTY_TYPES[property];
  if (accepted === undefined) return property;
  if (!accepted.includes(type)) {
    throw new Error(`Scale type "${type}" does not support ${property}.`);
  }
  return property;
}
