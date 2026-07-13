import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const POSITION_CHANNELS = new Set(["x", "y"]);

export const TABLEAU10 = cloneAndFreeze([
  "#4c78a8",
  "#f58518",
  "#e45756",
  "#72b7b2",
  "#54a24b",
  "#eeca3b",
  "#b279a2",
  "#ff9da6",
  "#9d755d",
  "#bab0ac"
]);

export const DASH10 = cloneAndFreeze([
  [],
  [8, 4],
  [3, 3],
  [12, 4],
  [8, 3, 2, 3],
  [12, 3, 3, 3],
  [2, 2],
  [10, 3, 2, 3, 2, 3],
  [14, 4, 4, 4],
  [6, 2, 2, 2]
]);

function validatePair(value, label) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite)
  ) {
    throw new TypeError(`${label} must be "auto" or two finite numbers.`);
  }

  return cloneAndFreeze(value);
}

export function validatePositionChannel(channel) {
  if (!POSITION_CHANNELS.has(channel)) {
    throw new Error(`Unknown position channel "${channel}".`);
  }

  return channel;
}

export function validateFieldType(fieldType) {
  if (fieldType !== "quantitative" && fieldType !== "temporal") {
    throw new Error(`Unsupported field type "${fieldType}".`);
  }

  return fieldType;
}

export function validateNominalFieldType(fieldType) {
  if (fieldType !== "nominal") {
    throw new Error(`Unsupported color field type "${fieldType}".`);
  }

  return fieldType;
}

export function validateScaleType(type) {
  if (type !== "linear" && type !== "ordinal" && type !== "time") {
    throw new Error(`Unsupported scale type "${type}".`);
  }

  return type;
}

export function validateSemanticScaleType(type) {
  if (type !== "linear" && type !== "ordinal" && type !== "time") {
    throw new Error(`Unsupported scale type "${type}".`);
  }

  return type;
}

export function validateSemanticFieldType(fieldType) {
  if (!new Set(["quantitative", "nominal", "ordinal", "temporal"]).has(fieldType)) {
    throw new Error(`Unsupported semantic field type "${fieldType}".`);
  }

  return fieldType;
}

export function validateLinearScaleType(type) {
  if (type !== "linear") {
    throw new Error(`Unsupported position scale type "${type}".`);
  }

  return type;
}

export function validateTimeScaleType(type) {
  if (type !== "time") {
    throw new Error(`Unsupported temporal scale type "${type}".`);
  }

  return type;
}

export function validateOrdinalScaleType(type) {
  if (type !== "ordinal") {
    throw new Error(`Unsupported color scale type "${type}".`);
  }

  return type;
}

export function validateScaleDomain(domain) {
  return domain === "auto" ? domain : validatePair(domain, "Scale domain");
}

export function validateScaleRange(range) {
  return range === "auto" ? range : validatePair(range, "Scale range");
}

function isNominalValue(value) {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function validateOrdinalDomain(domain) {
  if (domain === "auto") {
    return domain;
  }

  if (
    !Array.isArray(domain) ||
    domain.length === 0 ||
    !domain.every(isNominalValue) ||
    new Set(domain).size !== domain.length
  ) {
    throw new TypeError(
      "Ordinal domain must be \"auto\" or unique nominal values."
    );
  }

  return cloneAndFreeze(domain);
}

export function validateColorRange(range) {
  if (range === "auto") {
    return range;
  }

  if (Array.isArray(range)) {
    if (
      range.length === 0 ||
      !range.every(color => typeof color === "string" && color.length > 0)
    ) {
      throw new TypeError("Color range must contain non-empty color strings.");
    }

    return cloneAndFreeze(range);
  }

  if (
    !isPlainObject(range) ||
    Object.keys(range).length !== 1 ||
    range.palette !== "tableau10"
  ) {
    throw new Error('Color range palette must be "tableau10".');
  }

  return cloneAndFreeze(range);
}

function isDashPattern(pattern) {
  return (
    Array.isArray(pattern) &&
    pattern.length % 2 === 0 &&
    pattern.every(value => Number.isFinite(value) && value >= 0)
  );
}

export function validateStrokeDashRange(range) {
  if (range === "auto") {
    return range;
  }

  if (
    !Array.isArray(range) ||
    range.length === 0 ||
    !range.every(isDashPattern)
  ) {
    throw new TypeError(
      "StrokeDash range must contain one or more even-length non-negative finite patterns."
    );
  }

  return cloneAndFreeze(range);
}

export function validateOrdinalRange(range) {
  if (range === "auto") return range;

  if (Array.isArray(range) && range.every(item => typeof item === "string")) {
    return validateColorRange(range);
  }

  if (Array.isArray(range) && range.every(Array.isArray)) {
    return validateStrokeDashRange(range);
  }

  return validateColorRange(range);
}

export function validateSemanticScaleDomain(domain) {
  if (domain === "auto") {
    return domain;
  }

  if (!Array.isArray(domain) || domain.length === 0) {
    throw new TypeError("Scale domain must be \"auto\" or a non-empty array.");
  }

  return cloneAndFreeze(domain);
}

export function validateSemanticScaleRange(range) {
  if (range === "auto") {
    return range;
  }

  if (Array.isArray(range) && range.length > 0) {
    return cloneAndFreeze(range);
  }

  if (isPlainObject(range) && range.palette === "tableau10") {
    return cloneAndFreeze(range);
  }

  throw new TypeError("Scale range has an unsupported value.");
}

export function readQuantitativeField(rows, field) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Encoding field must be a non-empty string.");
  }

  return cloneAndFreeze(
    rows.map((row, index) => {
      if (!Object.hasOwn(row, field) || !Number.isFinite(row[field])) {
        throw new TypeError(
          `Field "${field}" must contain a finite number at row ${index}.`
        );
      }

      return row[field];
    })
  );
}

function normalizeTemporalValue(value, field, index) {
  const timestamp = typeof value === "string" ? Date.parse(value) : value;

  if (!Number.isFinite(timestamp)) {
    throw new TypeError(
      `Field "${field}" must contain a temporal string or finite timestamp at row ${index}.`
    );
  }

  return timestamp;
}

export function readTemporalField(rows, field) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Encoding field must be a non-empty string.");
  }

  return cloneAndFreeze(
    rows.map((row, index) => {
      if (!Object.hasOwn(row, field)) {
        throw new TypeError(
          `Field "${field}" must contain a temporal string or finite timestamp at row ${index}.`
        );
      }

      return normalizeTemporalValue(row[field], field, index);
    })
  );
}

export function readNominalField(rows, field) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Encoding field must be a non-empty string.");
  }

  return cloneAndFreeze(
    rows.map((row, index) => {
      if (!Object.hasOwn(row, field) || !isNominalValue(row[field])) {
        throw new TypeError(
          `Field "${field}" must contain a nominal value at row ${index}.`
        );
      }

      return row[field];
    })
  );
}

export function resolveOrdinalDomain(domain, values) {
  const validated = validateOrdinalDomain(domain);

  if (validated !== "auto") {
    return validated;
  }

  if (values.length === 0) {
    throw new Error("Cannot infer an automatic ordinal domain from no values.");
  }

  return cloneAndFreeze([...new Set(values)]);
}

export function resolveColorRange(range) {
  const validated = validateColorRange(range);

  if (validated === "auto" || !Array.isArray(validated)) {
    return TABLEAU10;
  }

  return validated;
}

export function resolveStrokeDashRange(range) {
  const validated = validateStrokeDashRange(range);
  return validated === "auto" ? DASH10 : validated;
}

export function mapOrdinalValues(values, domain, range) {
  const indices = new Map(domain.map((value, index) => [value, index]));

  return cloneAndFreeze(
    values.map(value => {
      const index = indices.get(value);

      if (index === undefined) {
        throw new Error(`Value "${value}" is outside the ordinal domain.`);
      }

      return range[index % range.length];
    })
  );
}

export function resolveScaleDomain(domain, values) {
  const validated = validateScaleDomain(domain);

  if (validated !== "auto") {
    return validated;
  }

  if (values.length === 0) {
    throw new Error("Cannot infer an automatic scale domain from no values.");
  }

  let minimum = values[0];
  let maximum = values[0];

  for (const value of values.slice(1)) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }

  return cloneAndFreeze([minimum, maximum]);
}

function niceLinearStep(span, count = 5) {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = fraction <= 1
    ? 1
    : fraction <= 2
      ? 2
      : fraction <= 3
        ? 3
        : fraction <= 5
          ? 5
          : 10;
  return factor * power;
}

function niceLinearDomain(domain) {
  const [minimum, maximum] = domain;

  if (minimum === maximum) {
    return domain;
  }

  const step = niceLinearStep(maximum - minimum);
  return cloneAndFreeze([
    Math.floor(minimum / step) * step,
    Math.ceil(maximum / step) * step
  ]);
}

const TIME_UNITS = [
  { span: 2 * 365 * 24 * 60 * 60 * 1000, unit: "year" },
  { span: 60 * 24 * 60 * 60 * 1000, unit: "month" },
  { span: 2 * 24 * 60 * 60 * 1000, unit: "day" },
  { span: 2 * 60 * 60 * 1000, unit: "hour" },
  { span: 2 * 60 * 1000, unit: "minute" },
  { span: 0, unit: "second" }
];

function floorUtc(timestamp, unit) {
  const date = new Date(timestamp);

  if (unit === "year") return Date.UTC(date.getUTCFullYear(), 0, 1);
  if (unit === "month") return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  if (unit === "day") {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  if (unit === "hour") {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours()
    );
  }
  if (unit === "minute") {
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes()
    );
  }

  return Math.floor(timestamp / 1000) * 1000;
}

function offsetUtc(timestamp, unit) {
  const date = new Date(timestamp);

  if (unit === "year") return Date.UTC(date.getUTCFullYear() + 1, 0, 1);
  if (unit === "month") {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  if (unit === "day") return timestamp + 24 * 60 * 60 * 1000;
  if (unit === "hour") return timestamp + 60 * 60 * 1000;
  if (unit === "minute") return timestamp + 60 * 1000;
  return timestamp + 1000;
}

function niceTimeDomain(domain) {
  const [minimum, maximum] = domain;

  if (minimum === maximum) {
    return domain;
  }

  const unit = TIME_UNITS.find(item => maximum - minimum >= item.span).unit;
  const start = floorUtc(minimum, unit);
  const endFloor = floorUtc(maximum, unit);
  const end = endFloor === maximum ? maximum : offsetUtc(endFloor, unit);

  return cloneAndFreeze([start, end]);
}

export function resolveContinuousDomain({
  domain,
  values,
  type,
  nice,
  zero
}) {
  const explicit = domain !== "auto";
  let resolved = resolveScaleDomain(domain, values);

  if (explicit) {
    return resolved;
  }

  if (zero === true) {
    resolved = cloneAndFreeze([
      Math.min(0, resolved[0]),
      Math.max(0, resolved[1])
    ]);
  }

  if (nice === true) {
    resolved = type === "time"
      ? niceTimeDomain(resolved)
      : niceLinearDomain(resolved);
  }

  return resolved;
}

export function resolveScaleRange(range, channel, bounds) {
  const validated = validateScaleRange(range);
  validatePositionChannel(channel);

  if (validated !== "auto") {
    return validated;
  }

  if (
    !isPlainObject(bounds) ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
  ) {
    throw new Error("Automatic position range requires graphical bounds.");
  }

  if (channel === "x") {
    return cloneAndFreeze([bounds.x, bounds.x + bounds.width]);
  }

  return cloneAndFreeze([bounds.y + bounds.height, bounds.y]);
}

export function mapLinearValues(values, domain, range) {
  const [domainStart, domainEnd] = validatePair(domain, "Resolved domain");
  const [rangeStart, rangeEnd] = validatePair(range, "Resolved range");

  if (!values.every(Number.isFinite)) {
    throw new TypeError("Linear scale values must be finite numbers.");
  }

  if (domainStart === domainEnd) {
    const midpoint = (rangeStart + rangeEnd) / 2;
    return cloneAndFreeze(values.map(() => midpoint));
  }

  const domainSpan = domainEnd - domainStart;
  const rangeSpan = rangeEnd - rangeStart;

  return cloneAndFreeze(
    values.map(
      value => rangeStart + ((value - domainStart) / domainSpan) * rangeSpan
    )
  );
}
