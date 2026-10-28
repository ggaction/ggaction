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
  { id: "encodings/edit-y-scale", async run() {
{
      const {createLinearNiceCount}=await import("./linear-nice-count-public.js");
      const p=createLinearNiceCount();
      assert.deepEqual(p.resolvedScales.y.domain,[0,110]);
      assert.deepEqual(p.semanticSpec.scales.find(s=>s.id==="y").nice,{count:10});
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      assert.deepEqual(p.editYScale({nice:true}).resolvedScales.y.domain,[0,120]);
      assert.equal((await renderToPNGBuffer(p)).width,260);
      assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,4).toString(),"%PDF");
      assert(renderToSVG(p).includes("22.181818181818187"));
      const basic=basicChart().createCanvas().createData({values:[{x:0,y:0},{x:1,y:108}]})
        .createLinePlot({x:"x",y:{field:"y",scale:{zero:true,nice:{count:10}}},guides:false});
      assert.deepEqual(basic.resolvedScales.y.domain,[0,110]);
    }
  } },
  { id: "encodings/create-canvas", async run() {
{
      const rows=[{x:2,y:3,t:"Alpha",dx:12,dy:-6},{x:5,y:6,t:"Beta",dx:-9,dy:8}];
      const original=chart().createCanvas({width:500,height:300,margin:80}).createData({values:rows})
        .createTextPlot({x:{field:"x",scale:{domain:[0,10]}},y:{field:"y",scale:{domain:[0,10]}},text:"t"});
      const p=original.encodeDx({field:"dx"}).encodeDy({field:"dy"});
      assert.deepEqual(p.graphicSpec.objects.textPlot.items.map(i=>[i.properties.x,i.properties.y]),[[160,172],[241,144]]);
      assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
      assert.deepEqual(p.resolvedScales,original.resolvedScales);
      assert.deepEqual(p.graphicSpec,original.encodeChannels({target:"textPlot",channels:{dx:{field:"dx"},dy:{field:"dy"}}}).graphicSpec);
      assert.deepEqual(p.removeEncoding({channel:"dx"}).removeEncoding({channel:"dy"}).graphicSpec,original.graphicSpec);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      const before=serializeProgram(p);assert.throws(()=>p.encodeDy({value:Infinity}));assert.equal(serializeProgram(p),before);
      assert.equal(basicChart().encodeDx,undefined);assert.equal(basicChart().encodeDy,undefined);
      assert.ok(renderToSVG(p).includes("Alpha"));
      assert.ok((await renderToPNGBuffer(p)).buffer.length>100);
      assert.ok((await renderToPDFBuffer(p)).buffer.length>100);
    }
  } },
  { id: "encodings/palette-base", async run() {
const paletteBase = chart().createCanvas({width:240,height:180,margin:30})
      .createData({values:[{x:0,y:1,v:0},{x:1,y:2,v:0.3},{x:2,y:3,v:1}]})
      .createScatterPlot({x:"x",y:"y",guides:false});
const paletteDescriptor = Object.freeze({name:"turbo",count:64,extent:Object.freeze([0.1,0.9])});
const paletteTop = paletteBase.encodeStroke({field:"v",fieldType:"quantitative",scale:{type:"sequential",domain:[0,1],palette:paletteDescriptor}});
const paletteRange = paletteBase.encodeStroke({field:"v",fieldType:"quantitative",scale:{type:"sequential",domain:[0,1],range:{palette:paletteDescriptor}}});
assert.deepEqual(paletteTop.semanticSpec,paletteRange.semanticSpec);
assert.deepEqual(paletteTop.graphicSpec,paletteRange.graphicSpec);
assert.ok(Object.values(paletteTop.resolvedScales).some(scale=>scale.range.length===64));
assert.deepEqual(deserializeProgram(serializeProgram(paletteTop)).graphicSpec,paletteTop.graphicSpec);
  } },
  { id: "encodings/interval-rows", async run() {
const intervalRows = Object.freeze([Object.freeze({x0:0,x1:2})]);
const intervalBase = chart().createCanvas({width:240,height:160,margin:20})
      .createData({values:intervalRows}).createRectMark({id:"period"})
      .encodeXRange({lower:"x0",upper:"x1",scale:{domain:[0,2],nice:false}});
const directInterval = intervalBase.encodeY({datum:45000,scale:{domain:[0,45000],nice:false}}).encodeY2({datum:0});
const rangedInterval = intervalBase.encodeYRange({lower:{datum:45000},upper:{datum:0},scale:{domain:[0,45000],nice:false}});
assert.deepEqual(rangedInterval.semanticSpec,directInterval.semanticSpec);
assert.deepEqual(rangedInterval.graphicSpec,directInterval.graphicSpec);
assert.equal(rangedInterval.graphicSpec.objects.period.items[0].properties.y,20);
assert.equal(rangedInterval.graphicSpec.objects.period.items[0].properties.height,120);
assert.equal(renderToSVG(rangedInterval),renderToSVG(directInterval));
assert.deepEqual((await renderToPNGBuffer(rangedInterval)).buffer,(await renderToPNGBuffer(directInterval)).buffer);
assert.deepEqual(rangedInterval.semanticSpec.datasets[0].values,intervalRows);
assert.deepEqual(deserializeProgram(serializeProgram(rangedInterval)).graphicSpec,rangedInterval.graphicSpec);
assert.ok((await renderToPDFBuffer(rangedInterval)).buffer.length>100);
  } },
  { id: "encodings/numeric-area", async run() {
const numericArea = chart().createCanvas({ width: 320, height: 220, margin: 20 })
      .createData({ values: [{ x: 0, value: 1, level: 10 }, { x: 1, value: 2, level: 10 }] })
      .createAreaPlot({ x: "x", y: "value", guides: false })
      .encodeColor({ field: "level", fieldType: "quantitative", scale: { domain: [10, 90], range: ["red", "blue"] } });
assert.equal(numericArea.graphicSpec.objects.areaPlot.items[0].properties.fill, "#ff0000");
assert.deepEqual(deserializeProgram(serializeProgram(numericArea)).graphicSpec, numericArea.graphicSpec);
assert.ok((await renderToPNGBuffer(numericArea)).buffer.length > 100);
assert.ok((await renderToPDFBuffer(numericArea)).buffer.length > 100);
assert.match(renderToSVG(numericArea), /#ff0000/);
  } },
  { id: "encodings/blended-bar", async run() {
const blendedBar = chart().createCanvas({width:200,height:200,margin:40})
      .createData({values:[{category:"a",value:1}]})
      .createBarPlot({x:"category",y:{field:"value",aggregate:"sum"},guides:false})
      .encodeBarWidth({pixels:80})
      .editBarMark({fill:"#f00000",stroke:"#ffff00",strokeWidth:8})
      .editBarMark({blend:"difference"});
assert.equal(blendedBar.semanticSpec.layers[0].mark.blend,"difference");
assert.equal(blendedBar.graphicSpec.objects.barPlot.items[0].properties.blend,"difference");
assert.deepEqual(deserializeProgram(serializeProgram(blendedBar)).graphicSpec,blendedBar.graphicSpec);
assert.match(renderToSVG(blendedBar),/mix-blend-mode:difference/);
const {createCanvas: blendCanvas,loadImage: blendImage} = await import("@napi-rs/canvas");
const blendPNG=await renderToPNGBuffer(blendedBar),blendContext=blendCanvas(200,200).getContext("2d");
blendContext.drawImage(await blendImage(blendPNG.buffer),0,0);
assert.deepEqual([...blendContext.getImageData(100,100,1,1).data],[15,255,255,255]);
assert.ok((await renderToPDFBuffer(blendedBar)).buffer.length>100);
assert.equal(blendedBar.editBarMark({blend:"normal"}).semanticSpec.layers[0].mark.blend,undefined);
for(const [mode,expected] of [["multiply",[48,0,0,255]],["screen",[243,102,153,255]]]){
  const current=blendedBar.editCanvas({background:"#336699"}).editBarMark({blend:mode});
  assert.equal(current.semanticSpec.layers[0].mark.blend,mode);
  assert.equal(current.graphicSpec.objects.barPlot.items[0].properties.blend,mode);
  assert.deepEqual(deserializeProgram(serializeProgram(current)).graphicSpec,current.graphicSpec);
  const restored=deserializeGraphic(serializeGraphic(current));
  assert.match(renderToSVG(restored),new RegExp(`mix-blend-mode:${mode}`));
  assert.deepEqual(createTransitionScene(current,{format:"canvas"}).nodes.map(node=>node.properties),createTransitionScene(restored,{format:"canvas"}).nodes.map(node=>node.properties));
  const png=await renderToPNGBuffer(restored),surface=blendCanvas(200,200).getContext("2d");
  surface.drawImage(await blendImage(png.buffer),0,0);
  assert.deepEqual([...surface.getImageData(100,100,1,1).data],expected);
  assert.match((await renderToPDFBuffer(restored)).buffer.toString("latin1"),new RegExp(`/BM /${mode[0].toUpperCase()+mode.slice(1)}\\b`));
  assert.equal(current.editBarMark({blend:"normal"}).semanticSpec.layers[0].mark.blend,undefined);
}

  } },
  { id: "encodings/resource-cleanup", async run() {
const resourceCleanup = chart()
      .createData({ id: "unusedData", values: [] })
      .createScale({ id: "unusedScale", type: "linear" })
      .createCoordinate({ id: "unusedCoordinate", type: "cartesian" })
      .removeData({ id: "unusedData" })
      .removeScale({ id: "unusedScale" })
      .removeCoordinate({ id: "unusedCoordinate" });
assert.deepEqual(resourceCleanup.semanticSpec.datasets, []);
assert.deepEqual(resourceCleanup.semanticSpec.scales, []);
assert.deepEqual(resourceCleanup.semanticSpec.coordinates, []);
  } },
  { id: "encodings/entry-surface", async run() {
assert.equal(basicChart().removeScale, undefined);
  } },
  { id: "encodings/entry-surface-2", async run() {
assert.equal(typeof basicChart().encodeChannels, "undefined");
  } },
  { id: "encodings/polar-frame", async run() {
const polarFrame = chart()
      .createCanvas({ width: 400, height: 200, margin: 0 })
      .createData({ values: [
        { angle: 0, radius: 80 },
        { angle: 90, radius: 80 }
      ] })
      .createPolarScatterPlot({
        id: "polarPoints",
        theta: { field: "angle", scale: { domain: [0, 360] } },
        radius: { field: "radius", scale: { domain: [0, 80] } },
        guides: false
      })
      .editCoordinate({
        target: "polar",
        polarFrame: {
          center: { x: 0.25, y: 0.5 },
          radius: { unit: "fraction", value: 0.8 }
        }
      });
assert.deepEqual(polarFrame.resolvedScales.radius.range, [0, 80]);
assert.deepEqual(
      polarFrame.graphicSpec.objects.polarPoints.items.map(item => [
        Math.round(item.properties.x),
        Math.round(item.properties.y)
      ]),
      [[100, 20], [180, 100]]
    );
  } },
  { id: "encodings/basic-themed", async run() {
const basicThemed = basicChart()
      .applyTheme({ theme: "dark" })
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" });
assert.equal(basicThemed.graphicSpec.objects.point.items[0].properties.fill, "#60a5fa");
  } },
  { id: "encodings/scatter-facade", async run() {
const scatterFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false });
assert.equal(scatterFacade.graphicSpec.objects.scatterPlot.items.length, 2);
assert.deepEqual(
      scatterFacade.trace.children.at(-1).children.map(node => node.op),
      ["createPointMark", "encodeX", "encodeY"]
    );
  } },
  { id: "encodings/basic-scatter", async run() {
const basicScatter = basicChart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false });
assert.equal(basicScatter.graphicSpec.objects.scatterPlot.items.length, 2);
assert.ok(basicScatter.encodePointRadius({ value: 0 })
      .graphicSpec.objects.scatterPlot.items.every(item => item.properties.radius === 0));
assert.equal(basicScatter.createRegression, undefined);
  } },
  { id: "encodings/rule-source", async run() {
const ruleSource = chart().createCanvas().createData({ values: [{ x: 1 }, { x: 2 }] });
const styledRule = ruleSource.createRuleMark({ stroke: "red", strokeWidth: 0, opacity: 0.5 })
      .encodeX({ field: "x", fieldType: "quantitative" }).editRuleMark({ strokeDash: "dashed", opacity: 0.8 });
const lowerRule = ruleSource.createRuleMark().encodeStroke({ value: "red" })
      .encodeStrokeWidth({ value: 0 }).encodeOpacity({ value: 0.5 })
      .encodeX({ field: "x", fieldType: "quantitative" }).encodeStrokeDash({ value: "dashed" }).encodeOpacity({ value: 0.8 });
assert.deepEqual(styledRule.graphicSpec, lowerRule.graphicSpec);
  } },
  { id: "encodings/filled-band", async run() {
const filledBand = chart().createCanvas().createData({ values: [
      { x: 1, y: 2, lower: 1, upper: 3, group: "A" },
      { x: 2, y: 3, lower: 2, upper: 4, group: "A" }
    ] }).createErrorBand({ x: { field: "x" },
      y: { center: "y", lower: "lower", upper: "upper" }, groupBy: "group", fill: "red" });
assert.equal(filledBand.encodeColor({ field: "group" })
      .semanticSpec.layers[0].encoding.color.field, "group");
assert.equal(filledBand.editErrorBand({ fill: false }).encodeColor({ field: "group" })
      .semanticSpec.layers[0].encoding.color.field, "group");
  } },
  { id: "encodings/create-canvas-2", async run() {
for (const factory of [chart, basicChart]) {
      const timed = factory().createCanvas().createData({ values: [{ time: 1000, y: 1 }, { time: 2000, y: 2 }] })
        .createScatterPlot({ x: { field: "time", fieldType: "temporal", temporalUnit: "timestamp", scale: { nice: false } }, y: "y", guides: false });
      assert.deepEqual(timed.resolvedScales.x.domain, [1000, 2000]);
      assert.equal(timed.encodeX({ field: "time" }).semanticSpec.layers[0].encoding.x.temporalUnit, "timestamp");
    }
  } },
  { id: "encodings/timed-horizon", async run() {
const timedHorizon = chart().createCanvas().createData({ values: [{ time: 1000, y: 1 }, { time: 2000, y: 2 }] })
      .createAreaMark().encodeHorizon({ x: { field: "time", fieldType: "temporal", temporalUnit: "timestamp", scale: { nice: false } }, y: "y", groupBy: false });
assert.deepEqual(timedHorizon.resolvedScales.x.domain, [1000, 2000]);
assert.equal(timedHorizon.semanticSpec.datasets.at(-1).transform[0].groupBy, undefined);
  } },
  { id: "encodings/horizon", async run() {
const horizon = chart()
      .createCanvas({ width: 180, height: 100, margin: 15 })
      .createData({
        values: [
          { time: 1, value: -2 },
          { time: 2, value: 3 },
          { time: 3, value: 1 }
        ]
      })
      .createAreaMark()
      .encodeHorizon({ x: "time", y: "value" });
assert.ok(horizon.graphicSpec.objects.area.items.length > 0);
assert.equal(horizon.editHorizon({ bands: 2 })
      .semanticSpec.datasets.at(-1).transform[0].bands, 2);
  } },
  { id: "encodings/area-rows", async run() {
const areaRows = ["A", "B"].flatMap(series => [1, 2].map(x => ({ x, category: String(x), value: series === "A" ? x + 1 : x, series })));
const areaFacade = chart().createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: areaRows }).createAreaPlot({ x: "x", y: "value", groupBy: "series", layout: "stack", guides: false });
assert.equal(areaFacade.graphicSpec.objects.areaPlot.items.length, 2);
assert.equal(areaFacade.semanticSpec.layers[0].encoding.y2.datum, 0);
assert.deepEqual(areaFacade.resolvedScales.y.domain, [0, 5]);
assert.match(renderToSVG(areaFacade), /<path/);
assert.deepEqual(areaFacade.layoutSeries({ mode: "fill" }).resolvedScales.y.domain, [0, 1]);
const areaPaint = { type: "linear-gradient", from: { x: 0, y: 1 }, to: { x: 0, y: 0 },
      stops: [{ offset: 0, color: "white" }, { offset: 1, color: "orange" }] };
const gradientArea = areaFacade.editAreaMark({ fill: areaPaint, opacity: 0.7 });
assert.ok(gradientArea.graphicSpec.objects.areaPlot.items.every(item =>
      item.properties.fill.type === "linear-gradient" && item.properties.opacity === 0.7));
assert.match(renderToSVG(gradientArea), /<linearGradient/);
assert.deepEqual(gradientArea.editCanvas({ width: 180 }).markConfigs.areaPlot.fill, areaPaint);
const basicSeries = basicChart().createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: areaRows }).createBarPlot({ x: "category", y: { field: "value", aggregate: "sum" }, guides: false })
      .encodeGroup({ field: "series" }).layoutSeries({ mode: "group" });
assert.equal(basicSeries.graphicSpec.objects.barPlot.items.length, 4);
const basicStack = basicSeries.layoutSeries({ mode: "stack" });
assert.equal(basicStack.resolvedScales.xOffset, undefined);
assert.deepEqual(basicStack.layoutSeries({ mode: "group" }).graphicSpec, basicSeries.graphicSpec);
assert.equal(basicSeries.createAreaPlot, undefined);
  } },
  { id: "encodings/line-facade", async run() {
const lineFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: 1, y: 2, group: "A", scenario: "observed", weight: 1 },
        { x: 2, y: 4, group: "A", scenario: "observed", weight: 1 }
      ] })
      .createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false });
assert.equal(lineFacade.graphicSpec.objects.linePlot.items.length, 1);
const tupleSeries = lineFacade.encodeGroup({ fields: ["group", "scenario"] })
      .encodeStrokeWidth({ field: "weight" })
      .encodeOpacity({ field: "weight" });
assert.equal(tupleSeries.graphicSpec.objects.linePlot.items.length, 1);
assert.deepEqual(tupleSeries.semanticSpec.layers[0].encoding.group.fields, ["group", "scenario"]);
assert.equal(tupleSeries.encodeOpacity({ value: 0.5 })
      .semanticSpec.layers[0].encoding.opacity, undefined);
assert.deepEqual(
      lineFacade.trace.children.at(-1).children.map(node => node.op),
      ["createLineMark", "encodeX", "encodeY", "encodeGroup"]
    );
  } },
  { id: "encodings/ordered-line-facade", async run() {
const orderedLineFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: 2, y: 4, order: 2 },
        { x: 1, y: 2, order: 1 }
      ] })
      .createLineMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodePathOrder({ field: "order" });
assert.deepEqual(
      orderedLineFacade.semanticSpec.layers[0].encoding.pathOrder,
      { field: "order", fieldType: "quantitative", order: "ascending" }
    );
assert.equal(
      orderedLineFacade.removePathOrder()
        .semanticSpec.layers[0].encoding.pathOrder,
      undefined
    );
  } },
  { id: "encodings/offset-scale-facade", async run() {
const offsetScaleFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { category: "A", subgroup: "u", value: 2 },
        { category: "A", subgroup: "v", value: 4 },
        { category: "B", subgroup: "u", value: 3 },
        { category: "B", subgroup: "v", value: 5 }
      ] })
      .createBarMark({ id: "offsetBars" })
      .encodeX({ target: "offsetBars", field: "category", fieldType: "nominal" })
      .encodeY({ target: "offsetBars", field: "value" })
      .encodeXOffset({ target: "offsetBars", field: "subgroup" })
      .encodeBarWidth({ target: "offsetBars" });
const editedOffsetScale = offsetScaleFacade.editXOffsetScale({
      target: "offsetBars", paddingInner: 0.2, paddingOuter: 0.1
    });
assert.equal(editedOffsetScale.resolvedScales.xOffset.paddingInner, 0.2);
assert.equal(editedOffsetScale.resolvedScales.xOffset.paddingOuter, 0.1);
assert.equal(editedOffsetScale.markConfigs.offsetBars.xOffset, undefined);
assert.equal(offsetScaleFacade.resolvedScales.xOffset.paddingInner, 0);
  } },
  { id: "encodings/ordered-categories", async run() {
const orderedCategories = chart()
      .createCanvas({ width: 180, height: 130, margin: 30 })
      .createData({ values: [
        { category: "Beta", value: 2 },
        { category: "Alpha", value: 7 }
      ] })
      .createBarMark()
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value", aggregate: "sum" })
      .orderCategories({
        channel: "x",
        by: { field: "value", aggregate: "sum" },
        direction: "descending"
      });
assert.deepEqual(orderedCategories.resolvedScales.x.domain, ["Alpha", "Beta"]);
assert.deepEqual(
      orderedCategories.removeCategoryOrder({ channel: "x" })
        .resolvedScales.x.domain,
      ["Beta", "Alpha"]
    );
  } },
  { id: "encodings/midpoint-plot", async run() {
const midpointPlot = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
      .createData({ values: [-2, 0, 4, 8].map((value, x) => ({ value, x })) })
      .createScatterPlot({ id: "midpoint", x: "x", y: "value", color: { field: "value", fieldType: "quantitative", scale: { id: "midpointColor", midpoint: 0, range: ["blue", "white", "red"] } } });
assert.deepEqual(midpointPlot.graphicSpec.objects.midpoint.items.map(item => item.properties.fill), ["#0000ff", "#ffffff", "#ff8080", "#ff0000"]);
assert.equal(midpointPlot.editScale({ id: "midpointColor", midpoint: "auto" }).resolvedScales.midpointColor.midpoint, undefined);
  } },
  { id: "encodings/binned-heatmap-facade", async run() {
const binnedHeatmapFacade = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ] })
      .createHeatmap({
        x: "x",
        y: "y",
        bin: { bins: 2, extent: { x: [0, 1], y: [0, 1] } },
        guides: false
      });
assert.equal(binnedHeatmapFacade.graphicSpec.objects.heatmap.items.length, 4);
assert.deepEqual(
      binnedHeatmapFacade.trace.children.at(-1).children.map(node => node.op),
      [
        "createBin2DData", "createRectMark", "encodeX", "encodeX2",
        "encodeY", "encodeY2", "encodeColor"
      ]
    );
  } },
  { id: "encodings/gradient-plot-facade", async run() {
const gradientPlotFacade = chart()
      .createCanvas({ width: 180, height: 140, margin: 20 })
      .createData({ values: [
        { group: "A", value: 1 },
        { group: "A", value: 2 },
        { group: "B", value: 3 },
        { group: "B", value: 4 }
      ] })
      .createGradientPlot({
        x: { field: "group", fieldType: "nominal" },
        y: { field: "value" },
        density: { bandwidth: 0.5, steps: 8 },
        guides: false
      })
      .editGradientPlot({ gradient: { opacity: [0.1, 0.9] } });
assert.equal(gradientPlotFacade.graphicSpec.objects.gradientPlot.items.length, 2);
assert.equal(
      gradientPlotFacade.graphicSpec.objects.gradientPlot.items[0]
        .properties.fill.type,
      "linear-gradient"
    );
const styledGradient = gradientPlotFacade
      .encodeColor({ target: "gradientPlot", value: "#e45756" })
      .encodeOpacity({ target: "gradientPlot", value: 0.5 })
      .encodeStroke({ target: "gradientPlot", value: "#000000" })
      .encodeStrokeWidth({ target: "gradientPlot", value: 2 })
      .editGradientPlot({ density: { bandwidth: 1 } });
const gradientAppearance = styledGradient.graphicSpec.objects.gradientPlot.items[0].properties;
assert.equal(gradientAppearance.opacity, 0.5);
assert.equal(gradientAppearance.stroke, "#000000");
assert.equal(gradientAppearance.strokeWidth, 2);
assert.equal(gradientAppearance.fill.type, "linear-gradient");
assert.notDeepEqual(gradientAppearance.fill,
      gradientPlotFacade.graphicSpec.objects.gradientPlot.items[0].properties.fill);
assert.ok(renderToSVG(styledGradient).startsWith("<svg "));
  } },
  { id: "encodings/weighted-arcs", async run() {
const weightedArcs = chart()
      .createCanvas({ width: 160, height: 160, margin: 20 })
      .createData({ values: [
        { group: "A", weight: 1.5 },
        { group: "A", weight: 2.5 },
        { group: "B", weight: 6 }
      ] })
      .createArcMark({ innerRadius: 0.4 })
      .encodeTheta({ field: "group", aggregate: "sum", weight: "weight" });
assert.equal(weightedArcs.graphicSpec.objects.arc.items.length, 2);
assert.equal(weightedArcs.semanticSpec.layers[0].encoding.theta.weight, "weight");
  } },
  { id: "encodings/text-datum", async run() {
const textDatum = chart().createCanvas({ width: 480, height: 320, margin: 40 })
      .createData({ values: [] })
      .createTextMark({ id: "note", data: "data", text: "Peak · 9.0", dx: 8, dy: -16 })
      .encodeX({ target: "note", datum: 8, scale: { domain: [0, 10] } })
      .encodeY({ target: "note", datum: 9, scale: { domain: [0, 10] } });
assert.deepEqual(textDatum.graphicSpec.objects.note.items.map(item =>
      [item.properties.x, item.properties.y, item.properties.text]), [[368, 48, "Peak · 9.0"]]);
assert.equal(textDatum.editCanvas({ width: 580 }).graphicSpec.objects.note.items[0].properties.x, 448);
  } },
  { id: "encodings/annotation-source", async run() {
const annotationSource = chart().createCanvas({ width: 480, height: 320, margin: 40 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 8, y: 9 }] })
      .createPointMark().encodeX({ field: "x", scale: { domain: [0, 10] } })
      .encodeY({ field: "y", scale: { domain: [0, 10] } });
const annotation = annotationSource.createAnnotation({
      text: "Peak · 9.0", x: 8, y: 9, dx: 8, dy: -16
    });
assert.deepEqual(annotation.graphicSpec.objects.annotation.items.map(item =>
      [item.properties.x, item.properties.y, item.properties.text]), [[368, 48, "Peak · 9.0"]]);
assert.equal(annotationSource.createAnnotation({ id: "markNote", text: "Point" })
      .graphicSpec.objects.markNote.items.length, 2);
  } },
  { id: "encodings/utc-text", async run() {
const utcText = chart().createCanvas({ width: 320, height: 200, margin: 30 })
      .createData({ values: [{ x: 1, y: 2, date: "2024-03-05T00:00:00Z" }] })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
      .createTextMark({ source: "point" }).encodeText({ field: "date", format: "%Y-%m-%d" });
assert.deepEqual(utcText.graphicSpec.objects.text.items.map(i => i.properties.text), ["2024-03-05"]);
  } },
  { id: "encodings/text-source", async run() {
const textSource = chart().createCanvas({ width: 400, height: 300, margin: 40 })
      .createData({ values: [{ x: 1, y: 2, label: "Alpha" }, { x: 2, y: 4, label: "Beta" }] })
      .createPointMark().createTextMark({ source: "point" }).encodeText({ field: "label" });
assert.deepEqual(textSource.graphicSpec.objects.text.items, []);
const sourceReady = textSource.encodeX({ target: "point", field: "x" })
      .encodeY({ target: "point", field: "y" });
assert.deepEqual(sourceReady.graphicSpec.objects.text.items.map(i => i.properties.text), ["Alpha", "Beta"]);
const reboundText = sourceReady.encodeX({ target: "point", field: "x", scale: { id: "rebound", domain: [0, 5] } })
      .editScale({ id: "rebound", domain: [0, 10] });
assert.deepEqual(reboundText.graphicSpec.objects.text.items.map(i => i.properties.x),
      reboundText.graphicSpec.objects.point.items.map(i => i.properties.x));
assert.throws(() => sourceReady.createTextMark({ id: "invalid", source: "point", data: "data" }), /mutually exclusive/);
  } },
  { id: "encodings/font-weight-program", async run() {
const fontWeightProgram = chart()
      .createCanvas({ width: 160, height: 80, margin: 12 })
      .createData({ id: "labels", values: [{ x: 0.5, y: 0.5 }] })
      .createTextMark({
        id: "labels",
        data: "labels",
        text: "Sample",
        fontSize: 12,
        fontWeight: 650
      })
      .encodeX({ target: "labels", field: "x", scale: { domain: [0, 1] } })
      .encodeY({ target: "labels", field: "y", scale: { domain: [0, 1] } });
await renderToPNG(fontWeightProgram, {
      output: consumerPath(new URL("./font-weight.png", import.meta.url))
    });
assert.match(
      renderToSVG(fontWeightProgram),
      /font-weight="700"/
    );
  } },
  { id: "encodings/sequential-count", async run() {
const sequentialCount = chart()
      .createCanvas({ width: 240, height: 160, margin: 30 })
      .createData({ values: [
        { x: 1, y: 2, value: 0 },
        { x: 2, y: 4, value: 0.3 },
        { x: 3, y: 6, value: 1 }
      ] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({
        field: "value",
        fieldType: "quantitative",
        scale: { palette: { name: "viridis", count: 5 } }
      });
assert.equal(sequentialCount.resolvedScales.color.range.length, 5);
  } },
  { id: "encodings/direct-sequential-count", async run() {
const directSequentialCount = chart().createScale({
      id: "temperature",
      type: "sequential",
      domain: [0, 1],
      palette: { name: "viridis", count: 5 }
    });
const nestedSequentialCount = chart().createScale({
      id: "temperature",
      type: "sequential",
      domain: [0, 1],
      range: { palette: { name: "viridis", count: 5 } }
    });
assert.deepEqual(directSequentialCount.semanticSpec, nestedSequentialCount.semanticSpec);
  } }
];
