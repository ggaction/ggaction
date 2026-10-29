import { cloneAndFreeze } from "../core/immutable.js";
import { encodeRowKey } from "../core/itemIdentity.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";

export function resolveOHLCValues(input, options = {}) {
  ownRecord(options, "OHLC options");
  rejectUnknownProperties(options, ["invalid"], "OHLC");
  const invalid = Object.hasOwn(options, "invalid") ? options.invalid : "error";
  if (!["error", "omit-row"].includes(invalid)) throw new TypeError("OHLC invalid must be error or omit-row.");
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "OHLC item count");
  ownArray(input, "OHLC items");
  const keys = new Set(), items = [], omittedSourceIndices = [];
  let work = input.length * 32;
  validateWorkLimit(work, "OHLC work");
  input.forEach((row, sourceIndex) => {
    ownRecord(row, "OHLC item");
    rejectUnknownProperties(row, ["key", "low", "high", "open", "close"], "OHLC item");
    const token = encodeRowKey(row.key);
    validateWorkLimit(work += token.length, "OHLC work");
    if (keys.has(token)) throw new TypeError("OHLC item keys must be unique.");
    keys.add(token);
    const valid = [row.low, row.high, row.open, row.close].every(Number.isFinite) &&
      row.low <= Math.min(row.open, row.close) && Math.max(row.open, row.close) <= row.high;
    if (!valid) {
      if (invalid === "error") throw new RangeError(`OHLC item ${sourceIndex} requires finite low <= min(open, close) <= max(open, close) <= high.`);
      omittedSourceIndices.push(sourceIndex);
      return;
    }
    items.push({ key: row.key, sourceIndex, low: row.low, high: row.high, open: row.open, close: row.close,
      trend: row.close === row.open ? "flat" : row.close > row.open ? "up" : "down" });
  });
  return cloneAndFreeze({ items, omittedSourceIndices });
}
