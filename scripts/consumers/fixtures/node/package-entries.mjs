import { fileURLToPath as consumerPath } from "node:url";
import assert from "node:assert/strict";
import { chart, hconcat, render, vconcat } from "ggaction";
import { chart as basicChart, render as basicRender } from "ggaction/basic";
import { action, ChartProgram, registerExtension } from "ggaction/extension";
import { renderToPDF, renderToPDFBuffer } from "ggaction/pdf";
import { renderToPNG, renderToPNGBuffer } from "ggaction/png";
import { renderToSVG } from "ggaction/svg";
import { createTransitionScene } from "ggaction/scene";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { exportAccessibleData } from "ggaction/accessibility";
import { comparePrograms, describeAction, getDatasetSchema, inspectProgram } from "ggaction/inspection";
import {createFacetSharedTopLaneProgram} from "./facet-lane-public.js";
import {createPlotUnderlayProgram} from "./plot-underlay-public.js";

export const cases = [
  { id: "package-entries/create-canvas", async run() {
for (const factory of [chart, basicChart]) {
      const values = [{x:0,y:1},{x:2,y:3},{x:3,y:null},{x:5,y:6},{x:7,y:8}];
      const p = factory().createCanvas({width:100,height:100,margin:0}).createData({values})
        .createLinePlot({id:"gaps",x:{field:"x",scale:{domain:[0,10]}},
          y:{field:"y",scale:{domain:[0,10]}},line:{missing:"break"},guides:false});
      assert.deepEqual(p.graphicSpec.objects.gaps.items.map(i=>i.properties.commands),[
        [{op:"M",x:0,y:90},{op:"L",x:20,y:70}],
        [{op:"M",x:50,y:40},{op:"L",x:70,y:20}]
      ]);
      assert.deepEqual(p.semanticSpec.datasets[0].values,values);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      assert.equal((await renderToPNGBuffer(p)).width,100);
      assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,4).toString(),"%PDF");
      assert.ok(renderToSVG(p).includes('M'));
    }
  } },
  { id: "package-entries/create-canvas-2", async run() {
for (const factory of [chart,basicChart]) {
      const arrayRows=[{amounts:[1,2],labels:["A","B"],group:"alpha"},{amounts:[3,4,5],labels:["C","D"],group:"beta"}];
      const base=factory().createCanvas().createData({values:arrayRows});
      const expanded=base.createFlattenData({id:"expanded",fields:["amounts","labels"],as:["x","label"]});
      assert.deepEqual(expanded.semanticSpec.datasets[1].values.map(r=>[r.x,r.label]),[[1,"A"],[2,"B"],[3,"C"],[4,"D"],[5,null]]);
      assert.deepEqual(expanded.semanticSpec.datasets[0].values,arrayRows);
      assert.equal(base.semanticSpec.datasets.length,1);
      assert.throws(()=>base.createFlattenData({id:"bad",fields:["group"]}),/array/);
      const points=expanded.createScatterPlot({x:"x",y:"x",guides:false});
      assert.equal(points.graphicSpec.objects.scatterPlot.items.length,5);
      assert.ok(renderToSVG(points).includes("<circle"));
      assert.ok((await renderToPNGBuffer(points)).buffer.length>100);
      assert.deepEqual(deserializeProgram(serializeProgram(points)).semanticSpec,points.semanticSpec);
      if(factory===chart){
        const renamed=points.editFlattenData({target:"expanded",as:["value","category"]});
        assert.equal(renamed.semanticSpec.layers[0].encoding.x.field,"value");
        assert.equal(renderToSVG(renamed),renderToSVG(points));
        assert.equal(points.reviseData({source:"data",id:"newArrays",values:[{amounts:[4],labels:[],group:"alpha"}]}).graphicSpec.objects.scatterPlot.items.length,1);
      } else assert.equal(points.editFlattenData,undefined);
    }
  } },
  { id: "package-entries/clip-base", async run() {
const clipBase = chart().createCanvas({width:240,height:180,margin:40})
      .createData({values:[{x:-1,y:4},{x:5,y:4}]})
      .createScatterPlot({x:{field:"x",scale:{domain:[0,10]}},y:{field:"y",scale:{domain:[0,8]}},guides:false});
const clipped = clipBase.editPointMark({clip:true});
assert.deepEqual(clipped.graphicSpec.objects.scatterPlot.clip,{x:40,y:40,width:160,height:100});
assert.deepEqual(clipped.graphicSpec.objects.scatterPlot.items,clipBase.graphicSpec.objects.scatterPlot.items);
assert.equal((renderToSVG(clipped).match(/clip-path=/g)||[]).length,1);
assert.deepEqual(clipped.editPointMark({clip:false}).graphicSpec,clipBase.graphicSpec);
assert.deepEqual(deserializeProgram(serializeProgram(clipped)).graphicSpec,clipped.graphicSpec);
assert.notDeepEqual((await renderToPNGBuffer(clipped)).buffer,(await renderToPNGBuffer(clipBase)).buffer);
  } },
  { id: "package-entries/long-line", async run() {
const longLine = chart().createCanvas({ width: 440, height: 340, margin: 20 })
      .createData({ values: Array.from({ length: 12070 }, (_, i) => ({ x: i, y: i % 11 })) })
      .createLinePlot({ x: "x", y: "y", guides: false });
assert.equal(longLine.graphicSpec.objects.linePlot.items[0].properties.commands.length, 12070);
assert.deepEqual(deserializeProgram(serializeProgram(longLine)).graphicSpec, longLine.graphicSpec);
assert.ok(renderToSVG(longLine).includes("<path"));
assert.ok((await renderToPNGBuffer(longLine)).buffer.length > 100);
  } },
  { id: "package-entries/create-canvas-3", async run() {
for (const factory of [chart, basicChart]) {
      const dense = factory().createCanvas({width:250,height:250,margin:25})
        .createData({values:Array.from({length:50000},(_,x)=>({x,y:x%11}))})
        .createScatterPlot({x:"x",y:"y",guides:false});
      assert.equal(dense.graphicSpec.objects.scatterPlot.items.length,50000);
      assert.deepEqual(deserializeProgram(serializeProgram(dense)).graphicSpec,dense.graphicSpec);
      assert.match(dense.graphicSpec.objects.scatterPlot.items.at(-1).id,/^scatterPlot:[a-f0-9]{64}$/);
      assert.equal(new Set(dense.graphicSpec.objects.scatterPlot.items.map(item => item.id)).size, 50000);
      assert.throws(()=>factory().createGraphics({id:"unowned",type:"circle",length:10001}),/10000/);
    }
  } },
  { id: "package-entries/precomputed-box", async run() {
const precomputedBox = chart().createCanvas({ width: 600, height: 400, margin: 80 })
      .createData({ values: [{ group: "A", min: 3.07, q1: 13.3475, median: 17.795, q3: 24.1275, max: 50.81 }] })
      .createBoxPlot({ x: { field: "group", fieldType: "nominal" },
        summary: { min: "min", q1: "q1", median: "median", q3: "q3", max: "max" },
        width: { pixels: 30 }, median: { width: { pixels: 18 } }, whisker: { caps: false, stroke: "black" } });
assert.equal(precomputedBox.graphicSpec.objects.boxPlot.items[0].properties.width, 30);
const boxMedian = precomputedBox.graphicSpec.objects.boxPlotMedian.items[0].properties;
assert.equal(boxMedian.x2 - boxMedian.x1, 18);
assert.equal(precomputedBox.graphicSpec.objects.boxPlotWhiskerLowerCap, undefined);
assert.deepEqual(deserializeProgram(serializeProgram(precomputedBox)).graphicSpec, precomputedBox.graphicSpec);
assert.ok((await renderToPNGBuffer(precomputedBox)).buffer.length > 1000);
  } },
  { id: "package-entries/text-plot", async run() {
const textPlot = chart().createCanvas({ width: 600, height: 400, margin: 100 })
      .createData({ values: [{ x: 1, y: 2, label: "first", group: "A" }, { x: 2, y: 3, label: "second", group: "B" }] })
      .createTextPlot({ x: "x", y: "y", text: "label", color: "group" });
assert.match(renderToSVG(textPlot), /first/);
assert.deepEqual(deserializeProgram(serializeProgram(textPlot)).graphicSpec, textPlot.graphicSpec);
const textPng = await renderToPNGBuffer(textPlot);
assert.equal(textPng.buffer.readUInt32BE(16), 600);
  } },
  { id: "package-entries/exponential-regression", async run() {
const exponentialRegression = chart().createCanvas({width:500,height:350,margin:70})
      .createData({values:[{x:0,y:1},{x:1,y:3},{x:2,y:8}]})
      .createRegressionPlot({x:"x",y:"y",method:"exp",guides:false});
assert.equal(exponentialRegression.semanticSpec.datasets.at(-1).transform[0].interval,false);
assert.equal(exponentialRegression.markConfigs.regressionPlot.regression.bandId,undefined);
assert.ok(Math.abs(exponentialRegression.semanticSpec.datasets.at(-1).values[0].y-1.0490780630894252)<1e-12);
assert.deepEqual(deserializeProgram(serializeProgram(exponentialRegression)).graphicSpec,exponentialRegression.graphicSpec);
assert.ok((await renderToPNGBuffer(exponentialRegression)).buffer.length>500);
  } },
  { id: "package-entries/create-canvas-4", async run() {
for (const factory of [chart, basicChart]) for (const type of ["log", "symlog"]) {
      const values = (type === "log" ? [1, 10, 100] : [-1, 0, 1]).map((value, x) => ({ x, value }));
      const transformed = factory().createCanvas({ margin: 100 }).createData({ values })
        .createScatterPlot({ id: "transformed", x: "x", y: "value", color: {
          field: "value", fieldType: "quantitative", scale: { type, range: ["#000000", "#ffffff"] }
        } });
      assert.deepEqual(transformed.graphicSpec.objects.transformed.items.map(item => item.properties.fill),
        ["#000000", "#808080", "#ffffff"]);
      assert.equal(transformed.graphicSpec.objects.colorGradientStrips.items.length, 60);
      assert.match(renderToSVG(transformed), /#808080/);
    }
  } },
  { id: "package-entries/create-canvas-5", async run() {
for (const factory of [chart, basicChart]) {
      const numericBars = factory().createCanvas({ width: 500, height: 300, margin: 50 })
        .createData({ values: [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 3, y: 5 }] })
        .createBarPlot({ x: "x", y: "y", width: { pixels: 20 }, guides: false });
      assert.equal(numericBars.graphicSpec.objects.barPlot.items.length, 3);
      assert.ok(numericBars.graphicSpec.objects.barPlot.items.every(item => item.properties.width === 20));
      assert.equal(numericBars.semanticSpec.layers[0].mark.orientation, "vertical");
      assert.deepEqual(deserializeProgram(serializeProgram(numericBars)).graphicSpec, numericBars.graphicSpec);
      assert.match(renderToSVG(numericBars), /<rect/);
    }
  } },
  { id: "package-entries/centered", async run() {
const centered = chart().createCanvas({ width: 480, height: 320, margin: 40 })
      .createData({ values: [{ category: "A", value: 2 }, { category: "B", value: 3 }] })
      .createPiePlot({ category: "category", value: "value", aggregate: "sum", guides: false })
      .createAnnotation({ text: "5", anchor: "plot-center" });
assert.deepEqual([centered.graphicSpec.objects.annotation.items[0].properties.x,
      centered.graphicSpec.objects.annotation.items[0].properties.y], [240, 160]);
assert.deepEqual(deserializeProgram(serializeProgram(centered)).graphicSpec, centered.graphicSpec);
assert.match(renderToSVG(centered), /<svg/);
  } },
  { id: "package-entries/entry-surface", async run() {
await assert.rejects(() => import("ggaction/src/index.js"), /not defined|not exported/);
  } }
];
