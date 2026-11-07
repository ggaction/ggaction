import { freezeOwned, isOwned } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { MAX_HIT_INDEX_WORK } from "../grammar/hitIndex.js";

export function interactionOptions(value, required, optional, label) {
  ownRecord(value, label);
  if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw new TypeError(`${label} contains unsupported or missing options.`);
  }
  return Object.assign(Object.create(null), value);
}

// Frames and queued commands cross the same bounded plain-data boundary.
// Snapshot before callbacks can mutate the caller's arrays or nested records.
export function snapshotInteractionInput(input, label) {
  let work = 0;
  const spend = amount => { if ((work += amount) > MAX_HIT_INDEX_WORK) throw new RangeError(`${label} exceeds its snapshot work budget.`); };
  const ancestors = new WeakSet(), pending = [];
  const copy = value => {
    spend(1);
    if (typeof value === "string") spend(value.length);
    if (value === null || typeof value !== "object") {
      if (!["undefined", "number", "string", "boolean"].includes(typeof value) && value !== null) throw new TypeError(`${label} requires plain data.`);
      return value;
    }
    if (isOwned(value)) return value;
    if (ancestors.has(value)) throw new TypeError(`${label} cannot contain cycles.`);
    const array = Array.isArray(value);
    if (array) { spend(value.length); ownArray(value, `${label} array`); }
    else ownRecord(value, `${label} record`);
    const entries = Object.entries(value), output = array ? [] : Object.create(null);
    spend(entries.length); ancestors.add(value); pending.push({ input: value, output, entries, cursor: 0 });
    return output;
  };
  const result = copy(input);
  while (pending.length) {
    const frame = pending.at(-1);
    if (frame.cursor === frame.entries.length) { freezeOwned(frame.output); ancestors.delete(frame.input); pending.pop(); }
    else { const [key, value] = frame.entries[frame.cursor++]; spend(key.length); frame.output[key] = copy(value); }
  }
  return result;
}

export function interactionOrigin(value = "programmatic") {
  if (!["user", "programmatic", "replay", "linked"].includes(value)) throw new TypeError("Unknown interaction command origin.");
  return value;
}

// Callers first close and snapshot their own command envelope.
export function interactionTransactionMetadata(request, generatedId) {
  const transactionId = request.transactionId === undefined ? generatedId : request.transactionId;
  for (const id of [transactionId, request.causeTransactionId].filter(id => id !== undefined)) {
    if (typeof id !== "string" || !id.length || id.length > 1024) throw new TypeError("Transaction IDs require 1 to 1024 characters.");
  }
  return { transactionId, origin: interactionOrigin(request.origin),
    ...(request.causeTransactionId === undefined ? {} : { causeTransactionId: request.causeTransactionId }) };
}
