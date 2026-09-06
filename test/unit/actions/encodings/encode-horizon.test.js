import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/ChartProgram.js";

function base(values = [
  { time: 0, value: -4, group: "A" },
  { time: 1, value: 4, group: "A" }
]) {
  return chart()
    .createCanvas({ width: 320, height: 200 })
    .createData({ id: "source", values })
    .createAreaMark();
}

test("encodes the shortest Horizon call with stable defaults", () => {
  const program = base().encodeHorizon({ x: "time", y: "value" });
  const layer = program.semanticSpec.layers[0];
  const dataset = program.semanticSpec.datasets[1];
  const transform = dataset.transform[0];

  assert.equal(layer.data, "areaHorizonData");
  assert.equal(transform.bands, 3);
  assert.equal(transform.baseline, 0);
  assert.equal(transform.extent, "auto");
  assert.equal(transform.resolve, "shared");
  assert.equal(transform.missing, "break");
  assert.equal(transform.overflow, "clip");
  assert.equal(layer.encoding.x.title, "Time");
  assert.deepEqual(program.semanticSpec.scales.find(
    scale => scale.id === "areaHorizonAmplitude"
  ).domain, [0, 1]);
  assert.equal(program.graphicSpec.objects.area.items.length, 6);
  assert.equal(program.graphicSpec.objects.area.items.every(
    item => item.properties.opacity === 1
  ), true);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(child => child.op),
    ["createHorizonData", "rebindLayerData", "editSemantic",
      "encodeX", "encodeY", "encodeGroup", "encodeY2", "encodeColor",
      "editAreaMark"]
  );
});

test("exposes original x titles before a shared Horizon scale rematerializes its guide", () => {
  const p = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
    .createData({ id: "source", values: [{ time: 0, value: -4 }, { time: 1, value: 4 }] })
    .createAreaMark({ id: "first", data: "source" }).encodeHorizon({ x: "time", y: "value" })
    .createGuides();
  const before = structuredClone(p.semanticSpec);
  const next = p.createAreaMark({ id: "second", data: "source" })
    .encodeHorizon({ target: "second", x: "time", y: { field: "value", scale: { id: "secondFolded" } } });
  assert.equal(next.semanticSpec.layers[1].encoding.x.title, "Time");
  assert.deepEqual(next.guideConfigs, p.guideConfigs);
  assert.deepEqual(p.semanticSpec, before);
});

test("infers stored x, y, group, and temporal field type", () => {
  const program = chart()
    .createCanvas({ width: 320, height: 200 })
    .createData({
      id: "source",
      values: [
        { date: "2000-01-01", value: -2, group: "A" },
        { date: "2001-01-01", value: 2, group: "A" }
      ]
    })
    .createAreaMark()
    .encodeX({ field: "date", fieldType: "temporal" })
    .encodeY({ field: "value" })
    .encodeGroup({ field: "group" })
    .encodeHorizon();
  const transform = program.semanticSpec.datasets[1].transform[0];

  assert.deepEqual(transform.x, { field: "date", fieldType: "temporal" });
  assert.deepEqual(transform.y, { field: "value", fieldType: "quantitative" });
  assert.equal(transform.groupBy, "group");
  assert.equal(program.semanticSpec.layers[0].encoding.x.scale, "x");
});

test("keeps an all-baseline Horizon as an intentional empty collection", () => {
  const program = base([
    { time: 0, value: 5 },
    { time: 1, value: 5 }
  ]).encodeHorizon({ x: "time", y: "value", baseline: 5 });

  assert.equal(program.graphicSpec.objects.area.items.length, 0);
  assert.deepEqual(program.resolvedScales.x.domain, [0, 1]);
  assert.deepEqual(
    program.semanticSpec.datasets[1].transform[0].resolved.extents,
    [{ extent: 0, bandHeight: 0 }]
  );
});

test("rejects ambiguous or conflicting Horizon ownership atomically", () => {
  const program = base();
  assert.throws(() => program.encodeHorizon({ x: "time" }), /requires y/);
  assert.throws(
    () => program.encodeHorizon({ x: "time", y: "value", bands: 0 }),
    /positive integer/
  );
  assert.throws(
    () => program.encodeHorizon({
      x: { field: "time", scale: "x" },
      y: "value"
    }),
    /scale must be a plain object/
  );
  const ranged = program
    .encodeX({ field: "time" })
    .encodeY({ field: "value" })
    .encodeY2({ field: "value" });
  assert.throws(
    () => ranged.encodeHorizon({ x: "time", y: "value" }),
    /unsupported y2 encoding/
  );
  assert.equal(program.semanticSpec.datasets.length, 1);
  assert.equal(program.trace.children.some(node => node.op === "encodeHorizon"), false);
});
