import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/core/ChartProgram.js";
import {
  deriveKernelDensity,
  estimateDensityBandwidth
} from "../../../../src/grammar/density.js";
import { createCarsDensityAreaValues } from
  "../../../fixtures/carsDensityAreaValues.js";
import { loadCars } from "../../../support/data.js";

test("derives grouped Gaussian KDE on one shared sample grid", () => {
  const expected = createCarsDensityAreaValues(loadCars());
  const result = deriveKernelDensity(loadCars(), {
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6,
    steps: 100
  });

  assert.deepEqual(result.values, expected.densityRows);
  assert.deepEqual(result.groups, expected.groupDomain);
  assert.deepEqual(result.extent, [8, 24.8]);
  assert.equal(result.bandwidth, 0.6);
  assert.equal(result.samples.length, 100);
  assert.equal(Object.isFrozen(result.values), true);
});

test("creates immutable density provenance and concrete values", () => {
  const cars = loadCars();
  const source = chart().createData({ id: "cars", values: cars });
  const program = source.createDensityData({
    id: "densitiesDensityData",
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6
  });

  assert.deepEqual(program.semanticSpec.datasets[1], {
    id: "densitiesDensityData",
    source: "cars",
    transform: [{
      type: "density",
      field: "Acceleration",
      groupBy: "Origin",
      bandwidth: 0.6,
      extent: "auto",
      steps: 100,
      as: ["Acceleration_value", "Acceleration_density"],
      resolve: "shared"
    }],
    values: createCarsDensityAreaValues(cars).densityRows
  });
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[1].values), true);
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeDensityData"]
  );
  assert.deepEqual(
    program.trace.children.at(-1).children[1].children.map(child => child.op),
    ["editSemantic", "editSemantic"]
  );
});

test("resolves and stores a deterministic automatic bandwidth", () => {
  const values = [
    { value: 1, group: "A" },
    { value: 2, group: "A" },
    { value: 4, group: "B" },
    { value: 8, group: "B" }
  ];
  const program = chart()
    .createData({ id: "source", values })
    .createDensityData({
      id: "density",
      field: "value",
      groupBy: "group",
      steps: 5,
      as: ["sample", "estimate"]
    });
  const transform = program.semanticSpec.datasets[1].transform[0];

  assert.equal(transform.bandwidth, estimateDensityBandwidth([1, 2, 4, 8]));
  assert.ok(Number.isFinite(transform.bandwidth));
  assert.equal(program.semanticSpec.datasets[1].values.length, 10);
});

test("supports ungrouped and explicit-extent density", () => {
  const result = deriveKernelDensity(
    [{ value: 1 }, { value: 2 }, { value: 3 }],
    {
      field: "value",
      bandwidth: 1,
      extent: [0, 4],
      steps: 3,
      as: ["sample", "estimate"]
    }
  );

  assert.deepEqual(result.groups, [undefined]);
  assert.deepEqual(result.samples, [0, 2, 4]);
  assert.equal(Object.hasOwn(result.values[0], "group"), false);
});

test("validates density derivation and action options", () => {
  const source = chart().createData({
    id: "source",
    values: [{ value: 1, group: "A" }, { value: 2, group: "A" }]
  });

  assert.throws(() => deriveKernelDensity({}, { field: "value" }), /array/);
  assert.throws(
    () => deriveKernelDensity([], { field: "" }),
    /non-empty string/
  );
  assert.throws(
    () => deriveKernelDensity([], { field: "value", groupBy: 1 }),
    /non-empty string/
  );
  assert.throws(
    () => deriveKernelDensity([{ value: 1 }], {
      field: "value",
      bandwidth: "auto",
      extent: [0, 2]
    }),
    /at least two values/
  );
  assert.throws(
    () => estimateDensityBandwidth([1, Number.NaN]),
    /finite numbers/
  );
  assert.throws(
    () => estimateDensityBandwidth([1, 1]),
    /varying finite values/
  );
  assert.throws(
    () => deriveKernelDensity([{ value: 1 }, { value: 1 }], {
      field: "value",
      bandwidth: 1
    }),
    /observed extent requires varying/
  );
  assert.throws(
    () => deriveKernelDensity([], { field: "value" }),
    /at least one valid/
  );
  assert.throws(
    () => deriveKernelDensity(source.semanticSpec.datasets[0].values, {
      field: "value",
      bandwidth: 0
    }),
    /positive finite/
  );
  assert.throws(
    () => deriveKernelDensity(source.semanticSpec.datasets[0].values, {
      field: "value",
      extent: [2, 1]
    }),
    /ascending pair/
  );
  assert.throws(
    () => deriveKernelDensity(source.semanticSpec.datasets[0].values, {
      field: "value",
      steps: 1
    }),
    /integer of at least 2/
  );
  assert.throws(
    () => deriveKernelDensity(source.semanticSpec.datasets[0].values, {
      field: "value",
      as: ["sample", "sample"]
    }),
    /two distinct/
  );
  assert.throws(
    () => deriveKernelDensity(source.semanticSpec.datasets[0].values, {
      field: "value",
      groupBy: "group",
      as: ["group", "density"]
    }),
    /must not collide/
  );
  assert.throws(
    () => source.createDensityData({ id: "density", field: "value", steps: 1 }),
    /at least 2/
  );
  assert.throws(
    () => source.createDensityData({
      id: "density",
      field: "value",
      as: ["value", "density"]
    }),
    /must not collide/
  );
  assert.throws(
    () => source.createDensityData({ id: "density", field: "value", extra: true }),
    /Unknown createDensityData option/
  );
  assert.throws(
    () => chart().createDensityData({ id: "density", field: "value" }),
    /Source dataset id/
  );
  assert.throws(
    () => source.createDensityData({ id: "density", field: "" }),
    /non-empty field string/
  );
  assert.throws(
    () => source.materializeDensityData({ id: "missing" }),
    /Unknown derived dataset/
  );
  const materialized = source.createDensityData({
    id: "density",
    field: "value",
    bandwidth: 1
  });
  assert.throws(
    () => materialized.materializeDensityData({ id: "density" }),
    /already materialized/
  );
  const filtered = source.createDerivedData({
    id: "filtered",
    source: "source",
    transform: [{ type: "filter", field: "group", oneOf: ["A"] }]
  });
  assert.throws(
    () => filtered.materializeDensityData({ id: "filtered" }),
    /requires one density transform/
  );
  assert.throws(
    () => source.createDerivedData({
      id: "invalid",
      source: "source",
      transform: [{
        type: "density",
        field: "value",
        bandwidth: 1,
        extent: "auto",
        steps: 10,
        as: ["sample", "density"],
        resolve: "independent"
      }]
    }),
    /Unsupported density resolve/
  );
});

test("does not mutate or retain caller-owned density inputs", () => {
  const values = [{ value: 1 }, { value: 2 }, { value: 3 }];
  const before = structuredClone(values);
  const program = chart()
    .createData({ id: "source", values })
    .createDensityData({ id: "density", field: "value", bandwidth: 1 });

  values[0].value = 999;
  assert.deepEqual(program.semanticSpec.datasets[0].values, before);
  assert.equal(Object.isFrozen(program.semanticSpec.datasets[1].transform), true);
});
