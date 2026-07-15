import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";
import { createCarsDensityAreaValues } from
  "../../../charts/density-area/reference-values.js";
import { loadCars } from "../../../support/data.js";
import { linearPathCommands } from "../../../support/path.js";

function areaProgram(id = "densities") {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top: 130, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: loadCars() })
    .createAreaMark({ id, opacity: 0.5 });
}

test("encodes grouped y-density with inferred target and source", () => {
  const before = areaProgram();
  const program = before.encodeDensity({
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6
  });
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.data, "densitiesDensityData");
  assert.equal(
    program.semanticSpec.datasets[1].transform[0].kernel,
    "gaussian"
  );
  assert.equal(
    program.semanticSpec.datasets[1].transform[0].normalization,
    "unit"
  );
  assert.deepEqual(layer.encoding, {
    x: { field: "Acceleration_value", fieldType: "quantitative", scale: "x" },
    y: { field: "Acceleration_density", fieldType: "quantitative", scale: "y" },
    group: { field: "Origin", fieldType: "nominal" }
  });
  assert.deepEqual(program.semanticSpec.scales, [
    { id: "x", type: "linear", domain: "auto", range: "auto", nice: false, zero: false },
    { id: "y", type: "linear", domain: "auto", range: "auto", nice: true, zero: true }
  ]);
  assert.equal(before.semanticSpec.datasets.length, 1);
  assert.equal(before.semanticSpec.layers[0].data, "cars");
});

test("matches primitive density geometry and records aggregate children", () => {
  const expected = createCarsDensityAreaValues(loadCars());
  const program = areaProgram().encodeDensity({
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6
  });
  assert.deepEqual(
    program.graphicSpec.objects.densities.children.map(child => child.properties.commands),
    expected.areas.map(area => linearPathCommands(area.points, { close: true }))
  );
  const node = program.trace.children.at(-1);
  assert.deepEqual(node.children.map(child => child.op), [
    "createDensityData",
    "editSemantic",
    "encodeX",
    "encodeY",
    "encodeGroup",
    "rematerializeAreaMark"
  ]);
  assert.deepEqual(
    node.children[0].children.map(child => child.op),
    ["createDerivedData", "materializeDensityData"]
  );
});

test("supports explicit x-density, output fields, scales, and coordinate", () => {
  const program = areaProgram("horizontal").encodeDensity({
    target: "horizontal",
    source: "cars",
    field: "Acceleration",
    densityChannel: "x",
    as: ["sample", "estimate"],
    extent: [8, 25],
    steps: 25,
    coordinate: "densityCoordinate",
    valueScale: { id: "value", nice: false, zero: false },
    densityScale: { id: "density", nice: true, zero: true }
  });
  const layer = program.semanticSpec.layers[0];

  assert.equal(layer.coordinate, "densityCoordinate");
  assert.equal(layer.encoding.x.field, "estimate");
  assert.equal(layer.encoding.x.scale, "density");
  assert.equal(layer.encoding.y.field, "sample");
  assert.equal(layer.encoding.y.scale, "value");
  assert.equal(layer.encoding.group, undefined);
  assert.equal(program.graphicSpec.objects.horizontal.children.length, 1);
  assert.equal(program.graphicSpec.objects.horizontal.children[0].properties.commands.length, 28);
});

test("forwards kernel and normalization and rematerializes their magnitude", () => {
  const program = areaProgram().encodeDensity({
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6,
    kernel: "epanechnikov",
    normalization: "count"
  });
  const expected = createCarsDensityAreaValues(loadCars(), {
    kernel: "epanechnikov",
    normalization: "count"
  });
  const dataset = program.semanticSpec.datasets[1];

  assert.equal(dataset.transform[0].kernel, "epanechnikov");
  assert.equal(dataset.transform[0].normalization, "count");
  assert.deepEqual(dataset.values, expected.densityRows);
  assert.deepEqual(program.resolvedScales.y.domain, expected.scales.y.domain);
  assert.deepEqual(
    program.graphicSpec.objects.densities.children.map(
      child => child.properties.commands
    ),
    expected.areas.map(area => linearPathCommands(area.points, { close: true }))
  );
});

test("rejects ambiguous, conflicting, and invalid density requests atomically", () => {
  const ambiguous = areaProgram("first")
    .createAreaMark({ id: "second", data: "cars" })
    ._withContext({ currentMark: undefined });
  assert.throws(
    () => ambiguous.encodeDensity({ field: "Acceleration" }),
    /target is ambiguous/
  );
  assert.throws(
    () => areaProgram().encodeDensity({ field: "Acceleration", target: "missing" }),
    /Unknown density area target/
  );
  assert.throws(
    () => areaProgram().encodeDensity({ field: "Acceleration", source: "missing" }),
    /Unknown density source dataset/
  );
  assert.throws(() => areaProgram().encodeDensity({ field: "" }), /non-empty string/);
  assert.throws(
    () => areaProgram().encodeDensity({ field: "Acceleration", densityChannel: "theta" }),
    /Unsupported densityChannel/
  );
  assert.throws(
    () => areaProgram().encodeDensity({ field: "Acceleration", valueScale: [] }),
    /plain object/
  );
  assert.throws(
    () => areaProgram().encodeDensity({ field: "Acceleration", extra: true }),
    /Unknown encodeDensity option/
  );
  assert.throws(
    () => areaProgram().encodeDensity({
      field: "Acceleration",
      kernel: "round"
    }),
    /Unsupported density kernel/
  );
  assert.throws(
    () => areaProgram().encodeDensity({
      field: "Acceleration",
      normalization: "probability"
    }),
    /Unsupported density normalization/
  );

  const encoded = areaProgram()
    .encodeX({ field: "Acceleration", scale: { zero: false } });
  assert.throws(
    () => encoded.encodeDensity({ field: "Acceleration" }),
    /already has positional or group encodings/
  );
  assert.equal(encoded.semanticSpec.datasets.length, 1);
});
