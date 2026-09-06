import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";

const rows = [
  { angle: 0, distance: 2, group: "A", weight: 1 },
  { angle: 90, distance: 4, group: "A", weight: 2 },
  { angle: 180, distance: 3, group: "B", weight: 3 }
];
function base() {
  return chart()
    .createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "observations", values: rows });
}
function snapshot(program) {
  return JSON.stringify(program);
}

test("creates a Polar scatter plot through the existing lower owners", () => {
  const options = {
    id: "points",
    data: "observations",
    theta: { field: "angle", scale: { domain: [0, 360] } },
    radius: { field: "distance", scale: { zero: true } },
    color: "group",
    shape: "group",
    point: { radius: 7, opacity: 0.8 },
    guides: false
  };
  const actual = base().createPolarScatterPlot(options);
  const expected = base()
    .createPointMark({ id: "points", data: "observations", opacity: 0.8 })
    .encodeTheta({ target: "points", field: "angle", scale: { domain: [0, 360] } })
    .encodeR({ target: "points", field: "distance", scale: { zero: true } })
    .encodePointRadius({ target: "points", value: 7 })
    .encodeColor({ target: "points", field: "group" })
    .encodeShape({ target: "points", field: "group" });
  assert.deepEqual(actual.semanticSpec, expected.semanticSpec);
  assert.deepEqual(actual.graphicSpec, expected.graphicSpec);
  assert.deepEqual(actual.resolvedScales, expected.resolvedScales);
  assert.deepEqual(actual.trace.children.at(-1).children.map(node => node.op), [
    "createPointMark", "encodeTheta", "encodeR", "encodePointRadius",
    "encodeColor", "encodeShape"
  ]);
});

test("keeps Polar radius position separate from encoded glyph size", () => {
  const encoded = base().createPolarScatterPlot({
    theta: "angle",
    radius: "distance",
    size: "weight",
    guides: false
  });
  const layer = encoded.semanticSpec.layers[0];
  assert.equal(layer.encoding.radius.field, "distance");
  assert.equal(layer.encoding.size.field, "weight");
  assert.notEqual(layer.encoding.radius.scale, layer.encoding.size.scale);
  assert.throws(
    () => base().createPolarScatterPlot({
      theta: "angle", radius: "distance", size: "weight", point: { radius: 8 }
    }),
    /radius conflicts with size/
  );
  assert.deepEqual(
    base().createPolarScatterPlot({
      theta: "angle", radius: "distance", point: { radius: undefined }, guides: false
    }).graphicSpec,
    base().createPolarScatterPlot({
      theta: "angle", radius: "distance", guides: false
    }).graphicSpec
  );
});

test("creates grouped open and explicitly closed Polar lines", () => {
  const open = base().createPolarLinePlot({
    id: "paths",
    theta: "angle",
    radius: "distance",
    groupBy: "group",
    color: "group",
    line: { strokeWidth: 3 },
    guides: false
  });
  const closed = base().createPolarLinePlot({
    id: "paths",
    theta: "angle",
    radius: "distance",
    groupBy: "group",
    color: "group",
    line: { strokeWidth: 3, closed: true },
    guides: false
  });
  assert.equal(open.markConfigs.paths.closed, undefined);
  assert.equal(closed.markConfigs.paths.closed, true);
  assert.equal(open.graphicSpec.objects.paths.items[0].properties.commands.at(-1).op, "L");
  assert.equal(closed.graphicSpec.objects.paths.items[0].properties.commands.at(-1).op, "Z");
  assert.deepEqual(closed.semanticSpec.layers[0].encoding.group, {
    field: "group",
    fieldType: "nominal"
  });
});

test("creates scoped Polar guides and converges after a radius scale edit", () => {
  const created = base().createPolarScatterPlot({
    theta: "angle",
    radius: "distance",
    color: "group",
    guides: { legend: {} }
  });
  assert.equal(created.semanticSpec.coordinates[0].type, "polar");
  assert.ok(created.semanticSpec.guides.axis.theta);
  assert.ok(created.semanticSpec.guides.axis.radius);
  assert.ok(created.semanticSpec.guides.grid.theta);
  assert.ok(created.semanticSpec.guides.grid.radial);
  assert.ok(created.semanticSpec.guides.legend.color);
  const edited = created.editScale({ id: "radius", domain: [0, 8] });
  const direct = base().createPolarScatterPlot({
    theta: "angle",
    radius: { field: "distance", scale: { domain: [0, 8] } },
    color: "group",
    guides: { legend: {} }
  });
  assert.deepEqual(edited.graphicSpec, direct.graphicSpec);
});

test("rejects invalid Polar facade requests without changing prior state", () => {
  const source = base().createCoordinate({ id: "xy", type: "cartesian" });
  const before = snapshot(source);
  for (const attempt of [
    () => source.createPolarScatterPlot({ coordinate: "xy", theta: "angle", radius: "distance" }),
    () => source.createPolarScatterPlot({ theta: { field: "angle", aggregate: "sum" }, radius: "distance" }),
    () => source.createPolarLinePlot({ theta: "angle", radius: { field: "group" } }),
    () => source.createPolarLinePlot({ theta: "angle", radius: "distance", guides: { axes: { x: {} } } })
  ]) {
    assert.throws(attempt);
    assert.equal(snapshot(source), before);
  }
});
