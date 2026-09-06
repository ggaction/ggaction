import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";

function authoredChart() {
  return chart()
    .createCanvas({ width: 800, height: 600, margin: 160 })
    .createData({ values: [
      { x: 1, y: 2, group: "A" },
      { x: 2, y: 4, group: "B" }
    ] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .createAxes()
    .createLegend({ position: "right" })
    .createTitle({ text: "Fitted chart" });
}

test("fits existing layout resources by shrinking margins on a fixed Canvas", () => {
  const source = authoredChart();
  const snapshot = JSON.stringify(source);
  const fitted = source.fitCanvas();

  assert.ok(Object.values(fitted.materializationConfigs.canvas.margin)
    .every(value => value < 160 && value * 4 === Math.round(value * 4)));
  assert.deepEqual(fitted.materializationConfigs.fitting.policy, {
    padding: 0,
    minPlotWidth: 160,
    minPlotHeight: 120,
    iterationLimit: 32,
    overflow: "error"
  });
  assert.equal(fitted.materializationConfigs.fitting.result.status, "fit");
  assert.ok(fitted.materializationConfigs.fitting.result.plot.width >= 160);
  assert.ok(fitted.materializationConfigs.fitting.result.plot.height >= 120);
  assert.ok(fitted.materializationConfigs.fitting.result.iterations <= 128);
  assert.deepEqual(
    fitted.trace.children.at(-1).children.map(child => child.op),
    ["editCanvas"]
  );
  assert.equal(JSON.stringify(source), snapshot);
});

test("converges exactly when the same fitting policy is repeated", () => {
  const once = authoredChart().fitCanvas({ padding: 4 });
  const twice = once.fitCanvas({ padding: 4 });

  assert.deepEqual(twice.graphicSpec, once.graphicSpec);
  assert.deepEqual(twice.materializationConfigs, once.materializationConfigs);
  assert.deepEqual(twice.semanticSpec, once.semanticSpec);
  assert.deepEqual(twice.trace.children.at(-1).children, []);
});

test("reports or rejects an unsatisfied minimum plot without partial state", () => {
  const source = authoredChart();
  const snapshot = JSON.stringify(source);
  assert.throws(
    () => source.fitCanvas({ minPlotWidth: 1000 }),
    /fitCanvas overflow: plot width .* is smaller than minPlotWidth 1000/u
  );
  assert.equal(JSON.stringify(source), snapshot);

  const reported = source.fitCanvas({
    minPlotWidth: 1000,
    overflow: "report"
  });
  assert.equal(reported.materializationConfigs.fitting.result.status, "overflow");
  assert.match(
    reported.materializationConfigs.fitting.result.issues[0],
    /^plot width .* is smaller than minPlotWidth 1000$/u
  );

  const bounded = source.fitCanvas({ iterationLimit: 1, overflow: "report" });
  assert.equal(bounded.materializationConfigs.fitting.result.status, "overflow");
  assert.ok(bounded.materializationConfigs.fitting.result.issues.some(
    issue => /reached iterationLimit 1$/u.test(issue)
  ));
});

test("fits wrapped titles and long legends while preserving explicit ranges", () => {
  const source = chart()
    .createCanvas({ width: 900, height: 700, margin: 220 })
    .createData({ values: [
      { x: 1, y: 2, group: "North America Enterprise Accounts" },
      { x: 2, y: 4, group: "Asia Pacific Consumer Markets" }
    ] })
    .createPointMark()
    .encodeX({ field: "x", scale: { range: [240, 600] } })
    .encodeY({ field: "y" })
    .encodeColor({ field: "group" })
    .createAxes()
    .createLegend({ position: "right" })
    .createTitle({
      text: "A deliberately long quarterly performance title",
      subtitle: "Wrapped before deterministic Canvas fitting",
      maxWidth: 320
    });
  const fitted = source.fitCanvas({ padding: 8 });

  assert.equal(fitted.materializationConfigs.fitting.result.status, "fit");
  assert.deepEqual(fitted.resolvedScales.x.range, [240, 600]);
  assert.ok(fitted.materializationConfigs.canvas.margin.top >= 8);
  assert.ok(fitted.materializationConfigs.canvas.margin.right >= 8);
});

test("validates fitting policy and keeps fitCanvas out of Basic", () => {
  const empty = chart();
  assert.throws(() => empty.fitCanvas(), /requires an existing Canvas/u);
  const canvas = chart().createCanvas();
  for (const options of [
    { padding: -1 },
    { minPlotWidth: 0 },
    { minPlotHeight: Infinity },
    { iterationLimit: 0 },
    { iterationLimit: 65 },
    { overflow: "clip" },
    { extra: true }
  ]) assert.throws(() => canvas.fitCanvas(options));
  assert.equal(basicChart().fitCanvas, undefined);
});
