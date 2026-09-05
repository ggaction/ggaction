import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { assertChartProgramsEquivalent } from "../../../support/chart-equivalence.js";

const rows = ["A", "B"].flatMap((group, g) => [1, 2].flatMap(x =>
  [0, 1].map(delta => ({ group, x, y: 2 + g * 5 + x + delta, weight: g + 1 }))));
function source(factory = chart) {
  return factory().createCanvas({ width: 700, height: 450,
    margin: { left: 60, right: 230, top: 50, bottom: 50 } }).createData({ values: rows });
}
function band(options = {}) {
  return source().createErrorBand({ id: "band", x: { field: "x" },
    y: { field: "y", extent: "stdev" }, groupBy: "group", ...options });
}
function coloredBand() {
  return band().encodeColor({ field: "group" }).createLegend({ channels: ["color"] });
}
function fills(program) { return program.graphicSpec.objects.band.items.map(item => item.properties.fill); }

test("Scatter radius delegates to the same lower chain in default and Basic entries", () => {
  for (const factory of [chart, basicChart]) {
    for (const radius of [0, 3, 5]) {
      const facade = source(factory).createScatterPlot({ x: "x", y: "y", point: { radius }, guides: false });
      const lower = source(factory).createPointMark({ id: "scatterPlot" })
        .encodeX({ field: "x" }).encodeY({ field: "y" }).encodePointRadius({ value: radius });
      assertChartProgramsEquivalent({ publicProgram: facade, primitiveProgram: lower });
      assert.ok(facade.graphicSpec.objects.scatterPlot.items.every(item => item.properties.radius === radius));
      const call = facade.trace.children.at(-1).children.at(-1);
      assert.equal(call.op, "encodePointRadius");
      assert.equal(call.children[0].op, "encodeRadius");
    }
    for (const radius of [-1, NaN, Infinity, undefined, null]) {
      assert.throws(() => source(factory).createScatterPlot({ x: "x", y: "y", point: { radius } }), /radius/);
    }
    assert.throws(() => source(factory).createScatterPlot({
      x: "x", y: "y", size: "weight", point: { radius: 0 }
    }), /conflicts with size/);
    assert.equal(source(factory).createScatterPlot({ x: "x", y: "y", guides: false })
      .markConfigs.scatterPlot?.radius, undefined);
  }
});

test("Point scalar opacity cannot invalidate its field legend or highlight baseline", () => {
  const program = source().createScatterPlot({ x: "x", y: "y", guides: false })
    .encodeOpacity({ field: "weight", scale: { domain: [1, 2], range: [.2, .8] } })
    .createLegend({ channels: ["opacity"] })
    .highlightMarks({ select: { field: "group", op: "eq", value: "B" }, opacity: .9 });
  const before = JSON.stringify(program);
  assert.throws(() => program.editPointMark({ opacity: .4 }), /conflicts with a field encoding/);
  assert.equal(JSON.stringify(program), before);
  const constant = program.encodeOpacity({ value: .4 });
  assert.equal(constant.guideConfigs.legend?.opacity, undefined);
  assert.deepEqual(constant.graphicSpec.objects.scatterPlot.items.map(item => item.properties.opacity),
    [.4, .4, .4, .4, .9, .9, .9, .9]);
  assert.deepEqual(constant.editCanvas({ width: 760 }).graphicSpec.objects.scatterPlot.items
    .map(item => item.properties.opacity), [.4, .4, .4, .4, .9, .9, .9, .9]);
});

test("ErrorBand fill replacement is explicit in both directions and reset restores field eligibility", () => {
  const colored = coloredBand();
  const before = JSON.stringify(colored);
  assert.throws(() => colored.editErrorBand({ fill: "black", statistics: { extent: "ci" } }), /color encoding/);
  assert.equal(JSON.stringify(colored), before);
  const constant = colored.removeEncoding({ channel: "color" }).editErrorBand({ fill: "black" });
  assert.deepEqual(fills(constant), ["black", "black"]);
  assert.equal(constant.guideConfigs.legend?.color, undefined);
  for (const program of [constant, band({ fill: "black" }), band().editAreaMark({ fill: "black" })]) {
    assert.throws(() => program.encodeColor({ target: "band", field: "group" }), /constant appearance/);
    const reset = program.editErrorBand({ target: "band", fill: false });
    assert.deepEqual(fills(reset), ["#4c78a8", "#4c78a8"]);
    assert.equal(reset.markConfigs.band.errorBand.fill, undefined);
    assertChartProgramsEquivalent({
      publicProgram: reset.encodeColor({ target: "band", field: "group" }),
      primitiveProgram: band().encodeColor({ field: "group" })
    });
  }
  assert.throws(() => band({ fill: false }), /fill/);
  assert.throws(() => colored.editErrorBand({ fill: undefined }), /color encoding|fill/);
});

test("ErrorBand reset preserves encoded colors through statistics, boundaries, and highlight replay", () => {
  const colored = coloredBand();
  const legacy = colored._withMarkConfig("band", {
    ...colored.markConfigs.band,
    errorBand: { ...colored.markConfigs.band.errorBand, fill: "black" }
  }).rematerializeAreaMark({ id: "band" });
  assert.deepEqual(fills(legacy), ["black", "black"]);
  const restored = legacy.editErrorBand({ fill: false });
  assert.deepEqual(restored.semanticSpec, colored.semanticSpec);
  assert.deepEqual(restored.graphicSpec, colored.graphicSpec);
  const highlighted = restored.highlightMarks({ target: "band",
    select: { field: "group", op: "eq", value: "B" }, fill: "red" });
  const edited = highlighted.editErrorBand({ target: "band", fill: false,
    statistics: { extent: "ci", level: .9 }, boundaries: {} }).editCanvas({ width: 740 });
  assert.deepEqual(fills(edited), [fills(colored)[0], "red"]);
  assert.equal(edited.semanticSpec.layers[0].encoding.color.field, "group");
  assert.equal(edited.semanticSpec.layers.length, 3);
  assert.equal(edited.guideConfigs.legend.color.domain.length, 2);
});
