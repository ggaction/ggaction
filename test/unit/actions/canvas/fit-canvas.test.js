import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

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
    overflow: "error",
    align: "preserve"
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
    { align: "left" },
    { extra: true }
  ]) assert.throws(() => canvas.fitCanvas(options));
  assert.equal(basicChart().fitCanvas, undefined);
});

test("exact plot fitting reclaims automatic space after persistence without changing the plot", () => {
  const source = chart().createCanvas({plot:{width:314,height:314},margin:20})
    .createData({values:Array.from({length:60},(_,i)=>({x:i,y:i,id:`Item ${i}`,group:i%3?'B':'A'}))})
    .createScatterPlot({id:"plot",x:"x",y:"y",color:"id",guides:false})
    .createLegend({target:"plot",channels:["color"]});
  const snapshot = serializeProgram(source);
  const large = source.fitCanvas({align:"center",padding:6});
  const small = deserializeProgram(serializeProgram(large))
    .encodeColor({target:"plot",field:"group",fieldType:"nominal"})
    .fitCanvas({align:"center",padding:6});
  assert.ok(small.graphicSpec.objects.canvas.properties.height < large.graphicSpec.objects.canvas.properties.height / 2);
  assert.deepEqual(small.materializationConfigs.canvas.plot,{width:314,height:314});
  assert.deepEqual(small.materializationConfigs.canvas.requestedMargin,{top:20,right:20,bottom:20,left:20});
  assert.deepEqual(small.fitCanvas({align:"center",padding:6}).graphicSpec,small.graphicSpec);
  assert.equal(serializeProgram(source),snapshot);
  const authored = small.editCanvas({margin:{bottom:200}}).fitCanvas();
  assert.ok(authored.materializationConfigs.canvas.margin.bottom >= 200);
});

test("exact plot fitting reports unsatisfied dimensions and restricts centering to exact plot mode", () => {
  const source = chart().createCanvas({plot:{width:80,height:90},margin:20});
  const before = serializeProgram(source);
  assert.throws(()=>source.fitCanvas({align:"center"}),/fitCanvas overflow/);
  const reported = source.fitCanvas({align:"center",overflow:"report"});
  assert.equal(reported.materializationConfigs.fitting.result.status,"overflow");
  assert.equal(reported.materializationConfigs.fitting.result.issues.length,2);
  assert.deepEqual(reported.materializationConfigs.canvas.plot,{width:80,height:90});
  assert.equal(serializeProgram(source),before);
  assert.throws(()=>authoredChart().fitCanvas({align:"center"}),/requires exact inner plot sizing/);
});
