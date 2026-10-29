import { cloneAndFreeze } from "../core/immutable.js";
import { encodeRowKey } from "../core/itemIdentity.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";

export function resolveWaterfallValues(input) {
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Waterfall item count");
  ownArray(input, "Waterfall items");
  const keys = new Set();
  let running = 0, work = input.length * 32;
  validateWorkLimit(work, "Waterfall work");
  const items = input.map((row, sourceIndex) => {
    ownRecord(row, "Waterfall item");
    rejectUnknownProperties(row, ["key", "role", "value", "reset"], "waterfall item");
    const token = encodeRowKey(row.key);
    validateWorkLimit(work += token.length, "Waterfall work");
    if (keys.has(token)) throw new TypeError("Waterfall item keys must be unique.");
    keys.add(token);
    if (!["delta", "total", "subtotal"].includes(row.role)) throw new TypeError("Waterfall role must be explicit delta, total or subtotal.");
    if (Object.hasOwn(row, "reset") && (row.role === "delta" || typeof row.reset !== "boolean")) throw new TypeError("Waterfall reset must be a boolean on a total or subtotal.");
    if (row.role === "subtotal" && Object.hasOwn(row, "value")) throw new TypeError("Waterfall subtotal cannot specify a value.");
    if ((row.role === "delta" || Object.hasOwn(row, "value")) && !Number.isFinite(row.value)) throw new TypeError("Waterfall values must be finite.");
    const runningBefore = running;
    const value = row.role === "subtotal" || row.role === "total" && !Object.hasOwn(row, "value") ? running : row.value;
    const start = row.role === "delta" ? running : 0, end = row.role === "delta" ? running + value : value;
    if (!Number.isFinite(end)) throw new RangeError(`Waterfall accumulation is not finite at item ${sourceIndex}.`);
    if (row.role === "delta") running = end;
    else if (row.reset === true) running = 0;
    return { key: row.key, sourceIndex, role: row.role, value, start, end, runningBefore, runningAfter: running };
  });
  return cloneAndFreeze({ items, running });
}
