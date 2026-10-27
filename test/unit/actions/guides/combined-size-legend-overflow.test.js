import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const categories = ["A", "B", "C", "D", "E", "F", "G", "H"];
function base(create = chart, ordinal = true) {
  return create().createCanvas({ width: 900, height: 600,
    margin: { left: 40, top: 40, right: 400, bottom: 40 } })
    .createData({ values: categories.map((s, i) => ({ x: i, y: i, color: s, size: ordinal ? s : i + 1 })) })
    .createScatterPlot({ x: "x", y: "y", guides: false })
    .encodeColor({ field: "color" })
    .encodeSize({ field: "size", fieldType: ordinal ? "nominal" : "quantitative" });
}
const labels = (p, kind) => p.graphicSpec.objects[kind + "LegendLabels"].items.map(i => i.properties.text);
const options = { channels: ["color", "size"], overflow: { maxItems: 3 },
  labels: { fontSize: 10 }, titleStyle: { fontSize: 11 } };

test("combined creation forwards the same bounded prefix to categorical and ordinal size blocks", () => {
  for (const create of [chart, basicChart]) for (const aggregate of [false, true]) {
    const before = base(create), snapshot = serializeProgram(before);
    const p = aggregate ? before.createGuides({ axes: false, grid: false, legend: options })
      : before.createLegend(options);
    for (const kind of ["color", "size"]) {
      assert.deepEqual(labels(p, kind), ["A", "B", "C", "…5 entries"]);
      assert.equal(p.graphicSpec.objects[kind + "LegendSymbols"].items.length, 3);
      assert.deepEqual(p.guideConfigs.legend[kind].overflow, { maxItems: 3, summary: "ellipsis-count" });
    }
    assert.deepEqual(p.resolvedScales.size.domain, categories);
    assert.deepEqual(p.semanticSpec.datasets, before.semanticSpec.datasets);
    assert.equal(serializeProgram(before), snapshot);
  }
});

test("bounded ordinal size creation survives persistence, resize and edit convergence", () => {
  const p = base().createLegend(options);
  const restored = deserializeProgram(serializeProgram(p));
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  const edited = restored.editLegend({ overflow: { maxItems: 5 } }).editCanvas({ height: 700 });
  const direct = base().editCanvas({ height: 700 }).createLegend({ ...options, overflow: { maxItems: 5 } });
  assertEquivalentMeaning(edited.graphicSpec, direct.graphicSpec);
  assert.deepEqual(labels(edited, "size"), ["A", "B", "C", "D", "E", "…3 entries"]);
  const reset = p.editLegend({ overflow: false });
  assert.deepEqual(labels(reset, "size"), categories);
  assertEquivalentMeaning(reset.graphicSpec, base().createLegend({ ...options, overflow: false }).graphicSpec);
});

test("omission and false retain all ordinal categories while quantitative size sampling is unchanged", () => {
  for (const overflow of [undefined, false]) {
    const p = base().createLegend({ ...options, overflow });
    assert.deepEqual(labels(p, "color"), categories);
    assert.deepEqual(labels(p, "size"), categories);
  }
  const sampled = base(chart, false).createLegend(options);
  assert.deepEqual(labels(sampled, "color"), ["A", "B", "C", "…5 entries"]);
  assert.equal(sampled.guideConfigs.legend.size.overflow, undefined);
  assert.deepEqual(labels(sampled, "size"), labels(base(chart, false).createLegend({ channels: ["color", "size"] }), "size"));
});

test("invalid bounded prefix options reject the combined action atomically", () => {
  const before = base(), snapshot = serializeProgram(before);
  for (const overflow of [null, {}, { maxItems: 0 }, { maxItems: 1.5 },
    { maxItems: 2, summary: "truncate" }, { maxItems: 2, extra: true }]) {
    assert.throws(() => before.createLegend({ ...options, overflow }));
    assert.equal(serializeProgram(before), snapshot);
  }
});
