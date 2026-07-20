import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../src/index.js";
import { planDerivedDataRevision } from
  "../../../src/materialization/dataProvenance.js";

function program() {
  return chart()
    .createData({ id: "source", values: [{ x: 1 }] })
    .createPointMark({ id: "points", data: "source" })
    .createDerivedData({
      id: "pointsDensityData",
      source: "source",
      transform: [{
        type: "filter",
        field: "x",
        predicate: { op: "gte", value: 1 }
      }]
    });
}

test("plans deterministic immutable derived-data revisions and rebinds", () => {
  const before = program();
  const first = planDerivedDataRevision(before, {
    owner: "points",
    role: "DensityData",
    previous: "pointsDensityData",
    consumers: ["points"]
  });
  assert.deepEqual(first, {
    id: "pointsDensityDataRevision1",
    previous: "pointsDensityData",
    rebinds: [{ id: "points", data: "pointsDensityDataRevision1" }],
    release: { id: "pointsDensityData" }
  });
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.rebinds), true);

  const occupied = before.createDerivedData({
    id: first.id,
    source: "source",
    transform: [{
      type: "filter",
      field: "x",
      predicate: { op: "gte", value: 1 }
    }]
  });
  assert.equal(planDerivedDataRevision(occupied, {
    owner: "points",
    role: "DensityData",
    previous: first.id,
    consumers: ["points"]
  }).id, "pointsDensityDataRevision2");
});

test("validates revision resources before returning a plan", () => {
  const before = program();
  assert.throws(
    () => planDerivedDataRevision(before, {
      owner: "points",
      role: "density-data",
      previous: "pointsDensityData",
      consumers: ["points"]
    }),
    /role must be an alphanumeric identifier/
  );
  assert.throws(
    () => planDerivedDataRevision(before, {
      owner: "points",
      role: "DensityData",
      previous: "missing",
      consumers: ["points"]
    }),
    /Unknown previous derived dataset/
  );
  assert.throws(
    () => planDerivedDataRevision(before, {
      owner: "points",
      role: "DensityData",
      previous: "pointsDensityData",
      consumers: ["points", "points"]
    }),
    /consumers must be unique/
  );
});
