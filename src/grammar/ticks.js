import { cloneAndFreeze } from "../core/immutable.js";

const LINEAR_FACTORS = Object.freeze([1, 2, 3, 5]);

export function niceTicks(domain, count) {
  if (!Number.isInteger(count) || count <= 0) throw new RangeError("Tick count must be a positive integer.");
  const low = Math.min(...domain);
  const high = Math.max(...domain);
  if (low === high) return cloneAndFreeze([low]);
  const rough = (high - low) / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const error = rough / power;
  const factor = LINEAR_FACTORS.find(candidate => candidate >= error) ?? 10;
  const step = factor * power;
  const start = Math.ceil(low / step) * step;
  const end = Math.floor(high / step) * step;
  const values = [];
  for (let value = start; value <= end + step * 1e-10; value += step) values.push(+value.toPrecision(12));
  return cloneAndFreeze(values);
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
    !domain.every(Number.isFinite)
  ) {
    throw new TypeError("Time tick domain must contain two finite timestamps.");
  }

  return [Math.min(...domain), Math.max(...domain)];
}

function selectTimeInterval(span, count) {
  return TIME_INTERVALS.reduce((best, candidate) => {
    const error = Math.abs(span / candidate.duration - count);
    return error < best.error ? { ...candidate, error } : best;
  }, { ...TIME_INTERVALS[0], error: Infinity });
}

function floorCalendar(timestamp, { unit, step }) {
  const date = new Date(timestamp);

  if (unit === "year") {
    const year = Math.floor(date.getUTCFullYear() / step) * step;
    return Date.UTC(year, 0, 1);
  }

  if (unit === "month") {
    const month = date.getUTCFullYear() * 12 + date.getUTCMonth();
    const aligned = Math.floor(month / step) * step;
    return Date.UTC(Math.floor(aligned / 12), aligned % 12, 1);
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

function addCalendar(timestamp, { unit, step }) {
  const date = new Date(timestamp);

  if (unit === "year") {
    return Date.UTC(date.getUTCFullYear() + step, 0, 1);
  }

  if (unit === "month") {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + step, 1);
  }

  const duration = unit === "day"
    ? step * DAY
    : unit === "hour"
      ? step * HOUR
      : unit === "minute"
        ? step * MINUTE
        : step * SECOND;

  return timestamp + duration;
}

export function timeTicks(domain, count) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Time tick count must be a positive integer.");
  }

  const [low, high] = validateTimeDomain(domain);
  if (low === high) return cloneAndFreeze([low]);
  const interval = selectTimeInterval(high - low, count);
  let value = floorCalendar(low, interval);
  if (value < low) value = addCalendar(value, interval);
  const values = [];

  while (value <= high) {
    values.push(value);
    value = addCalendar(value, interval);
  }

  return cloneAndFreeze(values.length === 0 ? [low, high] : values);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatTimeTick(value, domain) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Time tick value must be a finite timestamp.");
  }

  const [low, high] = validateTimeDomain(domain);
  const span = high - low;
  const date = new Date(value);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());

  if (span >= 2 * YEAR) return year;
  if (span >= 60 * DAY) return `${year}-${month}`;
  if (span >= 2 * DAY) return `${year}-${month}-${day}`;
  if (span >= 2 * HOUR) return `${year}-${month}-${day} ${hour}:00`;
  if (span >= 2 * MINUTE) return `${hour}:${minute}`;
  return `${hour}:${minute}:${second}`;
}
