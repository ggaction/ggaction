import { cloneAndFreeze } from "../../core/immutable.js";
import { utcTimestamp, validTimestamp } from "../timeUnit.js";

const TIME_UNITS = [
  { span: 2 * 365 * 24 * 60 * 60 * 1000, unit: "year" },
  { span: 60 * 24 * 60 * 60 * 1000, unit: "month" },
  { span: 2 * 24 * 60 * 60 * 1000, unit: "day" },
  { span: 2 * 60 * 60 * 1000, unit: "hour" },
  { span: 2 * 60 * 1000, unit: "minute" },
  { span: 0, unit: "second" }
];

function requireTimeDomain(domain) {
  if (
    !Array.isArray(domain) ||
    domain.length !== 2 ||
    !domain.every(validTimestamp)
  ) {
    throw new TypeError(
      "Nice time domain must contain two timestamps representing valid dates."
    );
  }
  return domain;
}

function floorUtc(timestamp, unit) {
  const date = new Date(timestamp);
  if (unit === "year") return utcTimestamp(date.getUTCFullYear());
  if (unit === "month") {
    return utcTimestamp(date.getUTCFullYear(), date.getUTCMonth());
  }
  if (unit === "day") {
    return utcTimestamp(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  }
  if (unit === "hour") {
    return utcTimestamp(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours()
    );
  }
  if (unit === "minute") {
    return utcTimestamp(
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
  if (unit === "year") return utcTimestamp(date.getUTCFullYear() + 1);
  if (unit === "month") {
    return utcTimestamp(date.getUTCFullYear(), date.getUTCMonth() + 1);
  }
  if (unit === "day") return timestamp + 24 * 60 * 60 * 1000;
  if (unit === "hour") return timestamp + 60 * 60 * 1000;
  if (unit === "minute") return timestamp + 60 * 1000;
  return timestamp + 1000;
}

export function niceTimeDomain(domain) {
  const [minimum, maximum] = requireTimeDomain(domain);
  if (minimum === maximum) return domain;
  const unit = TIME_UNITS.find(item => maximum - minimum >= item.span).unit;
  const start = floorUtc(minimum, unit);
  const endFloor = floorUtc(maximum, unit);
  const end = endFloor === maximum ? maximum : offsetUtc(endFloor, unit);
  if (![start, end].every(validTimestamp)) {
    throw new RangeError("Nice time domain exceeds the supported date range.");
  }
  return cloneAndFreeze([start, end]);
}
