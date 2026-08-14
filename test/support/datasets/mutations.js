function hashSeed(seed) {
  if (typeof seed !== "string" || seed.length === 0) {
    throw new TypeError("Dataset mutation seed must be a non-empty string.");
  }
  let hash = 2166136261;
  for (const codePoint of seed) {
    hash ^= codePoint.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createDeterministicRandom(seed) {
  let state = hashSeed(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function shuffleRows(rows, seed) {
  if (!Array.isArray(rows)) throw new TypeError("Dataset mutation requires rows.");
  const random = createDeterministicRandom(seed);
  const result = structuredClone(rows);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function duplicateRows(rows, every = 3) {
  if (!Array.isArray(rows) || !Number.isInteger(every) || every <= 0) {
    throw new TypeError("Row duplication requires rows and a positive cadence.");
  }
  return rows.flatMap((row, index) => index % every === 0
    ? [structuredClone(row), structuredClone(row)]
    : [structuredClone(row)]
  );
}

export function injectMissing(rows, fields, { every = 5, value = null } = {}) {
  if (
    !Array.isArray(rows) || !Array.isArray(fields) || fields.length === 0 ||
    !fields.every(field => typeof field === "string" && field.length > 0) ||
    !Number.isInteger(every) || every <= 0
  ) {
    throw new TypeError("Missing-value mutation requires rows, fields, and cadence.");
  }
  return rows.map((row, index) => {
    const next = structuredClone(row);
    if (index % every === 0) next[fields[index % fields.length]] = value;
    return next;
  });
}

export function scaleNumericFields(rows, fields, factor) {
  if (
    !Array.isArray(rows) || !Array.isArray(fields) || fields.length === 0 ||
    !fields.every(field => typeof field === "string" && field.length > 0) ||
    !Number.isFinite(factor) || factor === 0
  ) {
    throw new RangeError("Numeric mutation factor must be finite and non-zero.");
  }
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    fields.includes(key) && Number.isFinite(value) ? value * factor : structuredClone(value)
  ])));
}

export function renameFields(rows, mapping) {
  if (
    !Array.isArray(rows) || mapping === null || typeof mapping !== "object" ||
    Array.isArray(mapping) ||
    !Object.entries(mapping).every(([from, to]) =>
      from.length > 0 && typeof to === "string" && to.length > 0
    )
  ) {
    throw new TypeError("Field renaming requires rows and a string mapping.");
  }
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [
    mapping[key] ?? key,
    structuredClone(value)
  ])));
}
