import { cloneAndFreeze } from "../core/immutable.js";
import {
  MAX_GENERATED_ITEMS,
  validateGeneratedItemLimit
} from "../core/validation.js";
import {
  alignNumericStep,
  cleanNumericValue,
  nearestNumericIncrement,
  niceNumericStep,
  normalizeNumericRange
} from "./numeric.js";
import { utcTimestamp, validTimestamp } from "./timeUnit.js";

function ticksForStep(start, end, step, low, high, scale) {
  const length = Math.floor((end - start) / step + 1e-10) + 1;
  if (!Number.isFinite(length) || length <= 0) return undefined;
  const size = Math.min(length, MAX_GENERATED_ITEMS);
  const values = [];
  for (let index = 0; index < size; index += 1) {
    const tick = length === size || size === 1
      ? index
      : Math.round(index * (length - 1) / (size - 1));
    const raw = start + tick * step;
    const value = scale === undefined
      ? Number(raw.toPrecision(12))
      : cleanNumericValue(raw * scale, step * scale);
    if (
      !Number.isFinite(value) || value < low || value > high ||
      (values.length > 0 && value <= values.at(-1))
    ) {
      if (scale === undefined) return undefined;
    } else {
      values.push(value);
    }
  }
  return values;
}

export function validateTickRounding(rounding, optional = true) {
  if ((!optional || rounding !== undefined) && !["ceiling", "nearest"].includes(rounding)) {
    throw new TypeError('Tick rounding must be "ceiling" or "nearest".');
  }
}

export function validateTickSelectionRounding(config, scaleType) {
  validateTickRounding(config.rounding, !Object.hasOwn(config, "rounding"));
  if (config.rounding !== undefined && (config.mode !== "count" || scaleType !== "linear")) {
    throw new Error("Tick rounding requires an automatic linear Cartesian axis.");
  }
  if (config.rounding !== undefined) {
    if (!Number.isInteger(config.count) || config.count <= 0) {
      throw new RangeError("Tick rounding count must be a positive integer.");
    }
    validateGeneratedItemLimit(config.count, "Tick rounding count");
  }
}

export function axisTickSelection(config) {
  return config.mode === "values" ? { mode: "values", values: config.values } : {
    mode: "count", count: config.count,
    ...(config.rounding === "nearest" ? { rounding: "nearest" } : {})
  };
}

function nearestTicks(low, high, count) {
  let start = low, end = high, scale = 1;
  let increment = nearestNumericIncrement(end - start, count);
  if (increment === null) {
    const normalized = normalizeNumericRange(low, high);
    ({ start, end, scale } = normalized);
    increment = nearestNumericIncrement(normalized.span, count);
  }
  if (increment === null) return cloneAndFreeze([low, high]);
  const first = Math.ceil(increment < 0 ? start * -increment : start / increment);
  const last = Math.floor(increment < 0 ? end * -increment : end / increment);
  const length = last - first + 1;
  if (!Number.isFinite(length) || length <= 0) return cloneAndFreeze([low, high]);
  const size = Math.min(length, MAX_GENERATED_ITEMS), values = [];
  for (let index = 0; index < size; index++) {
    const offset = length === size ? index : Math.round(index * (length - 1) / (size - 1));
    const at = first + offset;
    const value = (increment < 0 ? at / -increment : at * increment) * scale;
    if (Number.isFinite(value) && value >= low && value <= high &&
        (values.length === 0 || value > values.at(-1))) values.push(value === 0 ? 0 : value);
  }
  return cloneAndFreeze(values.length > 0 ? values : [low, high]);
}

export function niceTicks(domain, count, rounding = "ceiling") {
  validateTickRounding(rounding);
  if (!Number.isInteger(count) || count <= 0) throw new RangeError("Tick count must be a positive integer.");
  const effectiveCount = Math.min(count, MAX_GENERATED_ITEMS);
  const low = Math.min(...domain);
  const high = Math.max(...domain);
  if (low === high) return cloneAndFreeze([low]);
  if (rounding === "nearest") return nearestTicks(low, high, effectiveCount);
  const directSpan = high - low;
  if (Number.isFinite(directSpan) && directSpan > 0) {
    const directStep = niceNumericStep(directSpan, effectiveCount);
    const tolerance = directStep * 1e-10;
    const directStart = Math.ceil((low - tolerance) / directStep) * directStep;
    const directEnd = Math.floor((high + tolerance) / directStep) * directStep;
    const direct = ticksForStep(
      directStart,
      directEnd,
      directStep,
      low,
      high
    );
    if (direct !== undefined && direct.length <= MAX_GENERATED_ITEMS) {
      return cloneAndFreeze(direct);
    }
  }
  const normalized = normalizeNumericRange(low, high);
  const normalizedStep = niceNumericStep(normalized.span, effectiveCount);
  const start = alignNumericStep(normalized.start, normalizedStep, "ceil");
  const end = alignNumericStep(normalized.end, normalizedStep, "floor");
  const values = ticksForStep(
    start,
    end,
    normalizedStep,
    low,
    high,
    normalized.scale
  );
  return cloneAndFreeze(values?.length > 0 ? values : [low, high]);
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365.2425 * DAY;

const TIME_INTERVALS = Object.freeze([
  ...[1, 2, 5, 10].map(step => ({ unit: "year", step, duration: step * YEAR })),
  ...[1, 2, 3, 6].map(step => ({ unit: "month", step, duration: step * YEAR / 12 })),
  ...[1, 2, 7, 14].map(step => ({ unit: "day", step, duration: step * DAY })),
  ...[1, 3, 6, 12].map(step => ({ unit: "hour", step, duration: step * HOUR })),
  ...[1, 5, 15, 30].map(step => ({ unit: "minute", step, duration: step * MINUTE })),
  ...[1, 5, 15, 30].map(step => ({ unit: "second", step, duration: step * SECOND }))
]);

function validateTimeDomain(domain) {
  if (
    !Array.isArray(domain) ||
    domain.length !== 2 ||
    !domain.every(validTimestamp)
  ) {
    throw new TypeError(
      "Time tick domain must contain two finite timestamps representing valid dates."
    );
  }

  return [Math.min(...domain), Math.max(...domain)];
}

function selectTimeInterval(span, count) {
  let interval = TIME_INTERVALS[0];
  let bestError = Infinity;
  for (const candidate of TIME_INTERVALS) {
    const error = Math.abs(span / candidate.duration - count);
    if (error < bestError) {
      interval = candidate;
      bestError = error;
    }
  }
  if (span / interval.duration + 1 > Math.max(count * 10, 100)) {
    const step = niceNumericStep(span / YEAR, count);
    return { unit: "year", step, duration: step * YEAR };
  }
  return interval;
}

function floorCalendar(timestamp, { unit, step }) {
  const date = new Date(timestamp);

  if (unit === "year") {
    const year = Math.floor(date.getUTCFullYear() / step) * step;
    return utcTimestamp(year);
  }

  if (unit === "month") {
    const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
    const aligned = Math.floor(month / step) * step;
    return utcTimestamp(Math.floor(aligned / 12), aligned % 12);
  }

  const duration = unit === "day"
    ? step * DAY
    : unit === "hour"
      ? step * HOUR
      : unit === "minute"
        ? step * MINUTE
        : step * SECOND;

  return Math.floor(timestamp / duration) * duration;
}

function addCalendar(timestamp, interval) {
  if (interval.unit === "year" || interval.unit === "month") {
    const date = new Date(timestamp);
    return utcTimestamp(
      date.getUTCFullYear() + (interval.unit === "year" ? interval.step : 0),
      date.getUTCMonth() + (interval.unit === "month" ? interval.step : 0)
    );
  }
  return timestamp + interval.duration;
}

export function timeTicks(domain, count) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Time tick count must be a positive integer.");
  }
  validateGeneratedItemLimit(count, "Time tick count");

  const [low, high] = validateTimeDomain(domain);
  if (low === high) return cloneAndFreeze([low]);
  const interval = selectTimeInterval(high - low, count);
  let value = floorCalendar(low, interval);
  if (!validTimestamp(value) && interval.unit === "year") {
    const year = new Date(low).getUTCFullYear();
    value = utcTimestamp(Math.ceil(year / interval.step) * interval.step);
  }
  if (value < low) value = addCalendar(value, interval);
  const values = [];

  while (value <= high) {
    if (values.length === MAX_GENERATED_ITEMS) {
      throw new RangeError(
        `Time tick range must generate at most ${MAX_GENERATED_ITEMS} ticks.`
      );
    }
    values.push(value);
    const next = addCalendar(value, interval);
    if (!validTimestamp(next) || next <= value) break;
    value = next;
  }

  return cloneAndFreeze(values.length === 0 ? [low, high] : values);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatYear(value) {
  if (value >= 0 && value <= 9999) return String(value).padStart(4, "0");
  const sign = value < 0 ? "-" : "+";
  return `${sign}${String(Math.abs(value)).padStart(6, "0")}`;
}

function formatTimePrecision(value, precision) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError("Time tick value must represent a valid date.");
  }
  const year = formatYear(date.getUTCFullYear());
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());
  const millisecond = String(date.getUTCMilliseconds()).padStart(3, "0");

  if (precision === 0) return year;
  if (precision === 1) return `${year}-${month}`;
  if (precision === 2) return `${year}-${month}-${day}`;
  if (precision === 3) return `${year}-${month}-${day} ${hour}:${minute}`;
  if (precision === 4) return `${hour}:${minute}`;
  if (precision === 5) return `${hour}:${minute}:${second}`;
  return `${hour}:${minute}:${second}.${millisecond}`;
}

function timePrecision(domain) {
  const [low, high] = validateTimeDomain(domain);
  const span = high - low;

  if (span >= 2 * YEAR) return 0;
  if (span >= 60 * DAY) return 1;
  if (span >= 2 * DAY) return 2;
  if (span >= 2 * HOUR) return 3;
  if (span >= 2 * MINUTE) return 4;
  return 5;
}

export function formatTimeTick(value, domain) {
  if (!validTimestamp(value)) {
    throw new TypeError(
      "Time tick value must be a finite timestamp representing a valid date."
    );
  }
  return formatTimePrecision(value, timePrecision(domain));
}

export function formatTimeTicks(values, domain) {
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError("Time tick values must be finite timestamps.");
  }
  const initial = timePrecision(domain);
  for (let precision = initial; precision <= 6; precision += 1) {
    const labels = values.map(value => formatTimePrecision(value, precision));
    if (new Set(labels).size === new Set(values).size) {
      return cloneAndFreeze(labels);
    }
  }
  return cloneAndFreeze(values.map(value => String(value)));
}
