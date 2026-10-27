import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const domains = new Set(["numeric", "geometry", "state", "time", "asset"]);

// This format deliberately accepts JSON literals only; typed runtime values have
// dedicated domain assertions. Never silently erase undefined, NaN or class data.
function canonical(value, ancestors = new Set(), depth = 0, budget = { left: 10000 }) {
  if (depth > 64 || --budget.left < 0) throw new Error("Fixture exceeds depth or node limit.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== "object" || ancestors.has(value)) throw new Error("Fixture requires finite, acyclic JSON literals.");
  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Reflect.ownKeys(value).length !== value.length + 1 || Array.from({ length: value.length }, (_, i) => i).some(i => !Object.hasOwn(Object.getOwnPropertyDescriptor(value, i) ?? {}, "value"))) {
      throw new Error("Fixture arrays must be dense and have no extra properties.");
    }
    result = `[${Array.from(value, entry => canonical(entry, ancestors, depth + 1, budget)).join(",")}]`;
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).some(key => typeof key !== "string" || !Object.getOwnPropertyDescriptor(value, key).enumerable || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value"))) {
      throw new Error("Fixture objects must contain plain enumerable data properties.");
    }
    result = `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key], ancestors, depth + 1, budget)}`).join(",")}}`;
  }
  ancestors.delete(value);
  return result;
}

export function fixtureHash(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function toleranceOf(tolerance = { absolute: 0, relative: 0 }) {
  if (!tolerance || Object.keys(tolerance).some(key => !["absolute", "relative"].includes(key)) ||
      ![tolerance.absolute, tolerance.relative].every(value => Number.isFinite(value) && value >= 0)) {
    throw new Error("Tolerance requires finite non-negative absolute and relative values.");
  }
  return tolerance;
}

export function validateFixtures(fixtures) {
  if (!Array.isArray(fixtures) || fixtures.length === 0) throw new Error("Fixtures must be non-empty.");
  canonical(fixtures);
  const ids = new Set();
  for (const fixture of fixtures) {
    if (fixture.schemaVersion !== 1 || typeof fixture.id !== "string" || !fixture.id.trim() ||
        ids.has(fixture.id) || !domains.has(fixture.domain) ||
        !Object.hasOwn(fixture, "input") || !Object.hasOwn(fixture, "expected") ||
        Object.keys(fixture).some(key => !["schemaVersion", "id", "domain", "input", "expected", "tolerance"].includes(key))) {
      throw new Error("Fixture requires a unique id, known domain, input and expected result.");
    }
    toleranceOf(fixture.tolerance);
    ids.add(fixture.id);
  }
  return fixtureHash(fixtures);
}

export function assertFixtureResult(fixture, actual) {
  validateFixtures([fixture]);
  canonical(actual);
  const { absolute, relative } = toleranceOf(fixture.tolerance);
  function compare(expected, value, location) {
    if (typeof expected === "number") {
      assert.equal(typeof value, "number", `${location}: numeric type`);
      // Scale the relative comparison to avoid an overflowing difference/limit.
      const scale = Math.max(Math.abs(value), Math.abs(expected));
      assert.ok(Math.abs(value - expected) <= absolute ||
        (scale > 0 && Math.abs(value / scale - expected / scale) <= relative), `${location}: expected ${expected}, received ${value}`);
    } else if (expected && typeof expected === "object") {
      assert.ok(value && typeof value === "object", `${location}: object type`);
      assert.equal(Array.isArray(value), Array.isArray(expected), `${location}: array type`);
      assert.deepEqual(Object.keys(value).sort(), Object.keys(expected).sort(), `${location}: keys`);
      for (const key of Object.keys(expected)) compare(expected[key], value[key], `${location}.${key}`);
    } else assert.deepEqual(value, expected, location);
  }
  compare(fixture.expected, actual, fixture.id);
}

// Fixed uint32 LCG. Only fixture input generation uses this algorithm.
export function seededInput(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error("Seed must be a uint32.");
  let state = seed;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
