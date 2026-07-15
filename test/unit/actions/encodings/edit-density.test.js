import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsDensityAreaValues } from
  "../../../charts/density-area/reference-values.js";
import { loadCars } from "../../../support/data.js";
import { linearPathCommands } from "../../../support/path.js";

function densityProgram(id = "densities") {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top: 130, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createAreaMark({ id, opacity: 0.5 })
    .encodeDensity({
      target: id,
      field: "Acceleration",
      groupBy: "Origin",
      bandwidth: 0.6
    });
}

test("creates, rebinds, and materializes one immutable density revision", () => {
  const before = densityProgram();
  const after = before.editDensity({
    target: "densities",
    bandwidth: 0.9,
    kernel: "triangular",
    normalization: "count"
  });
  const expected = createCarsDensityAreaValues(loadCars(), {
    bandwidth: 0.9,
    kernel: "triangular",
    normalization: "count"
  });
  const revised = after.semanticSpec.datasets[1];

  assert.deepEqual(after.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityDataRevision1"
  ]);
  assert.equal(after.semanticSpec.layers[0].data, revised.id);
  assert.deepEqual(revised.transform[0], {
    type: "density",
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.9,
    extent: "auto",
    steps: 100,
    kernel: "triangular",
    normalization: "count",
    as: ["Acceleration_value", "Acceleration_density"],
    resolve: "shared"
  });
  assert.deepEqual(revised.values, expected.densityRows);
  assert.deepEqual(after.resolvedScales.y.domain, [0, 40]);
  assert.deepEqual(
    after.graphicSpec.objects.densities.children.map(
      child => child.properties.commands
    ),
    expected.areas.map(area => linearPathCommands(area.points, { close: true }))
  );
  assert.deepEqual(before.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityData"
  ]);
  assert.equal(before.semanticSpec.layers[0].data, "densitiesDensityData");
  assert.notEqual(after.semanticSpec, before.semanticSpec);
});

test("records explicit revision, rebind, release, and materialization actions", () => {
  const program = densityProgram().editDensity({ kernel: "uniform" });
  const node = program.trace.children.at(-1);

  assert.deepEqual(node.children.map(child => child.op), [
    "createDensityData",
    "editSemantic",
    "releaseDerivedData",
    "rematerializeAreaMark"
  ]);
  assert.deepEqual(
    node.children[2].children.map(child => child.op),
    ["editSemantic"]
  );
});

test("increments revision ids and preserves omitted density decisions", () => {
  const first = densityProgram().editDensity({ steps: 25 });
  const second = first.editDensity({ extent: [10, 20] });
  const transform = second.semanticSpec.datasets[1].transform[0];

  assert.equal(second.semanticSpec.datasets[1].id, "densitiesDensityDataRevision2");
  assert.equal(transform.steps, 25);
  assert.deepEqual(transform.extent, [10, 20]);
  assert.equal(transform.bandwidth, 0.6);
  assert.equal(transform.kernel, "gaussian");
  assert.equal(transform.normalization, "unit");
  assert.equal(first.semanticSpec.datasets[1].id, "densitiesDensityDataRevision1");
});

test("retains a previous revision while another layer still consumes it", () => {
  const shared = densityProgram()
    .createPointMark({ id: "samples", data: "densitiesDensityData" })
    .encodeX({
      target: "samples",
      field: "Acceleration_value",
      scale: { id: "x", nice: false, zero: false }
    })
    .encodeY({
      target: "samples",
      field: "Acceleration_density",
      scale: { id: "y", nice: true, zero: true }
    });
  const beforeY = shared.graphicSpec.objects.samples.children.map(
    child => child.properties.y
  );
  const revised = shared.editDensity({
    target: "densities",
    normalization: "count"
  });
  const node = revised.trace.children.at(-1);

  assert.deepEqual(revised.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityData",
    "densitiesDensityDataRevision1"
  ]);
  assert.equal(
    revised.semanticSpec.layers.find(layer => layer.id === "samples").data,
    "densitiesDensityData"
  );
  assert.deepEqual(node.children[2].children, []);
  assert.deepEqual(node.children.slice(3).map(child => child.op), [
    "rematerializeAreaMark",
    "rematerializePointMark"
  ]);
  assert.notDeepEqual(
    revised.graphicSpec.objects.samples.children.map(
      child => child.properties.y
    ),
    beforeY
  );
});

test("validates selection and edits atomically", () => {
  const before = densityProgram();
  assert.throws(() => before.editDensity({}), /at least one density option/);
  assert.throws(
    () => before.editDensity({ target: "missing", bandwidth: 1 }),
    /Unknown density area target/
  );
  assert.throws(
    () => before.editDensity({ kernel: "round" }),
    /Unsupported density kernel/
  );
  assert.throws(
    () => before.editDensity({ normalization: "probability" }),
    /Unsupported density normalization/
  );
  assert.throws(
    () => before.editDensity({ bandwidth: 0 }),
    /positive finite/
  );
  assert.throws(
    () => before.editDensity({ extra: true }),
    /Unknown editDensity option/
  );
  assert.deepEqual(before.semanticSpec.datasets.map(dataset => dataset.id), [
    "cars",
    "densitiesDensityData"
  ]);

  const ambiguous = before
    .createAreaMark({ id: "other", data: "cars" })
    .encodeDensity({ target: "other", field: "Acceleration" })
    ._withContext({ currentMark: undefined });
  assert.throws(
    () => ambiguous.editDensity({ steps: 20 }),
    /target is ambiguous/
  );
});
