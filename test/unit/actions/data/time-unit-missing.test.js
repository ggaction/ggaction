import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { deriveTimeUnitRows } from "../../../../src/grammar/timeUnit.js";

const options = { id: "buckets", field: "date", unit: "year", as: "bucket", missing: "null" };
const dataset = (p, id = "buckets") => p.semanticSpec.datasets.find(d => d.id === id);

test("nullable calendar buckets retain raw rows, optional fields and numeric lineage", () => {
  const rows = [{ date: "2024-03-15", n: 1 }, { date: null, n: 2 }, { n: 3 }];
  const source = chart().createData({ id: "raw", values: rows });
  const before = serializeProgram(source);
  const p = source.createTimeUnitData(options);
  const d = dataset(p);
  assert.deepEqual(d.values, [{ ...rows[0], bucket: Date.UTC(2024, 0, 1) },
    { ...rows[1], bucket: null }, { ...rows[2], bucket: null }]);
  assert.equal(Object.hasOwn(d.values[2], "date"), false);
  const field = d.schema.fields.find(f => f.name === "bucket");
  assert.equal(field.storageType, "number");
  assert.equal(field.nullable, true);
  assert.equal(field.optional, false);
  assert.deepEqual(field.lineage.inputs, [{ data: "raw", field: "date" }]);
  assert.equal(serializeProgram(source), before);
  assert.deepEqual(dataset(deserializeProgram(serializeProgram(p))), d);
  assert.equal(typeof basicChart().createTimeUnitData, "undefined");
});

test("all-null numeric schemas and weekday policies survive editable restoration", () => {
  for (const unit of ["year", "weekday", "week"]) {
    const p = chart().createData({ values: [{ date: null }, {}] })
      .createTimeUnitData({ ...options, unit });
    const field = dataset(p).schema.fields.find(f => f.name === "bucket");
    assert.equal(field.storageType, "number");
    assert.equal(field.nullable, true);
    const restored = deserializeProgram(serializeProgram(p));
    const edited = restored.editTimeUnitData({ target: "buckets", unit: "month" });
    const id = edited.materializationConfigs.data.timeUnit.buckets.current;
    assert.deepEqual(dataset(edited, id).values, [{ date: null, bucket: null }, { bucket: null }]);
    assert.equal(dataset(edited, id).transform[0].missing, "null");
    assert.throws(() => restored.editTimeUnitData({ target: "buckets", missing: "error" }), /temporal/);
  }
});

test("null handling does not swallow malformed inputs, invalid options or collisions", () => {
  const source = chart().createData({ values: [{ date: null }] });
  const saved = serializeProgram(source);
  for (const missing of ["drop", false, undefined, {}]) {
    assert.throws(() => source.createTimeUnitData({ ...options, missing }), /missing/);
  }
  for (const change of [{ missing: "error" }, { unit: "decade" }, { timeZone: "Invalid/Zone" }]) {
    assert.throws(() => source.createTimeUnitData({ ...options, ...change }));
  }
  assert.throws(() => source.createTimeUnitData({ id: "b", field: "date", unit: "year" }), /temporal/);
  const transform = { type: "timeUnit", field: "date", unit: "year", as: "bucket", missing: "null" };
  for (const date of [undefined, NaN, Infinity, -Infinity, "not-a-date", {}, true, 8640000000000001]) {
    assert.throws(() => deriveTimeUnitRows([{ date }], transform));
  }
  assert.throws(() => deriveTimeUnitRows([{ date: null, bucket: 1 }], transform), /already exists/);
  assert.throws(() => deriveTimeUnitRows([{ date: -8640000000000000 }], transform), /outside/);
  assert.equal(serializeProgram(source), saved);
});

test("editing null policy recomputes derived consumers and retains strict default shape", () => {
  const p = chart().createData({ values: [{ date: "2024-03-15" }, { date: "2025-07-01" }] })
    .createTimeUnitData({ id: "buckets", field: "date", unit: "year", as: "bucket" })
    .createComputedData({ id: "copy", as: "copy", expression: { field: "bucket" } });
  assert.equal(Object.hasOwn(dataset(p).transform[0], "missing"), false);
  assert.throws(() => p.editTimeUnitData({ target: "buckets", missing: "null" }), /recompute/);
  const next = p.editTimeUnitData({ target: "buckets", missing: "null", dependents: "recompute" });
  const id = next.materializationConfigs.data.computed.copy.current;
  assert.deepEqual(dataset(next, id).values.map(r => r.copy), [Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)]);
  const replayed = p.replayDerivedData({ id: "replayed", source: "data", transform: {
    type: "timeUnit", field: "date", unit: "weekday", as: "day", missing: "null"
  } });
  assert.deepEqual(dataset(replayed, "replayed").values.map(r => r.day), [5, 2]);
});
