import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { resolveTextBounds } from "../../../../src/core/textMetrics.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

function source(channel = "color", scale = { type: "symlog", domain: [-20839, 955] }) {
  return chart().createCanvas({ plot: { width: 314, height: 314 }, margin: 140 })
    .createData({ values: [{ x: 0, y: 0, value: scale.domain[0], group: "A" },
      { x: 1, y: 1, value: scale.domain[1], group: "B" }] })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: false })
    [channel === "color" ? "encodeColor" : "encodeStroke"]({
      target: "points", field: "value", fieldType: "quantitative", scale: { palette: "blues", ...scale }
    });
}

const labels = (program, channel = "color") =>
  program.graphicSpec.objects[`${channel}GradientLabels`].items.map(item => item.properties);
const texts = (program, channel) => labels(program, channel).map(label => label.text);

function assertSeparated(program, channel, vertical) {
  const bounds = labels(program, channel).map(label => resolveTextBounds(label, program.materializationConfigs.textMetrics));
  const start = vertical ? "top" : "left", end = vertical ? "bottom" : "right";
  bounds.sort((a, b) => a[start] - b[start]);
  for (let index = 1; index < bounds.length; index += 1) {
    assert.ok(bounds[index][start] - bounds[index - 1][end] >= 4 - 1e-8,
      `Labels overlap: ${JSON.stringify(bounds)}`);
  }
}

for (const channel of ["color", "stroke"]) {
  test(`${channel} signed symlog gradient retains both signs and zero without clustered labels`, () => {
    const base = source(channel), before = serializeProgram(base);
    const program = base.createLegend({ channels: [channel] });
    assert.deepEqual(texts(program, channel), ["-20800", "-311", "0", "13.3", "955"]);
    assertSeparated(program, channel, true);
    assert.deepEqual(program.graphicSpec.objects.points, base.graphicSpec.objects.points);
    assert.equal(serializeProgram(base), before);
    assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
  });

  test(`${channel} automatic transformed labels adapt to direction, available length and font size`, () => {
    for (const scale of [
      { type: "symlog", domain: [-20839, 955] },
      { type: "symlog", domain: [955, -20839], constant: 0.01, reverse: true },
      { type: "log", domain: [1, 1e12] },
      { type: "pow", domain: [0, 100], exponent: 4 },
      { type: "sqrt", domain: [0, 100] }
    ]) for (const direction of ["vertical", "horizontal"]) {
      const program = source(channel, scale).createLegend({ channels: [channel], direction,
        gradient: { length: 120 }, count: 20, labels: { fontSize: 18 } });
      assertSeparated(program, channel, direction === "vertical");
      const kind = channel === "color" ? "gradient" : "strokeGradient";
      assert.equal(program.guideConfigs.legend[kind].count, 20);
      const larger = program.editLegend({ channel, gradient: { length: 280 } });
      assertSeparated(larger, channel, direction === "vertical");
      assert.ok(labels(larger, channel).length >= labels(program, channel).length);
      const restored = larger.editLegend({ channel, gradient: { length: 120 } });
      for (const role of ["Labels", "Ticks", "Strips"]) {
        assert.deepEqual(restored.graphicSpec.objects[`${channel}Gradient${role}`],
          program.graphicSpec.objects[`${channel}Gradient${role}`]);
      }
    }
  });

  test(`${channel} explicit close ticks stay exact through edits and reset to spaced automatic ticks`, () => {
    const values = Object.freeze([-20000, -15000, -10000, -5000, 0]);
    const program = source(channel).createLegend({ channels: [channel], values });
    assert.equal(labels(program, channel).length, values.length);
    assert.deepEqual(texts(program, channel), values.map(String));
    const edited = program.editLegend({ channel, direction: "horizontal", gradient: { length: 80 }, labels: { fontSize: 24 } })
      .editCanvas({ plot: { width: 350, height: 314 } });
    assert.deepEqual(texts(edited, channel), values.map(String));
    assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec, edited.graphicSpec);
    const automatic = edited.editLegend({ channel, values: "auto" });
    assertSeparated(automatic, channel, false);
    assert.notDeepEqual(texts(automatic, channel), values.map(String));
  });
}

test("automatic gradient replay preserves marks, ramp colors and shared facet legends", () => {
  const program = source().createLegend();
  const strips = program.graphicSpec.objects.colorGradientStrips;
  const edited = program.editLegendLabels({ fontSize: 20 });
  assert.deepEqual(edited.graphicSpec.objects.colorGradientStrips, strips);
  assertSeparated(edited, "color", true);
  assert.deepEqual(edited.editLegendLabels({ fontSize: 12 }).graphicSpec, program.graphicSpec);
  const facet = program.facet({ field: "group", guides: { legend: "shared" } });
  assert.deepEqual(deserializeProgram(serializeProgram(facet)).graphicSpec, facet.graphicSpec);
  assert.match(JSON.stringify(facet.graphicSpec), /-311/);
});
