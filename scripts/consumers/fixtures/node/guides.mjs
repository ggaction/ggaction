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
  { id: "guides/create-horizontal-grid", async run() {
{
      const {createLinearNearestTicks}=await import("./linear-nearest-ticks-public.js");
      const p=createLinearNearestTicks();
      const expected=["0","20","40","60","80","100","120","140"];
      assert.deepEqual(p.graphicSpec.objects.yAxisLabels.items.map(x=>x.properties.text),expected);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      const reset=p.createHorizontalGrid().editYAxisTicks({rounding:"ceiling"});
      assert.equal(reset.graphicSpec.objects.yAxisTicks.items.length,5);
      assert.equal(reset.graphicSpec.objects.yAxisLabels.items.length,5);
      assert.equal(reset.graphicSpec.objects.horizontalGridLines.items.length,5);
      assert.equal((await renderToPNGBuffer(p)).width,260);
      assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,4).toString(),"%PDF");
      assert(renderToSVG(p).includes('140'));
      const b=basicChart().createCanvas({plot:{width:200,height:120},margin:40})
        .createData({values:[{x:0,y:0},{x:1,y:133}]})
        .createLinePlot({x:"x",y:{field:"y",scale:{domain:[0,140]}},guides:false})
        .createYAxis({title:false,ticksAndLabels:{rounding:"nearest"}});
      assert.deepEqual(b.graphicSpec.objects.yAxisLabels.items.map(x=>x.properties.text),expected);
    }
  } },
  { id: "guides/create-canvas", async run() {
for (const factory of [chart,basicChart]) {
      const rows=Array.from({length:10},(_,i)=>({rank:i+1,group:"An intentionally long category "+(i+1)}));
      const base=factory().createCanvas({width:500,height:220,margin:{left:320,right:20,top:20,bottom:60}})
        .createData({values:rows}).createScatterPlot({x:"rank",y:{field:"group",fieldType:"nominal"},guides:false});
      const labels={fontSize:14,overlap:"allow"};
      assert.throws(()=>base.createAxes({x:false,y:{ticksAndLabels:{labels},title:{text:"Group",fontSize:11,offset:80}}}),/title overlaps the axis labels/);
      const p=base.createAxes({x:false,y:{ticksAndLabels:{labels},title:{text:"Group",fontSize:11,offset:80,overlap:"allow"}}});
      assert.equal(p.guideConfigs.axis.y.title.overlap,"allow");
      assert.equal(p.graphicSpec.objects.yAxisTitle.properties.x,240);
      assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      if(factory===chart){
        const before=serializeProgram(p);assert.throws(()=>p.editYAxisTitle({overlap:"error"}),/title overlaps the axis labels/);assert.equal(serializeProgram(p),before);
        assert.equal(p.editYAxisTitle({offset:300,overlap:"error"}).guideConfigs.axis.y.title.overlap,"error");
        assert.equal(p.editYAxisLabels({color:"red"}).guideConfigs.axis.y.title.overlap,"allow");
      }
      assert.ok((await renderToPNGBuffer(p)).buffer.length>100);
      assert.ok((await renderToPDFBuffer(p)).buffer.length>100);
    }
  } },
  { id: "guides/create-canvas-2", async run() {
for (const factory of [chart,basicChart]) for(const channel of ["color","stroke"]) {
      const scale={domain:[35,85],palette:"viridis"};
      const channelOption={field:"v",fieldType:"quantitative",scale};
      const p=factory().createCanvas({width:800,height:700,margin:200})
        .createData({values:[{x:0,y:0,v:35},{x:1,y:1,v:60},{x:2,y:0,v:85}]})
        .createScatterPlot({x:"x",y:"y",guides:false,[channel]:channelOption})
        .createLegend({values:[40,60,80],gradient:{length:125}});
      const prefix=channel+"Gradient";
      assert.deepEqual(p.graphicSpec.objects[prefix+"Labels"].items.map(i=>i.properties.text),["40","60","80"]);
      const top=Math.min(...p.graphicSpec.objects[prefix+"Strips"].items.map(i=>i.properties.y));
      const offsets=p.graphicSpec.objects[prefix+"Ticks"].items.map(i=>i.properties.y1-top);
      offsets.forEach((v,i)=>assert.ok(Math.abs(v-[112.5,62.5,12.5][i])<1e-9));
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      if(factory===chart){
        const q=p.editLegend({values:"auto",count:3});
        assert.equal(q.guideConfigs.legend[channel==="color"?"gradient":"strokeGradient"].sampling,undefined);
        assert.throws(()=>p.editScale({id:channel,domain:[35,70]}),/outside the scale domain/);
      }
      assert.ok((await renderToPNGBuffer(p)).buffer.length>100);
      assert.ok((await renderToPDFBuffer(p)).buffer.length>100);
    }
  } },
  { id: "guides/create-canvas-3", async run() {
{
      const tickRows=[{x:0,y:0,v:35},{x:1,y:1,v:60},{x:2,y:0,v:85}];
      const base=chart().createCanvas({width:800,height:700,margin:200}).createData({values:tickRows})
        .createRugPlot({x:"x",edge:"bottom",guides:false}).encodeY({field:"y"});
      const numeric=base.encodeColor({field:"v",fieldType:"quantitative",scale:{domain:[35,85],range:["blue","red"]}})
        .createLegend({values:[40,60,80],gradient:{length:125}});
      assert.deepEqual(numeric.graphicSpec.objects.rugPlot.items.map(i=>i.properties.stroke),["#0000ff","#800080","#ff0000"]);
      assert.ok(numeric.graphicSpec.objects.colorGradientStrips.items.every(i=>i.properties.fill===i.properties.stroke&&i.properties.strokeWidth===0));
      assert.deepEqual(numeric.semanticSpec.datasets[0].values,tickRows);
      assert.throws(()=>numeric.encodeStroke({value:"green"}),/Tick color and stroke cannot coexist/);
      assert.deepEqual(deserializeProgram(serializeProgram(numeric)).graphicSpec,numeric.graphicSpec);
      assert.ok((await renderToPNGBuffer(numeric)).buffer.length>100);assert.ok((await renderToPDFBuffer(numeric)).buffer.length>100);
      assert.equal(basicChart().createTickMark,undefined);
    }
  } },
  { id: "guides/create-canvas-4", async run() {
for (const factory of [chart,basicChart]) {
      const lineRows=[undefined,null,"Reference"].flatMap(kind=>[0,1].map(x=>({x,y:x,...(kind===undefined?{}:{kind})})));
      const pendingColor=factory().createCanvas().createData({values:lineRows}).createLineMark()
        .encodeColor({field:"kind",scale:{domain:["Reference"],unknown:"transparent"}});
      assert.throws(()=>pendingColor.encodeX({field:"x",bin:{maxBins:4}}),/Cartesian line/);
      if(factory===chart) assert.throws(()=>pendingColor.encodeTheta({field:"x"}),/Cartesian line/);
      const missingColor=factory().createCanvas({width:440,height:220,margin:{left:20,right:160,top:10,bottom:20}})
        .createData({id:"raw",values:lineRows})
        .createLinePlot({id:"paths",x:"x",y:"y",color:{field:"kind",scale:{domain:["Regression","Reference"],range:["firebrick","black"],unknown:"transparent"}},guides:false})
        .createLegend({channels:["color"],title:"Line"});
      assert.deepEqual(missingColor.graphicSpec.objects.paths.items.map(item=>item.properties.stroke),["transparent","transparent","black"]);
      assert.deepEqual(missingColor.semanticSpec.datasets[0].values,lineRows);
      assert.deepEqual(missingColor.resolvedScales.color.domain,["Regression","Reference"]);
      assert.deepEqual(deserializeProgram(serializeProgram(missingColor)).graphicSpec,missingColor.graphicSpec);
      assert.match(renderToSVG(missingColor),/Regression/);
      assert.ok((await renderToPNGBuffer(missingColor)).buffer.length>100);
      assert.ok((await renderToPDFBuffer(missingColor)).buffer.length>100);
    }
  } },
  { id: "guides/underlay-plot", async run() {
const underlayPlot=createPlotUnderlayProgram();
assert.deepEqual(underlayPlot.graphicSpec.objects["plot-main"].children,
      ["horizontalGridLines","plotBorder","xAxisLine","barPlot"]);
assert.equal(underlayPlot.guideConfigs.axis.x.frame.underlay,true);
assert.equal(underlayPlot.materializationConfigs.canvas.plotBorder.underlay,true);
assert.deepEqual(deserializeProgram(serializeProgram(underlayPlot)).graphicSpec,underlayPlot.graphicSpec);
const defaultPlot=underlayPlot.editXAxis({underlay:false}).editCanvas({plotBorder:{underlay:false}});
assert.deepEqual(defaultPlot.graphicSpec,createPlotUnderlayProgram({axisUnderlay:false,borderUnderlay:false}).graphicSpec);
assert.notEqual(renderToSVG(underlayPlot),renderToSVG(defaultPlot));
assert.ok((await renderToPNGBuffer(underlayPlot)).buffer.length>100);
assert.ok((await renderToPDFBuffer(underlayPlot)).buffer.length>100);
const onlyOrder=underlayPlot.editGraphics({target:"plot-main",property:"children",
      value:["horizontalGridLines","barPlot","plotBorder","xAxisLine"]});
assert.deepEqual(onlyOrder.graphicSpec,defaultPlot.graphicSpec);
assert.throws(()=>underlayPlot.editGraphics({target:"plot-main",property:"children",value:["barPlot"]}));
  } },
  { id: "guides/spaced-base", async run() {
const spacedBase = chart().createCanvas({width:500,height:400,margin:130})
      .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:1}]})
      .createScatterPlot({x:"x",y:"y",guides:false}).encodeSize({field:"v"});
const spacedControl = spacedBase.createLegend({channels:["size"]});
const spaced = spacedControl.editLegendLayout({rowPadding:7,titlePadding:20});
assert.equal(spaced.guideConfigs.legend.size.rowPadding,7);
assert.equal(spaced.guideConfigs.legend.size.titlePadding,20);
assert.deepEqual(spacedBase.createLegend({channels:["size"],rowPadding:7,titlePadding:20}).graphicSpec,spaced.graphicSpec);
assert.deepEqual(deserializeProgram(serializeProgram(spaced)).editCanvas({width:550}).graphicSpec,spaced.editCanvas({width:550}).graphicSpec);
assert.deepEqual(spaced.editLegend({rowPadding:"auto",titlePadding:"auto"}).graphicSpec,spacedControl.graphicSpec);
assert.notEqual(renderToSVG(spaced),renderToSVG(spacedControl));
assert.ok((await renderToPNGBuffer(spaced)).buffer.length>100);
assert.ok((await renderToPDFBuffer(spaced)).buffer.length>100);
assert.throws(()=>spaced.editLegendLayout({rowPadding:-1}));
  } },
  { id: "guides/spaced-basic", async run() {
const spacedBasic = basicChart().createCanvas({width:500,height:400,margin:130})
      .createData({values:[{x:0,y:0,g:"A"},{x:1,y:1,g:"B"}]})
      .createScatterPlot({x:"x",y:"y",guides:false}).encodeColor({field:"g"})
      .createLegend({rowPadding:0,titlePadding:20});
assert.equal(spacedBasic.guideConfigs.legend.color.rowPadding,0);
assert.equal(spacedBasic.editLegendLayout,undefined);
  } },
  { id: "guides/create-canvas-5", async run() {
for (const create of [chart, basicChart]) {
      const placedAxis = create().createCanvas({ width: 900, height: 800, margin: 200 })
        .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
        .createScatterPlot({ x: "x", y: "y", guides: false })
        .createXAxis({ offset: 20, title: {
          text: "Inside", offset: -50, alongOffset: 85, align: "right", baseline: "bottom"
        }, ticksAndLabels: { labels: { align: "left" } } });
      assert.equal(placedAxis.graphicSpec.objects.xAxisLine.properties.y1, 620);
      assert.equal(placedAxis.graphicSpec.objects.xAxisTitle.properties.x, 535);
      assert.equal(placedAxis.graphicSpec.objects.xAxisTitle.properties.y, 570);
      assert.deepEqual(deserializeProgram(serializeProgram(placedAxis)).graphicSpec, placedAxis.graphicSpec);
      assert.ok((await renderToPNGBuffer(placedAxis)).buffer.length > 100);
      assert.ok((await renderToPDFBuffer(placedAxis)).buffer.length > 100);
      const namedAxes = create().createCanvas({ width: 600, height: 400, margin: 80 })
        .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
        .createScatterPlot({ x: "x", y: "y", guides: false })
        .createAxes({ x: false, y: [{ id: "left", position: "left" }, { id: "right", position: "right" }] });
      assert.equal(namedAxes.semanticSpec.guides.axis.right.channel, "y");
      assert.equal(namedAxes.graphicSpec.objects.axis_right__Line.properties.x1, 520);
      assert.deepEqual(deserializeProgram(serializeProgram(namedAxes)).graphicSpec, namedAxes.graphicSpec);
      assert.ok((await renderToPNGBuffer(namedAxes)).buffer.length > 100);
      assert.ok((await renderToPDFBuffer(namedAxes)).buffer.length > 100);
      if (create === chart) {
        const changed = namedAxes.editYAxisTitle({ target: "right", text: "Share" })
          .editCanvas({ width: 700 }).removeYAxis({ target: "left" });
        assert.equal(changed.graphicSpec.objects.axis_right__Line.properties.x1, 620);
        assert.equal(changed.guideConfigs.axis.left, undefined);
      }
      const dashedGuides = create().createCanvas({ width: 700, height: 500, margin: 100 })
        .createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 2 }] })
        .createScatterPlot({ x: "x", y: "y", guides: false })
        .createYAxis({ ticksAndLabels: { values: [0, 1, 2], ticks: {
          strokeDash: [2, 2], strokeDashMap: [{ value: 0, strokeDash: [] }]
        } } })
        .createHorizontalGrid({ values: [0, 1, 2], strokeDash: [2, 2],
          strokeDashMap: [{ value: 0, strokeDash: [] }] });
      assert.deepEqual(dashedGuides.graphicSpec.objects.yAxisTicks.items.map(item => item.properties.strokeDash),
        [[], [2, 2], [2, 2]]);
      assert.deepEqual(deserializeProgram(serializeProgram(dashedGuides)).graphicSpec, dashedGuides.graphicSpec);
      assert.ok((await renderToPNGBuffer(dashedGuides)).buffer.length > 100);
      assert.ok((await renderToPDFBuffer(dashedGuides)).buffer.length > 100);
    }
  } },
  { id: "guides/polygon-vertices", async run() {
const polygonVertices = [{x:-1.5,y:-1.5},{x:1.5,y:-1.5},{x:0,y:1.5}];
for (const factory of [chart, basicChart]) for (const shape of ["wedge", "arrow",
      {polygon:polygonVertices}, {polygon:polygonVertices,normalization:"radius"}]) {
      const directional = factory().createCanvas({width: 300, height: 200, margin: 50})
        .createData({values:[{x:0,y:0,g:"A"},{x:1,y:1,g:"B"}]})
        .createScatterPlot({x:"x",y:"y",point:{shape},guides:false});
      assert.equal(directional.graphicSpec.objects.scatterPlot.items[0].type, "path");
      assert.deepEqual(deserializeProgram(serializeProgram(directional)).graphicSpec, directional.graphicSpec);
      assert.ok((await renderToPNGBuffer(directional)).buffer.length > 100);
      if (typeof shape === "object") {
        const encoded = directional.encodeShape({field:"g",scale:{domain:["A","B"],
          range:[shape,"circle"],unknown:shape}}).createLegend({channels:["shape"]});
        assert.equal(encoded.graphicSpec.objects.scatterPlot.items[0].type,"path");
        assert.equal(encoded.graphicSpec.objects.scatterPlot.items[1].type,"circle");
        assert.deepEqual(deserializeProgram(serializeProgram(encoded)).graphicSpec,encoded.graphicSpec);
        assert.ok((await renderToPDFBuffer(encoded)).buffer.length > 100);
      }
    }
  } },
  { id: "guides/mapped-size", async run() {
const mappedSize = chart().createCanvas({width:700,height:500,margin:160})
      .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:10}]})
      .createScatterPlot({x:"x",y:"y",size:"v",guides:false})
      .createLegend({channels:["size"],values:[0,5,10]})
      .editLegendBlock({target:"scatterPlot",channel:"size",labelMap:[{value:5,label:"middle"}]});
const dashedSize=mappedSize.editLegendBorder({border:{strokeDash:[4,2,6,1]}});
assert.equal(dashedSize.graphicSpec.objects.sizeLegendBackground.type,"path");
assert.deepEqual(dashedSize.graphicSpec.objects.sizeLegendBackground.properties.strokeDash,[4,2,6,1]);
assert.deepEqual(deserializeProgram(serializeProgram(dashedSize)).graphicSpec,dashedSize.graphicSpec);
assert.ok((await renderToPNGBuffer(dashedSize)).buffer.length>100);
assert.deepEqual(mappedSize.graphicSpec.objects.sizeLegendLabels.items.map(item=>item.properties.text),["0","middle","10"]);
assert.equal(mappedSize.graphicSpec.objects.sizeLegendSymbols.items.length,3);
assert.deepEqual(deserializeProgram(serializeProgram(mappedSize)).graphicSpec,mappedSize.graphicSpec);
assert.ok((await renderToPNGBuffer(mappedSize)).buffer.length>100);
const localSize=mappedSize.editLegendBlock({target:"scatterPlot",channel:"size",position:"top-left"});
assert.equal(localSize.guideConfigs.legend.size.blockOverrides['["size"]'].position,"top-left");
assert.deepEqual(deserializeProgram(serializeProgram(localSize)).graphicSpec,localSize.graphicSpec);
assert.deepEqual(localSize.editLegendLayout({channel:"size",position:"inherit"}).graphicSpec,mappedSize.graphicSpec);
assert.ok((await renderToPNGBuffer(localSize)).buffer.length>100);
  } },
  { id: "guides/independent-ramp", async run() {
const independentRamp=chart().createCanvas({width:900,height:700,margin:200})
      .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:10}]})
      .createScatterPlot({x:"x",y:"y",guides:false})
      .encodeColor({field:"v",fieldType:"quantitative"})
      .createLegend({position:"right",direction:"horizontal",titlePosition:"bottom",gradient:{length:120,thickness:16}});
assert.equal(independentRamp.graphicSpec.objects.colorGradientLabels.items[0].properties.textAlign,"center");
assert.equal(independentRamp.guideConfigs.legend.gradient.gradientDirection,"horizontal");
assert.deepEqual(deserializeProgram(serializeProgram(independentRamp)).graphicSpec,independentRamp.graphicSpec);
assert.equal(independentRamp.editLegendLayout({direction:"auto",titlePosition:"top"}).guideConfigs.legend.gradient.gradientDirection,undefined);
assert.ok((await renderToPNGBuffer(independentRamp)).buffer.length>100);
  } },
  { id: "guides/create-canvas-6", async run() {
for(const factory of [chart,basicChart]){
      const combined=factory().createCanvas({width:1000,height:800,margin:250})
        .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:10}]})
        .createScatterPlot({x:"x",y:"y",guides:false})
        .encodeColor({field:"v",fieldType:"quantitative",scale:{domain:[0,10],range:["black","white"]}})
        .encodeSize({field:"v",scale:{domain:[0,10],range:[Math.PI,9*Math.PI]}})
        .createLegend({combine:"color-size",values:[0,5,10]});
      assert.deepEqual(combined.graphicSpec.objects.colorSizeLegendSymbols.items.map(item=>item.properties.radius),[1,Math.sqrt(5),3]);
      assert.deepEqual(deserializeProgram(serializeProgram(combined)).graphicSpec,combined.graphicSpec);
      assert.ok((await renderToPNGBuffer(combined)).buffer.length>100);
      if(factory===chart){
        const edited=combined.editLegendSymbols({channel:"color",symbol:{opacity:0.7}})
          .editLegendBlock({target:"scatterPlot",channel:"size",labelMap:[{value:5,label:"middle"}],clipHeight:2});
        assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec,edited.graphicSpec);
        const split=edited.editLegend({combine:"separate"});assert.ok(split.guideConfigs.legend.gradient);assert.ok(split.guideConfigs.legend.size);
      }
    }
  } },
  { id: "guides/create-canvas-7", async run() {
for (const [settings, expected] of [
      [{interpolate:"lab",whitePoint:"d50",range:["red","blue"]}, "#c10088"],
      [{type:"pow",exponent:3,range:["black","white"]}, "#202020"],
      [{interpolate:"cubehelix",gamma:2.2,range:["black","white"]}, "#373737"],
      [{interpolate:"cubehelix",gamma:0,range:["#75190b","#90f2a4"]}, "#d2d87c"],
      [{interpolate:"cubehelix",gamma:-.1,range:["#75190b","#90f2a4"]}, "#dce195"]
    ]) {
      for (const factory of [chart, basicChart]) {
      const controls = factory().createCanvas({width:600,height:500,margin:{left:70,top:70,right:180,bottom:70}})
        .createData({values:[{x:0,y:0,v:0},{x:1,y:1,v:.5},{x:2,y:2,v:1}]})
        .createScatterPlot({x:"x",y:"y",guides:false})
        .encodeColor({field:"v",fieldType:"quantitative",scale:{domain:[0,1],...settings}})
        .createLegend({representation:"symbols",values:[0,.5,1],title:false});
      assert.equal(controls.graphicSpec.objects.scatterPlot.items[1].properties.fill, expected);
      assert.equal(controls.graphicSpec.objects.colorGradientSymbols.items[1].properties.fill, expected);
      assert.deepEqual(deserializeProgram(serializeProgram(controls)).graphicSpec,controls.graphicSpec);
      assert.ok((await renderToPNGBuffer(controls)).buffer.length>100);
      assert.ok((await renderToPDFBuffer(controls)).buffer.length>100);
      assert.ok(renderToSVG(controls).includes(expected));
      }
    }
  } },
  { id: "guides/blank-lines", async run() {
const blankLines = chart().createCanvas({ width: 600, height: 500, margin: 160 })
      .createTitle({ text: "\nTitle\n", subtitle: "First\n\nLast\n", titleStyle: { fontSize: 12 } });
assert.equal(blankLines.graphicSpec.objects.chartTitle.properties.text, "Title");
assert.deepEqual(blankLines.graphicSpec.objects.chartSubtitle.items.map(item => item.properties.text), ["First", "Last"]);
assert.doesNotThrow(() => renderToSVG(blankLines));
assert.deepEqual(deserializeProgram(serializeProgram(blankLines)).graphicSpec, blankLines.graphicSpec);
assert.ok((await renderToPNGBuffer(blankLines)).buffer.length > 1000);
  } },
  { id: "guides/blank-legend", async run() {
const blankLegend = chart().createCanvas({ width: 600, height: 500, margin: 160 })
      .createData({ values: [{ x: 1, y: 2, g: "" }, { x: 2, y: 3, g: "A" }] })
      .createScatterPlot({ x: "x", y: "y", color: "g", guides: false })
      .createLegend({ title: false })
      .editLegendBlock({ target: "scatterPlot", channel: "color", labelMap: [{ value: "", label: "" }] });
assert.deepEqual(blankLegend.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["A"]);
assert.equal(blankLegend.graphicSpec.objects.colorLegendSymbols.items.length, 2);
assert.doesNotThrow(() => renderToSVG(blankLegend));
assert.deepEqual(deserializeProgram(serializeProgram(blankLegend)).graphicSpec, blankLegend.graphicSpec);
assert.ok((await renderToPNGBuffer(blankLegend)).buffer.length > 1000);
  } },
  { id: "guides/create-canvas-8", async run() {
for (const factory of [chart, basicChart]) for (const channel of ["color", "stroke"]) {
      let ramp = factory().createCanvas({ width: 800, height: 600, margin: 150 })
        .createData({ values: [{ x: 1, y: 2, n: 1 }, { x: 2, y: 3, n: 2 }] })
        .createScatterPlot({ x: "x", y: "y", guides: false,
          ...(channel === "stroke" ? { stroke: { field: "n", fieldType: "quantitative" } } : {}) });
      if (channel === "color") ramp = ramp.encodeColor({ field: "n", fieldType: "quantitative" });
      const translucent = ramp.createLegend({ channels: [channel], gradient: { opacity: 0.7 } });
      const strips = translucent.graphicSpec.objects[channel + "GradientStrips"].items;
      assert.equal(strips.length, 60);
      assert.ok(strips.every(item => item.properties.opacity === 0.7));
      assert.deepEqual(deserializeProgram(serializeProgram(translucent)).graphicSpec, translucent.graphicSpec);
      assert.ok(renderToSVG(translucent).includes('opacity="0.7"'));
      assert.ok((await renderToPNGBuffer(translucent)).buffer.length > 1000);
    }
  } },
  { id: "guides/create-canvas-9", async run() {
for (const factory of [chart, basicChart]) {
      const sampled = factory().createCanvas({ width: 500, height: 400, margin: 100 })
        .createData({ values: [{ x: 1, y: 1, v: 1 }, { x: 2, y: 2, v: 9 }] })
        .createScatterPlot({ x: "x", y: "y", color: { field: "v", fieldType: "quantitative" }, guides: {
          axes: false, grid: false, legend: { representation: "symbols", values: [2, 4, 6, 8], position: "top-left", symbol: { radius: 5 } }
        } });
      const items = sampled.graphicSpec.objects.colorGradientSymbols.items;
      assert.deepEqual(items.map(item => item.properties.fill), ["#472d7b", "#2c728e", "#28ae80", "#abdc32"]);
      assert.ok(items.every(item => item.properties.radius === 5));
      assert.equal(sampled.graphicSpec.objects.colorGradientStrips, undefined);
      assert.deepEqual(deserializeProgram(serializeProgram(sampled)).graphicSpec, sampled.graphicSpec);
      if (factory === chart) {
        const gradient = sampled.editLegend({ representation: "gradient" });
        assert.ok(gradient.graphicSpec.objects.colorGradientStrips);
        assert.equal(gradient.graphicSpec.objects.colorGradientSymbols, undefined);
      }
    }
  } },
  { id: "guides/create-canvas-10", async run() {
for (const factory of [chart, basicChart]) {
      const labels = ["Long sample category alpha", "Long sample category beta"];
      const inner = factory().createCanvas({ plot: { width: 30, height: 30 } })
        .createData({ values: labels.flatMap((x, i) => labels.map((y, j) => ({ x, y, z: i + j }))) })
        .createHeatmap({ x: "x", y: "y", color: { field: "z", fieldType: "quantitative" },
          guides: { legend: false, axes: {
            x: { title: false, ticksAndLabels: { labels: { rotation: { value: -90, unit: "degrees" }, fontSize: 10 } } },
            y: { title: false, ticksAndLabels: { labels: { fontSize: 10 } } }
          } }
        });
      const { margin, plot } = inner.materializationConfigs.canvas;
      const canvas = inner.graphicSpec.objects.canvas.properties;
      assert.deepEqual(plot, { width: 30, height: 30 });
      assert.equal(canvas.width - margin.left - margin.right, 30);
      assert.equal(canvas.height - margin.top - margin.bottom, 30);
      assert.ok(margin.left > 50 && margin.bottom > 50);
      assert.match(renderToSVG(inner), /Long sample category alpha/);
      assert.deepEqual(deserializeProgram(serializeProgram(inner)).graphicSpec, inner.graphicSpec);
      const png = await renderToPNGBuffer(inner);
      assert.equal(png.buffer.readUInt32BE(16), Math.ceil(canvas.width));
      assert.equal(png.buffer.readUInt32BE(20), Math.ceil(canvas.height));
    }
  } },
  { id: "guides/create-canvas-11", async run() {
for (const factory of [chart, basicChart]) {
      const scoped = factory().createCanvas({ width: 300, height: 200, margin: 24 })
        .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
        .applyTheme({ theme: { base: "light", tokens: {
          axisLabelFontSize: 6, axisLabelFontFamily: "serif", axisLabel: "red"
        } } })
        .createScatterPlot({ x: "x", y: "y", guides: { axes: {
          x: { title: false }, y: false
        }, grid: false, legend: false } });
      assert.equal(scoped.graphicSpec.objects.xAxisLabels.items[0].properties.fontSize, 6);
      assert.equal(scoped.graphicSpec.objects.xAxisLabels.items[0].properties.fill, "red");
      assert.deepEqual(deserializeProgram(serializeProgram(scoped)).graphicSpec, scoped.graphicSpec);
      assert.ok((await renderToPNGBuffer(scoped)).buffer.length > 1000);
    }
  } },
  { id: "guides/inside-legend", async run() {
const insideLegend = chart().createCanvas({ width: 600, height: 600, margin: 60 })
      .createData({ values: Array.from({ length: 107 }, (_, i) => ({ x: i, y: i % 7, group: i })) })
      .createLinePlot({ x: "x", y: "y", groupBy: "group", color: { field: "group", fieldType: "nominal" }, guides: false })
      .createLegend({ position: "top-left", overflow: { maxItems: 29 },
        itemGap: 12, title: false, border: { background: "white" } });
assert.equal(insideLegend.graphicSpec.objects.seriesLegendLabels.items.at(-1).properties.text, "…78 entries");
assert.equal(insideLegend.graphicSpec.objects.seriesLegendSymbols.items.length, 29);
assert.equal(insideLegend.guideConfigs.legend.series.domain.length, 107);
assert.equal(serializeProgram(deserializeProgram(serializeProgram(insideLegend))), serializeProgram(insideLegend));
assert.ok((await renderToPNGBuffer(insideLegend)).buffer.length > 1000);
  } },
  { id: "guides/stroked", async run() {
for (const factory of [chart, basicChart]) {
      const stroked = factory().createCanvas({ width: 800, height: 500, margin: 150 })
        .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
        .createScatterPlot({ x: "x", y: "y", stroke: { field: "group", scale: { range: ["red", "blue"] } },
          point: { fill: "none", strokeWidth: 2 } });
      assert.deepEqual(stroked.graphicSpec.objects.scatterPlot.items.map(item => item.properties.stroke), ["red", "blue"]);
      assert.equal(stroked.guideConfigs.legend.stroke.target, "scatterPlot");
      assert.deepEqual(deserializeProgram(serializeProgram(stroked)).graphicSpec, stroked.graphicSpec);
      assert.match(renderToSVG(stroked), /stroke="red"/);
    }
const stroked = chart()
      .createCanvas({
        width: 500,
        height: 300,
        margin: { top: 40, right: 160, bottom: 40, left: 40 }
      })
      .createData({ values: [
        { x: 0, y: 0, outline: "A" },
        { x: 1, y: 1, outline: "B" }
      ] })
      .createPointMark({ id: "strokedPoints", stroke: "black", strokeWidth: 2 })
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeStroke({ field: "outline" })
      .createLegend({ channels: ["stroke"] })
      .editStrokeScale({ target: "strokedPoints", range: ["#ff0000", "#0000ff"] });
assert.deepEqual(
      stroked.graphicSpec.objects.strokedPoints.items.map(item => item.properties.stroke),
      ["#ff0000", "#0000ff"]
    );
assert.equal(stroked.semanticSpec.guides.legend.stroke.scale, "stroke");
  } },
  { id: "guides/create-canvas-12", async run() {
for (const factory of [chart, basicChart]) {
      const seed = factory().createCanvas({ width: 800, height: 500, margin: 150 })
        .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
        .createScatterPlot({ x: "x", y: "y", color: "group", size: "y", guides: false });
      const hidden = seed.createLegend({ title: false });
      assert.equal(hidden.guideConfigs.legend.color.titleVisible, false);
      assert.equal(hidden.guideConfigs.legend.size.titleVisible, true);
      if (factory === chart) {
        const edited = seed.createLegend().editLegend({ title: false });
        assert.deepEqual(hidden.guideConfigs, edited.guideConfigs);
        assert.deepEqual(hidden.graphicSpec, edited.graphicSpec);
      }
      assert.deepEqual(deserializeProgram(serializeProgram(hidden)).graphicSpec, hidden.graphicSpec);
      assert.match(renderToSVG(hidden), /<svg/);
    }
  } },
  { id: "guides/category-sizes", async run() {
const categorySizes = chart().createCanvas({
      width: 800, height: 500, margin: { left: 60, right: 260, top: 60, bottom: 130 }
    }).createData({ values: [
      { x: 1, y: 2, group: 10 }, { x: 2, y: 3, group: "10" }, { x: 3, y: 1, group: false }
    ] }).createScatterPlot({
      id: "categories", x: "x", y: "y",
      size: { field: "group", fieldType: "nominal", scale: { range: [36, 9, 81] } },
      guides: false
    }).createLegend({ channels: ["size"] })
      .encodeColor({ field: "y", fieldType: "quantitative" })
      .createLegend({ channels: ["color"], position: "bottom" });
assert.deepEqual(categorySizes.resolvedScales.size.domain, [10, "10", false]);
assert.deepEqual(categorySizes.graphicSpec.objects.sizeLegendLabels.items.map(item => item.properties.text),
      ["10", "10", "false"]);
categorySizes.graphicSpec.objects.categories.items.forEach((item, index) => {
      assert.ok(Math.abs(Math.PI * item.properties.radius ** 2 - [36, 9, 81][index]) < 1e-10);
    });
assert.match(renderToSVG(categorySizes), />false<[/]text>/);
assert.deepEqual(deserializeProgram(serializeProgram(categorySizes)).graphicSpec, categorySizes.graphicSpec);
const { buffer: categoryPNG } = await renderToPNGBuffer(categorySizes);
assert.equal(categoryPNG.readUInt32BE(16), 800);
assert.equal(categoryPNG.readUInt32BE(20), 500);
assert.ok(categoryPNG.length > 1000);
  } },
  { id: "guides/bounded-combined-seed", async run() {
const boundedCombinedSeed = chart().createCanvas({ width: 900, height: 700,
      margin: { left: 40, top: 40, right: 400, bottom: 40 } })
      .createData({ values: ["A", "B", "C", "D", "E"].map((group, i) => ({ x: i, y: i, group })) })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .encodeColor({ field: "group" }).encodeSize({ field: "group", fieldType: "nominal" });
const boundedCombined = boundedCombinedSeed.createGuides({ axes: false, grid: false,
      legend: { channels: ["color", "size"], overflow: { maxItems: 2 } } });
for (const kind of ["color", "size"]) {
      assert.deepEqual(boundedCombined.graphicSpec.objects[kind + "LegendLabels"].items.map(item => item.properties.text),
        ["A", "B", "…3 entries"]);
      assert.equal(boundedCombined.graphicSpec.objects[kind + "LegendSymbols"].items.length, 2);
    }
const restoredCombined = deserializeProgram(serializeProgram(boundedCombined));
assert.deepEqual(restoredCombined.editLegend({ overflow: false }).graphicSpec,
      boundedCombinedSeed.createLegend({ channels: ["color", "size"] }).graphicSpec);
  } },
  { id: "guides/installed-appearance", async run() {
const installedAppearance = chart()
      .createCanvas({
        width: 760, height: 600,
        margin: { top: 140, right: 240, bottom: 140, left: 90 }
      })
      .createData({ id: "appearanceRows", values: [
        { x: 0, y: 1, other: 9, group: "A", magnitude: 10 },
        { x: 1, y: 3, other: 4, group: "B", magnitude: 50 },
        { x: 2, y: 2, other: 12, group: "C", magnitude: 100 }
      ] })
      .createPointMark({ id: "appearancePoints", stroke: "#111827", strokeWidth: 3 })
      .encodeChannels({ target: "appearancePoints", channels: {
        x: { field: "x" }, y: { field: "y" }, color: { field: "group" },
        stroke: { field: "group" },
        size: { field: "magnitude", scale: { domain: [0, 100], range: [20, 120] } }
      } })
      .createLegend({
        target: "appearancePoints", channels: ["color", "stroke", "size"]
      })
      .selectMarks({
        id: "appearanceSelection", target: "appearancePoints",
        field: "other", op: "max", count: 2
      })
      .createMarkLabels({
        id: "appearanceLabels", source: "appearancePoints", field: "other",
        selection: "appearanceSelection", placement: { anchor: "center" }
      })
      .createReferenceLine({
        id: "appearanceMean", source: "appearancePoints", axis: "y",
        statistic: { op: "mean" }
      })
      .encodeChannels({ target: "appearancePoints", channels: {
        y: { field: "other", scale: { id: "appearanceY", nice: false, zero: false } },
        stroke: { value: "#0f172a" }
      } })
      .editLegendBlock({
        target: "appearancePoints", channel: "color",
        labelMap: [{ value: "A", label: "Alpha" }]
      })
      .applyTheme({
        theme: { base: "light", tokens: {
          background: "#fff7ed", fontFamily: "PackageConsumer"
        } }
      })
      .editPointMark({
        target: "appearancePoints", strokeWidth: 5,
        lineCap: "square", lineJoin: "round", miterLimit: 6
      });
assert.deepEqual(installedAppearance.graphicSpec.objects.appearanceLabels.items.map(
      item => item.properties.text
    ), ["9", "12"]);
assert.deepEqual(installedAppearance.semanticSpec.datasets.find(
      dataset => dataset.id === "appearanceMean-statistical-reference-data"
    ).values, [{ value: 25 / 3 }]);
assert.equal(installedAppearance.graphicSpec.objects.appearancePoints.items[0]
      .properties.lineCap, "square");
assert.equal(installedAppearance.removeTheme().graphicSpec.objects.canvas
      .properties.background, "white");
  } },
  { id: "guides/installed-display-axis", async run() {
const installedDisplayAxis = basicChart()
      .createCanvas({ width: 360, height: 240, margin: 70 })
      .createData({ values: [
        { category: 1, value: 1 },
        { category: "1", value: 2 }
      ] })
      .createPointMark()
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value" })
      .createXAxisLabels({
        labelMap: [
          { value: 1, label: "One" },
          { value: "1", label: "String one" }
        ]
      });
assert.deepEqual(installedDisplayAxis.graphicSpec.objects.xAxisLabels.items.map(
      item => item.properties.text
    ), ["One", "String one"]);
assert.match(renderToSVG(installedDisplayAxis), />One<.*>String one</s);
  } },
  { id: "guides/installed-facet-headers", async run() {
const installedFacetHeaders = chart()
      .createCanvas({ width: 240, height: 180, margin: 45 })
      .createData({ values: [
        { x: 1, y: 2, row: "A", column: "X" },
        { x: 2, y: 3, row: "B", column: "Y" }
      ] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .facetGrid({ rows: { field: "row" }, columns: { field: "column" } })
      .editFacetHeaders({ role: "row", labelMap: [{ value: "A", label: "Alpha" }] })
      .editFacetHeaders({ role: "column", side: "bottom" });
assert.deepEqual(installedFacetHeaders.graphicSpec.objects["facetGrid-headers"].items.map(
      item => item.properties.text
    ), ["X", "Y", "Alpha", "B"]);
assert.match(renderToSVG(installedFacetHeaders), />Alpha</);
const installedFieldTitle = installedFacetHeaders.editFacetHeaders({role:"row",title:{text:"Region"}});
assert.equal(installedFieldTitle.graphicSpec.objects["facetGrid-headers"].items.at(-1).properties.text,"Region");
assert.match(renderToSVG(installedFieldTitle),/>Region</);
assert.deepEqual(installedFieldTitle.editFacetHeaders({role:"row",title:false}).graphicSpec,installedFacetHeaders.graphicSpec);
  } },
  { id: "guides/polar-base", async run() {
const polarBase = chart()
      .createCanvas({ width: 240, height: 240, margin: 40 })
      .createData({ values: [
        { angle: 0, distance: 2, group: "A" },
        { angle: 120, distance: 4, group: "A" },
        { angle: 240, distance: 3, group: "A" }
      ] });
const polarScatter = polarBase.createPolarScatterPlot({
      theta: "angle", radius: "distance", color: "group",
      point: { radius: 4 }, guides: false
    });
const polarLine = polarBase.createPolarLinePlot({
      theta: "angle", radius: "distance", groupBy: "group",
      line: { closed: true }, guides: false
    });
const radar = polarBase.createRadarPlot({
      category: "angle", value: "distance", groupBy: "group",
      order: [0, 120, 240], guides: false
    });
const rug = polarBase.createRugPlot({
      x: "distance", edge: "bottom", tick: { length: 10 }, guides: false
    });
const strip = polarBase.createStripPlot({
      x: "distance",
      y: { field: "group", fieldType: "nominal" },
      jitter: { maxOffset: { band: 0.1 }, seed: "package-strip", key: "angle" },
      guides: false
    });
const beeswarm = polarBase.createBeeswarmPlot({
      id: "packageBeeswarm",
      x: { field: "group", fieldType: "nominal" },
      y: "distance",
      packing: { key: "angle", overflow: "overlap" },
      guides: false
    });
const raincloud = polarBase.createRaincloudPlot({
      id: "packageRaincloud",
      color: {field:"group",fieldType:"nominal",scale:{id:"packageRaincloudColor",type:"ordinal",range:{palette:{name:"viridis",count:5,extent:[0.1,0.9]}}}},
      category: { field: "group", fieldType: "nominal" },
      value: { field: "distance", fieldType: "quantitative" },
      density: { steps: 16 },
      points: { type: "beeswarm", packing: { key: "angle", overflow: "overlap" } },
      guides: false
    }).editRaincloudPlot({ target: "packageRaincloud", side: "after",
      color:{field:"group",fieldType:"nominal",scale:{id:"packageRaincloudColor",type:"ordinal",range:{palette:{name:"magma",count:7,extent:[0.08,0.92]}}}} });
assert.equal(raincloud.semanticSpec.scales.find(scale=>scale.id==="packageRaincloudColor").range.palette.name,"magma");
const ecdfData = polarBase.createECDFData({
      id: "packageECDFData", field: "distance", groupBy: "group"
    });
const ecdf = polarBase.createECDFPlot({
      id: "packageECDF", field: "distance", groupBy: "group", color: "group",
      labels: { format: ".0%" }, guides: false
    });
assert.equal(polarScatter.semanticSpec.layers[0].mark.type, "point");
assert.equal(polarScatter.semanticSpec.coordinates[0].type, "polar");
assert.equal(
      polarLine.graphicSpec.objects.polarLinePlot.items[0].properties.commands.at(-1).op,
      "Z"
    );
assert.equal(
      radar.graphicSpec.objects.radarPlot.items[0].properties.commands.at(-1).op,
      "Z"
    );
assert.equal(rug.graphicSpec.objects.rugPlot.items.length, 3);
assert.equal(strip.graphicSpec.objects.stripPlot.items.length, 3);
assert.equal(beeswarm.graphicSpec.objects.packageBeeswarm.items.length, 3);
assert.equal(beeswarm.materializationConfigs.pointPacking.packageBeeswarm.channel, "x");
assert.equal(raincloud.markConfigs.packageRaincloudCloud.raincloudPlot.side, "after");
assert.deepEqual(
      raincloud.markConfigs.packageRaincloudCloud.raincloudPlot.ownedChildIds,
      ["packageRaincloudCloud", "packageRaincloudSummary", "packageRaincloudPoints"]
    );
assert.deepEqual(
      beeswarm.removePointPacking({ target: "packageBeeswarm" })
        .materializationConfigs.pointPacking,
      undefined
    );
assert.equal(rug.trace.children.at(-1).op, "createRugPlot");
assert.equal(strip.trace.children.at(-1).op, "createStripPlot");
assert.equal(
      ecdfData.semanticSpec.datasets.find(dataset => dataset.id === "packageECDFData")
        .transform[0].type,
      "ecdf"
    );
assert.equal(ecdf.graphicSpec.objects.packageECDF.items.length, 1);
assert.equal(ecdf.graphicSpec.objects.packageECDFLabel.items[0].properties.text, "100%");
  } },
  { id: "guides/axis-lifecycle", async run() {
const axisLifecycle = chart()
      .createCanvas({ width: 240, height: 180, margin: 50 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .createAxes()
      .editXAxis({ ticksAndLabels: false })
      .editYAxis({ line: false, title: false });
assert.equal(axisLifecycle.graphicSpec.objects.xAxisTicks, undefined);
assert.equal(axisLifecycle.graphicSpec.objects.xAxisLabels, undefined);
assert.equal(axisLifecycle.graphicSpec.objects.yAxisLine, undefined);
assert.equal(axisLifecycle.graphicSpec.objects.yAxisTitle, undefined);
assert.ok(axisLifecycle.semanticSpec.layers[0].encoding.x);
assert.ok(axisLifecycle.resolvedScales.y);
  } },
  { id: "guides/fitted-labels", async run() {
const fittedLabels = chart()
      .createCanvas({ width: 520, height: 320, margin: 100 })
      .createData({ values: [
        { category: "North America Enterprise", value: 2 },
        { category: "European Mid Market", value: 4 },
        { category: "Asia Pacific Consumer", value: 3 }
      ] })
      .createPointMark()
      .encodeX({ field: "category", fieldType: "nominal" })
      .encodeY({ field: "value" })
      .createXAxis({
        ticksAndLabels: {
          labels: {
            maxWidth: 64,
            wrap: "word",
            rotation: { value: -25, unit: "degrees" }
          }
        },
        title: false
      })
      .fitCanvas({ padding: 4 });
assert.equal(fittedLabels.graphicSpec.objects.canvas.properties.width, 520);
assert.equal(fittedLabels.graphicSpec.objects.canvas.properties.height, 320);
assert.equal(fittedLabels.materializationConfigs.fitting.result.status, "fit");
assert.ok(fittedLabels.graphicSpec.objects.xAxisLabels.items.length > 3);
  } },
  { id: "guides/create-canvas-13", async run() {
for (const factory of [chart, basicChart]) {
      const orderedDash = factory().createCanvas({ width: 260, height: 180, margin: 24 })
        .createData({ values: [
          { level: 2, x: 0, y: 20 }, { level: 2, x: 1, y: 20 },
          { level: 1, x: 0, y: 10 }, { level: 1, x: 1, y: 10 }
        ] }).createLinePlot({ x: "x", y: "y", guides: false })
        .encodeStrokeDash({ field: "level", fieldType: "ordinal", scale: { domain: [1, 2], range: [[1, 0], [4, 2]] } });
      assert.equal(orderedDash.semanticSpec.layers[0].encoding.strokeDash.fieldType, "ordinal");
      assert.deepEqual(orderedDash.resolvedScales.strokeDash.domain, [1, 2]);
      assert.deepEqual(orderedDash.graphicSpec.objects.linePlot.items.map(item => item.properties.strokeDash), [[4, 2], [1, 0]]);
      const fallbackDash = orderedDash.encodeStrokeDash({ field: "level", fieldType: "ordinal",
        scale: { domain: [1], range: [[1, 0], [4, 2]], unknown: [] } });
      assert.deepEqual(fallbackDash.graphicSpec.objects.linePlot.items.map(item => item.properties.strokeDash), [[], [1, 0]]);
      assert.deepEqual(fallbackDash.resolvedScales.strokeDash.domain, [1]);
      assert.deepEqual(deserializeProgram(serializeProgram(fallbackDash)).graphicSpec, fallbackDash.graphicSpec);
      if (factory === basicChart) {
        assert.equal(typeof fallbackDash.editScale, "undefined");
        assert.equal(typeof fallbackDash.editStrokeDashScale, "undefined");
        assert.equal(typeof fallbackDash.editLegend, "undefined");
      }
      if (factory === chart) {
        assert.throws(() => fallbackDash.editStrokeDashScale({ unknown: undefined }), /outside/);
        assert.deepEqual(fallbackDash.editStrokeDashScale({ unknown: "dotted" }).graphicSpec.objects.linePlot.items.map(item => item.properties.strokeDash), [[1, 3], [1, 0]]);
      }
    }
  } },
  { id: "guides/transition-rows", async run() {
const transitionRows = [-2, 0, 4, 8].map((value, x) => ({ value, x, category: String(x) }));
const transitionBase = chart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ values: transitionRows })
      .createBarPlot({ id: "transition", x: "category", y: { field: "value", aggregate: "sum" }, color: { field: "value", fieldType: "quantitative", scale: { id: "transitionColor", midpoint: 0, range: ["blue", "white", "red"] } } });
const intervalTransition = transitionBase.editScale({ id: "transitionColor", type: "quantize", domain: [-2, 8], range: ["blue", "red"] });
assert.deepEqual(intervalTransition.graphicSpec.objects.transition.items.map(item => item.properties.fill), ["blue", "red", "red"]);
assert.equal(intervalTransition.guideConfigs.legend.gradient, undefined);
assert.equal(intervalTransition.guideConfigs.legend.interval.scale, "transitionColor");
for (const position of ["left", "right", "top", "bottom"]) {
      const source = transitionBase.editCanvas({ width: 1400, height: 1200, margin: 350 })
        .editLegend({ position, offset: 100, border: true, title: false });
      const interval = source.editScale({ id: "transitionColor", type: "quantize", domain: [-2, 8], range: ["blue", "red"] });
      assert.equal(interval.guideConfigs.legend.interval.position, position);
      assert.equal(interval.guideConfigs.legend.interval.titleVisible, false);
      assert.match(renderToSVG(interval), /<svg /);
      const back = interval.encodeColor({ target: "transition", field: "value", fieldType: "quantitative",
        scale: { type: "sequential", domain: [-2, 8], range: ["blue", "white", "red"] } });
      assert.equal(back.guideConfigs.legend.gradient.position, position);
      assert.equal(back.guideConfigs.legend.gradient.titleVisible, false);
      assert.deepEqual(back.editCanvas({ width: 1440 }).graphicSpec,
        back.editCanvas({ width: 1440 }).editLegend({ position }).graphicSpec);
    }
assert.equal(intervalTransition.encodeColor({ target: "transition", field: "value", fieldType: "quantitative", scale: { type: "sequential", domain: [-2, 8], range: ["blue", "white", "red"] } }).guideConfigs.legend.interval, undefined);
const basicInterval = basicChart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ values: transitionRows })
      .createBarPlot({ id: "interval", x: "category", y: { field: "value", aggregate: "sum" }, color: { field: "value", fieldType: "quantitative", scale: { type: "quantize", range: ["blue", "red"] } } });
assert.equal(basicInterval.guideConfigs.legend.interval.target, "interval");
  } },
  { id: "guides/joint-pie", async run() {
const jointPie = chart().createCanvas({ width: 400, height: 400, margin: 40 })
      .createData({ values: [{ category: "A", angle: 1, radius: 4 }, { category: "A", angle: 2, radius: 5 }, { category: "B", angle: 9, radius: 16 }] })
      .createPiePlot({ category: "category", value: "angle", aggregate: "sum",
        radius: { field: "radius", aggregate: "sum", scale: { type: "sqrt" } }, guides: false })
      .createMarkLabels({ source: "piePlot", content: "value" });
assert.deepEqual(jointPie.resolvedScales.radius.domain, [0, 16]);
assert.equal(jointPie.graphicSpec.objects.piePlot.items.length, 2);
assert.deepEqual(jointPie.graphicSpec.objects["piePlot-labels"].items.map(item => item.properties.text), ["3", "9"]);
assert.match(renderToSVG(jointPie), /<path/);
  } },
  { id: "guides/ordered-pie", async run() {
const orderedPie = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
      .createData({ values: [{ category: "A", value: 2 }, { category: "B", value: 3 }, { category: "C", value: 4 }] })
      .createPiePlot({ category: "category", value: "value", aggregate: "sum" })
      .orderCategories({ channel: "theta", values: ["C", "A"] })
      .editLegend({ order: { channel: "theta" } });
assert.deepEqual(orderedPie.resolvedScales.theta.domain, ["C", "A", "B"]);
assert.deepEqual(orderedPie.resolvedScales.color.domain, ["A", "B", "C"]);
assert.deepEqual(orderedPie.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["C", "A", "B"]);
assert.deepEqual(orderedPie.editLegend({ order: "scale" }).guideConfigs.legend.color.domain, ["A", "B", "C"]);
assert.throws(() => orderedPie.removeEncoding({ channel: "theta" }), /Reset linked legend/);
  } },
  { id: "guides/create-canvas-14", async run() {
for (const [operation, mapping] of [["createRosePlot", "area"], ["createRadialBarPlot", "radius-length"]]) {
      const radial = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
        .createData({ values: [{ category: "A", value: 2 }, { category: "B", value: 3 }, { category: "C", value: 4 }] })
        [operation]({ id: "radial", category: "category", value: "value", aggregate: "sum", radiusScale: { range: [70, 140] } });
      assert.equal(radial.resolvedScales.radius.radialMapping, mapping);
      assert.equal(radial.graphicSpec.objects.radial.items.length, 3);
      assert.equal(radial.graphicSpec.objects.radialAxisTitle.properties.text, "sum(value)");
      assert.equal(typeof basicChart()[operation], "undefined");
    }
  } },
  { id: "guides/measured-radius", async run() {
const measuredRadius = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
      .createData({ values: [{ category: "A", value: 1 }, { category: "A", value: 1 }, { category: "B", value: 4 }] })
      .createArcMark({ id: "radial" })
      .encodeR({ field: "value", aggregate: "sum", mapping: "area", scale: { range: [70, 140] } })
      .encodeTheta({ field: "category", fieldType: "nominal" })
      .createRadialAxis();
assert.deepEqual(measuredRadius.resolvedScales.radius.domain, [0, 4]);
assert.equal(measuredRadius.graphicSpec.objects.radial.items.length, 2);
const radialLength = measuredRadius.editScale({ id: "radius", radialMapping: "radius-length" });
assert.equal(radialLength.resolvedScales.radius.radialMapping, "radius-length");
assert.notDeepEqual(radialLength.graphicSpec, measuredRadius.graphicSpec);
const radialCount = measuredRadius.encodeR({ aggregate: "count" });
assert.deepEqual(radialCount.resolvedScales.radius.domain, [0, 2]);
assert.equal(Object.hasOwn(radialCount.semanticSpec.layers[0].encoding.radius, "field"), false);
  } },
  { id: "guides/parallel-facade", async run() {
const parallelFacade = chart()
      .createCanvas({ width: 200, height: 140, margin: 20 })
      .createData({ values: [
        { key: "a", first: 1, second: 4, group: "A" },
        { key: "b", first: 2, second: 3, group: "B" }
      ] })
      .createParallelCoordinates({
        dimensions: ["first", "second"],
        key: "key",
        color: "group",
        guides: false
      });
assert.equal(parallelFacade.graphicSpec.objects.parallelCoordinates.items.length, 2);
const scaledParallel = parallelFacade.editParallelScale({
      target: "parallelCoordinates", dimension: "first", reverse: true
    });
assert.equal(
      scaledParallel.semanticSpec.scales.find(scale =>
        scale.id === "parallelCoordinates-parallel-0"
      ).reverse,
      true
    );
assert.notDeepEqual(
      scaledParallel.graphicSpec.objects.parallelCoordinates.items,
      parallelFacade.graphicSpec.objects.parallelCoordinates.items
    );
const revisedParallel = parallelFacade.editCanvas({ width: 520, height: 400, margin: 70 })
      .createAxes().encodeParallelCoordinates({
        target: "parallelCoordinates", dimensions: ["second", "first"], key: "key"
      });
assert.deepEqual(revisedParallel.graphicSpec.objects.parallelAxisTitles.items.map(item => item.properties.text),
      ["second", "first"]);
assert.equal(revisedParallel.graphicSpec.objects.parallelAxisLabels.items[0].properties.text, "3");
assert.equal(parallelFacade.graphicSpec.objects.parallelAxisTitles, undefined);
const selectedParallel = revisedParallel.removeParallelAxes()
      .createParallelAxis({ field: "first", title: { text: "Primary" } })
      .editParallelAxis({ field: "first", line: { color: "#7c3aed", lineWidth: 3 }, ticks: false })
      .createParallelAxis({ field: "first", line: false, title: false, labels: false, ticks: {} });
assert.equal(selectedParallel.graphicSpec.objects.parallelAxisTitles.items[0].properties.text, "Primary");
assert.equal(selectedParallel.graphicSpec.objects.parallelAxisLines.items[0].properties.strokeWidth, 3);
const noParallelAxes = selectedParallel.removeParallelAxis({ field: "first" });
assert.equal(noParallelAxes.semanticSpec.guides.axis?.parallel, undefined);
assert.equal(noParallelAxes.createParallelAxes().graphicSpec.objects.parallelAxisLines.items.length, 2);
assert.deepEqual(
      parallelFacade.trace.children.at(-1).children.map(node => node.op),
      [
        "createCoordinate", "createLineMark", "encodeParallelCoordinates",
        "encodeColor"
      ]
    );
  } },
  { id: "guides/shape-legend-base", async run() {
const shapeLegendBase = chart().createCanvas({ width: 640, height: 420, margin: { right: 180 } })
      .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
      .createPointMark({ id: "shapePoints" }).encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeShape({ field: "group" }).encodeColor({ field: "group" })
      .createLegend({ channels: ["color", "shape"] })
      .createLineMark({ id: "unrelatedLine" }).encodeX({ field: "x" }).encodeY({ field: "y" });
const shapeLegend = shapeLegendBase.removeEncoding({ target: "shapePoints", channel: "color" });
assert.deepEqual(shapeLegend.semanticSpec.guides.legend.series.channels, ["shape"]);
assert.deepEqual(shapeLegend.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["point"]);
assert.equal(shapeLegend.graphicSpec.objects.seriesLegendSymbolPoints.items.length, 2);
assert.match(renderToSVG(shapeLegend), /<svg /);
  } },
  { id: "guides/create-canvas-15", async run() {
for (const factory of [chart, basicChart]) {
      const recipeBase = factory().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
        .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "A" },
          { x: 1, y: 3, g: "B" }, { x: 2, y: 4, g: "B" }] })
        .createPointMark({ id: "recipePoints" }).encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "g" }).encodeShape({ field: "g" });
      const addRecipeLine = p => p.createLineMark({ id: "recipeLine" }).encodeX({ field: "x" })
        .encodeY({ field: "y" }).encodeGroup({ field: "g" }).encodeColor({ field: "g" });
      const earlyRecipe = addRecipeLine(recipeBase.createLegend({ target: "recipePoints" }));
      const lateRecipe = addRecipeLine(recipeBase).createLegend({ target: "recipePoints" });
      assert.deepEqual(earlyRecipe.graphicSpec, lateRecipe.graphicSpec);
      assert.deepEqual(earlyRecipe.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["line", "point"]);
      assert.match(renderToSVG(earlyRecipe), /<svg /);
      if (factory === chart) {
        const removedRecipe = earlyRecipe.removeMark({ target: "recipeLine" });
        assert.deepEqual(removedRecipe.guideConfigs.legend.series.symbol.layers.map(layer => layer.type), ["point"]);
        assert.equal(removedRecipe.graphicSpec.objects.seriesLegendSymbolLines, undefined);
      }
    }
  } },
  { id: "guides/create-canvas-16", async run() {
for (const factory of [chart, basicChart]) {
      const intervalEdgeBase = factory().createCanvas({ width: 1000, height: 800,
        margin: { left: 250, right: 250, top: 250, bottom: 250 } })
        .createData({ values: [{ x: 1, y: 1, m: 0 }, { x: 2, y: 2, m: 10 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "m", fieldType: "quantitative", scale: { type: "quantize", range: ["red", "blue"] } });
      for (const position of ["left", "right", "top", "bottom"]) {
        const intervalEdge = intervalEdgeBase.createLegend({ position, layout: "edge", border: true });
        assert.equal(intervalEdge.guideConfigs.legend.interval.position, position);
        assert.match(renderToSVG(intervalEdge), /<svg /);
        if (factory === chart) {
          const editedEdge = intervalEdge.editLegend({ position: "top", columns: 1, titlePosition: "left", title: false });
          assert.equal(editedEdge.graphicSpec.objects.colorLegendTitle, undefined);
          assert.equal(editedEdge.guideConfigs.legend.interval.columns, 1);
        }
      }
    }
  } },
  { id: "guides/create-canvas-17", async run() {
for (const kind of ["interval", "strokeWidth"]) for (const position of ["left", "right", "top", "bottom"]) {
      let source = chart().createCanvas({ width: 1600, height: 1200, margin: 400 })
        .createData({ values: [{x:0,y:0,m:0,g:"A"},{x:1,y:1,m:0,g:"A"},{x:2,y:2,m:10,g:"B"},{x:3,y:3,m:10,g:"B"}] });
      source = kind === "interval" ? source.createPointMark() : source.createLineMark();
      source = source.encodeX({field:"x"}).encodeY({field:"y"});
      source = kind === "interval" ? source.encodeColor({field:"m",fieldType:"quantitative",scale:{type:"quantize",range:["red","blue"]}})
        : source.encodeGroup({field:"g"}).encodeStrokeWidth({field:"m",scale:{range:[2,60]}});
      const p = source.createLegend({position,...(kind === "interval"?{symbol:{stroke:"black",strokeWidth:40}}:{count:2})});
      const prefix = kind === "interval" ? "colorLegend" : "strokeWidthLegend";
      const symbol = p.graphicSpec.objects[prefix+"Symbols"].items.at(-1).properties;
      const label = p.graphicSpec.objects[prefix+"Labels"].items.at(-1).properties;
      const gap = label.x - (kind === "interval" ? symbol.x + symbol.width : symbol.x2) - symbol.strokeWidth / 2;
      assert.ok(Math.abs(gap - (kind === "interval" ? 8 : 12)) < 1e-8);
      assert.match(renderToSVG(p), /<svg /);
    }
  } },
  { id: "guides/create-canvas-18", async run() {
for (const factory of [chart, basicChart]) for (const kind of ["color", "line"]) {
      for (const position of ["left", "right", "top", "bottom"]) {
        let source = factory().createCanvas({ width: 2400, height: 2000, margin: 600 })
          .createData({ values: [{ x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "A" },
            { x: 2, y: 2, g: "B" }, { x: 3, y: 3, g: "B" }] });
        source = kind === "color" ? source.createPointMark() : source.createLineMark().encodeGroup({ field: "g" });
        source = source.encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
        const p = source.createLegend({ position, labels: { fontSize: 80 }, titleStyle: { fontSize: 80 },
          symbol: kind === "color" ? { stroke: "black", strokeWidth: 40 } : { lineWidth: 60 } });
        const prefix = kind === "color" ? "colorLegend" : "seriesLegend";
        const sample = p.graphicSpec.objects[prefix + "Symbols"].items[0].properties;
        const label = p.graphicSpec.objects[prefix + "Labels"].items[0].properties;
        const gap = label.x - (kind === "color" ? sample.x + sample.width : sample.x2) - sample.strokeWidth / 2;
        assert.ok(Math.abs(gap - (kind === "color" ? 8 : 10)) < 1e-8);
        assert.match(renderToSVG(p), /<svg /);
      }
    }
  } },
  { id: "guides/create-canvas-19", async run() {
for (const factory of [chart, basicChart]) for (const position of ["left", "right"]) {
      const source = factory().createCanvas({ width: 1600, height: 1200, margin: 400 })
        .createData({ values: [{ x: 0, y: 0, g: "A" }, { x: 1, y: 1, g: "B" }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
      const p = source.createLegend({ position, columns: 1 });
      assert.equal(p.guideConfigs.legend.color.direction, "vertical");
      for (const patch of [{ direction: "horizontal" }, { titlePosition: "left" }]) {
        assert.throws(() => source.createLegend({ position, ...patch }), /Side legends require/);
      }
      const columns = source.createLegend({ position, columns: 2 });
      assert.equal(new Set(columns.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.x)).size, 2);
      if (factory === chart) {
        assert.deepEqual(source.createLegend({ position: "top", columns: 2, itemGap: 18 })
          .editLegendLayout({ position, columns: 1 }).graphicSpec, p.graphicSpec);
      }
    }
  } },
  { id: "guides/create-canvas-20", async run() {
for (const factory of [chart, basicChart]) for (const position of ["left", "right", "top", "bottom"]) {
      const source = factory().createCanvas({ width: 1800, height: 1400, margin: 450 })
        .createData({ values: [{ x: 0, y: 0, g: "A", m: 0 }, { x: 1, y: 1, g: "B", m: 10 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" }).encodeSize({ field: "m" });
      const p = source.createLegend({ channels: ["color", "size"], position, itemGap: 28 });
      assert.equal(p.graphicSpec.objects.sizeLegendTitle.properties.fill, "#334155");
      if (factory === chart) {
        assert.deepEqual(p.editLegendLayout({ position: "right" }).graphicSpec,
          source.createLegend({ channels: ["color", "size"], position: "right", itemGap: 28 }).graphicSpec);
      }
    }
  } },
  { id: "guides/legend-content-base", async run() {
const legendContentBase = chart().createCanvas({ width: 800, height: 700, margin: { right: 300 } })
      .createData({ values: [{ x: 1, y: 2, g: "A", m: 4 }, { x: 2, y: 3, g: "B", m: 9 }] })
      .createPointMark({ id: "contentPoints" }).encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeColor({ field: "g" }).encodeShape({ field: "g" }).encodeSize({ field: "m" });
const onlyColorContent = legendContentBase.createLegend({ channels: ["color"] });
assert.deepEqual(Object.keys(onlyColorContent.guideConfigs.legend), ["color"]);
assert.equal(onlyColorContent.graphicSpec.objects.colorLegendSymbols.type, "rect");
const colorSizeContent = legendContentBase.createLegend({ channels: ["color", "size"], count: 3 });
assert.deepEqual(Object.keys(colorSizeContent.guideConfigs.legend), ["color", "size"]);
assert.equal(colorSizeContent.graphicSpec.objects.sizeLegendSymbols.items.length, 3);
assert.match(renderToSVG(colorSizeContent), /<svg /);
const blockEdited = colorSizeContent.editLegendBlock({
      target: "contentPoints",
      channel: "size",
      title: "Magnitude",
      values: [4, 9],
      text: { color: "purple" },
      symbol: { fill: "orange", opacity: 1 }
    });
assert.equal(blockEdited.graphicSpec.objects.sizeLegendTitle.properties.text, "Magnitude");
assert.deepEqual(blockEdited.graphicSpec.objects.sizeLegendLabels.items.map(item => item.properties.text), ["4", "9"]);
assert.equal(blockEdited.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "purple");
assert.equal(blockEdited.graphicSpec.objects.sizeLegendSymbols.items[0].properties.fill, "orange");
const namedLegend = colorSizeContent.editLegendBlock({
      target: "contentPoints",
      channel: "color",
      labelMap: [{ value: "A", label: "Alpha" }]
    });
assert.deepEqual(namedLegend.graphicSpec.objects.colorLegendLabels.items.map(
      item => item.properties.text
    ), ["Alpha", "B"]);
const editedContent = legendContentBase.createLegend({ channels: ["size"] })
      .editLegend({ labels: { color: "red" }, titleStyle: { fontWeight: 900 } })
      .editLegend({ channels: ["color", "shape", "size"], count: 3 })
      .editLegend({ labels: { fontWeight: 700 } }).editCanvas({ width: 900 });
assert.equal(editedContent.graphicSpec.objects.sizeLegendLabels.items[0].properties.fill, "red");
assert.equal(editedContent.graphicSpec.objects.sizeLegendTitle.properties.fontWeight, 900);
assert.equal(editedContent.graphicSpec.objects.sizeLegendLabels.items[0].properties.fontWeight, 700);
const formattedCombined = legendContentBase.createLegend({
      channels: ["color", "size"], count: 3, labels: { format: ".1f" }
    });
assert.equal(formattedCombined.guideConfigs.legend.color.labels.format, undefined);
assert.equal(formattedCombined.guideConfigs.legend.size.labels.format, ".1f");
assert.deepEqual(formattedCombined.graphicSpec.objects.sizeLegendLabels.items.map(item =>
      item.properties.text), ["4.0", "6.5", "9.0"]);
assert.deepEqual(editedContent.editLegend({ channels: ["shape"] }).guideConfigs.legend.series.channels, ["shape"]);
assert.match(renderToSVG(editedContent), /<svg /);
const alignedLegendTitle = legendContentBase.createLegend({title: "Aligned legend title", titleStyle: {align: "left"}});
const alignedTitleObject = Object.values(alignedLegendTitle.graphicSpec.objects).find(o => o.properties?.text === "Aligned legend title");
assert.equal(alignedTitleObject.properties.textAlign, "left");
const resetLegendTitle = alignedLegendTitle.editLegendTitle({align: "auto"});
assert.deepEqual(resetLegendTitle.graphicSpec, legendContentBase.createLegend({title: "Aligned legend title"}).graphicSpec);
assert.ok(Object.values(deserializeProgram(serializeProgram(alignedLegendTitle)).guideConfigs.legend).some(config => config.titleStyle?.align === "left"));
const hiddenContent = legendContentBase.createLegend({ count: 3 }).editLegend({ title: false });
const hiddenCategorical = legendContentBase.editCanvas({ width: 1200, height: 1000, margin: 300 })
      .createLegend({ channels: ["color"], position: "bottom", border: true }).editLegend({ title: false });
assert.deepEqual(hiddenCategorical.editLegend({ titleStyle: { fontSize: 1000 }, titlePosition: "left" }).graphicSpec,
      hiddenCategorical.graphicSpec);
assert.equal(hiddenCategorical.graphicSpec.objects.colorLegendBackground.properties.height, 36.5);
const partialContent = hiddenContent.removeLegend({ channels: ["shape"] });
assert.deepEqual(partialContent.guideConfigs.legend.color.channels, ["color"]);
assert.equal(partialContent.guideConfigs.legend.color.titleVisible, false);
assert.equal(partialContent.graphicSpec.objects.colorLegendTitle, undefined);
assert.equal(partialContent.graphicSpec.objects.sizeLegendSymbols.items.length, 3);
assert.deepEqual(partialContent.semanticSpec.layers, hiddenContent.semanticSpec.layers);
assert.equal(hiddenContent.removeEncoding({ channel: "shape" }).graphicSpec.objects.colorLegendTitle, undefined);
assert.match(renderToSVG(partialContent), /<svg /);
const inferredColorBase = legendContentBase.removeEncoding({ channel: "shape" })
      .removeEncoding({ channel: "size" });
const inferredColor = inferredColorBase.createLegend();
assert.deepEqual(inferredColor.graphicSpec, inferredColorBase.createLegend({ channels: ["color"] }).graphicSpec);
assert.equal(inferredColor.graphicSpec.objects.colorLegendSymbols.type, "rect");
const inferredSizeBase = legendContentBase.removeEncoding({ channel: "shape" });
assert.deepEqual(inferredSizeBase.createLegend({ count: 3 }).graphicSpec,
      inferredSizeBase.createLegend({ channels: ["color", "size"], count: 3 }).graphicSpec);
const inferredShape = legendContentBase.removeEncoding({ channel: "color" })
      .removeEncoding({ channel: "size" }).createLegend();
assert.deepEqual(inferredShape.guideConfigs.legend.series.channels, ["shape"]);
assert.equal(inferredShape.graphicSpec.objects.seriesLegendSymbolPoints.items.length, 2);
  } },
  { id: "guides/entry-surface", async run() {
assert.equal(typeof basicChart().editLegendBlock, "undefined");
  } },
  { id: "guides/create-canvas-21", async run() {
for (const create of [chart, basicChart]) for (const position of ["top", "bottom"]) {
      const source = create().createCanvas({ width: 1200, height: 1000, margin: 300 })
        .createData({ values: [{ x: 1, y: 1, g: "A", m: 0 }, { x: 2, y: 2, g: "B", m: 10 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "g" }).encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } });
      const combined = source.createLegend({ channels: ["color", "size"], position, count: 2, offset: 30, itemGap: 20, border: true });
      assert.equal(combined.guideConfigs.legend.color.position, position);
      assert.equal(combined.graphicSpec.objects.colorLegendTitle.properties.y, combined.graphicSpec.objects.sizeLegendTitle.properties.y);
      assert.ok(combined.graphicSpec.objects.sizeLegendSymbols.items[0].properties.x > combined.graphicSpec.objects.colorLegendLabels.items.at(-1).properties.x);
      assert.match(renderToSVG(combined), /<svg /);
      if (create === chart) assert.deepEqual(combined.editLegend({ channels: ["color", "size"] }).graphicSpec, combined.graphicSpec);
    }
  } },
  { id: "guides/create-canvas-22", async run() {
{
      const source = chart().createCanvas({ width: 1200, height: 1000, margin: 300 })
        .createData({ values: [{ x: 0, y: 0, m: 0 }, { x: 10, y: 10, m: 10 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "m", fieldType: "quantitative" });
      const title = { text: "Chart", position: "top" };
      const legend = { channels: ["color"], position: "top", offset: 40, border: true };
      const forward = source.createTitle(title).createLegend(legend);
      assert.deepEqual(forward.graphicSpec, source.createLegend(legend).createTitle(title).graphicSpec);
      assert.match(renderToSVG(forward), /<svg /);
      const overlap = { position: "top", text: "AXIS", offset: 40, fontSize: 24 };
      assert.throws(() => forward.createXAxisTitle(overlap), /overlap.*margin space/);
      assert.throws(() => source.createXAxisTitle(overlap).createLegend(legend), /overlap.*margin space/);
      assert.equal(Object.hasOwn(forward.context, "deferGuideLayoutValidation"), false);
      assert.deepEqual(forward.editLegend({ border: false }).editLegend({ border: true }).graphicSpec, forward.graphicSpec);
      const opacity = source.encodeOpacity({ field: "m" });
      for (const position of ["left", "right", "top", "bottom"]) {
        const options = { channels: ["opacity"], position, count: 3, offset: 40,
          symbol: { radius: 30, stroke: "black", strokeWidth: 20 }, labels: { fontSize: 30 }, titleStyle: { fontSize: 40 } };
        const p = opacity.createLegend(options);
        const symbol = p.graphicSpec.objects.opacityLegendSymbols.items[0].properties;
        const label = p.graphicSpec.objects.opacityLegendLabels.items[0].properties;
        const gap = position === "right" ? label.x - symbol.x - 40
          : position === "left" ? symbol.x - 40 - label.x : label.y - label.fontSize / 2 - symbol.y - 40;
        assert.equal(gap, 12);
        assert.deepEqual(p.editLegendSymbols({ symbol: options.symbol }).graphicSpec, p.graphicSpec);
        assert.match(renderToSVG(p), /<svg /);
        if (position === "left") {
          const shared = p.createLegend({ channels: ["color"], position, offset: 40 });
          const s = shared.graphicSpec.objects.opacityLegendSymbols.items[0].properties;
          const l = shared.graphicSpec.objects.opacityLegendLabels.items[0].properties;
          assert.ok(l.x - s.x - 40 >= 12);
        }
      }
      const options = { ...legend, channels: ["opacity"] };
      const opacityTitle = opacity.createTitle(title).createLegend(options);
      assert.deepEqual(opacityTitle.graphicSpec, opacity.createLegend(options).createTitle(title).graphicSpec);
      assert.deepEqual(opacityTitle.editCanvas({ width: 1240 }).graphicSpec,
        opacity.editCanvas({ width: 1240 }).createTitle(title).createLegend(options).graphicSpec);
    }
  } },
  { id: "guides/bottom-legend-base", async run() {
const bottomLegendBase = chart().createCanvas({ width: 640, height: 600,
      margin: { left: 60, right: 100, top: 40, bottom: 150 } })
      .createData({ values: [{ x: 1, y: 2, g: "A" }, { x: 2, y: 3, g: "B" }] })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "g" });
const legacyBottomLegend = bottomLegendBase.createLegend({ channels: ["color"], position: "bottom", layout: "legacy-bottom" })
      .editLegendLabels({ color: "red" });
assert.deepEqual(legacyBottomLegend.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y), [572, 572]);
const edgeBottomLegend = legacyBottomLegend.editLegendLayout({ layout: "edge" });
assert.deepEqual(edgeBottomLegend.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.y), [489.25, 489.25]);
assert.match(renderToSVG(edgeBottomLegend), /<svg /);
  } },
  { id: "guides/edited-size-legend", async run() {
const editedSizeLegend = chart().createCanvas({ width: 640, height: 420, margin: { right: 180 } })
      .createData({ values: [{ x: 1, y: 2, m: 10 }, { x: 2, y: 3, m: 30 }] })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } })
      .createLegend({ channels: ["size"] }).editLegend({ count: 3, title: "Mass", labels: { fontWeight: 700 } });
assert.deepEqual(editedSizeLegend.graphicSpec.objects.sizeLegendSymbols.items.map(item => item.properties.radius),
      [2, Math.sqrt(20), 6]);
const formattedSizeLegend = editedSizeLegend.editLegendLabels({ format: ".1e", offset: 20 });
assert.deepEqual(formattedSizeLegend.graphicSpec.objects.sizeLegendLabels.items.map(item => item.properties.text),
      ["1.0e+1", "2.0e+1", "3.0e+1"]);
assert.equal(formattedSizeLegend.guideConfigs.legend.size.labels.offset, 20);
const hiddenSizeLegend = editedSizeLegend.editLegendTitle({ title: false }).editCanvas({ width: 740 });
assert.equal(hiddenSizeLegend.graphicSpec.objects.sizeLegendTitle, undefined);
assert.equal(hiddenSizeLegend.editLegendTitle({ title: "auto" }).graphicSpec.objects.sizeLegendTitle.properties.text, "m");
  } },
  { id: "guides/create-canvas-23", async run() {
for (const create of [chart, basicChart]) {
      const nonlinearSize = create()
        .createCanvas({ width: 640, height: 420, margin: { right: 220 } })
        .createData({ values: [1, 10, 100].map((m, index) => ({ x: index, y: index, m })) })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeSize({
          field: "m",
          scale: { type: "log", domain: [1, 100], range: [4 * Math.PI, 100 * Math.PI] }
        })
        .createLegend({ channels: ["size"], count: 3 });
      assert.ok(Math.abs(
        nonlinearSize.graphicSpec.objects.point.items[1].properties.radius - Math.sqrt(52)
      ) < 1e-10);
      assert.match(renderToSVG(nonlinearSize), /<circle /);
    }
  } },
  { id: "guides/discrete-size", async run() {
const discreteSize = chart()
      .createCanvas({ width: 640, height: 420, margin: { right: 220 } })
      .createData({ values: [9, 10, 19, 20].map((m, index) => ({ x: index, y: index, m })) })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeSize({ field: "m", scale: { type: "threshold", domain: [10, 20], range: [2, 4, 8] } })
      .createLegend({ channels: ["size"] });
assert.deepEqual(
      discreteSize.graphicSpec.objects.sizeLegendLabels.items.map(item => item.properties.text),
      ["< 10", "10–20", "≥ 20"]
    );
assert.throws(() => discreteSize.editLegend({ count: 3 }), /do not support count/);
  } },
  { id: "guides/create-canvas-24", async run() {
for (const create of [chart, basicChart]) for (const position of ["left", "right", "top", "bottom"]) {
      const source = create().createCanvas({ width: 1000, height: 800, margin: 250 })
        .createData({ values: [{ x: 1, y: 2, m: 10 }, { x: 2, y: 3, m: 30 }] })
        .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeSize({ field: "m", scale: { range: [4 * Math.PI, 36 * Math.PI] } });
      const edge = source.createLegend({ channels: ["size"], position, count: 3, border: true });
      assert.equal(edge.guideConfigs.legend.size.position, position);
      assert.equal(edge.guideConfigs.legend.size.labels.offset, 12);
      assert.deepEqual(edge.graphicSpec.objects.sizeLegendSymbols.items.map(item => item.properties.radius), [2, Math.sqrt(20), 6]);
      assert.ok(renderToSVG(edge).startsWith("<svg "));
      if (create === chart) {
        assert.deepEqual(edge.editLegend({ position: "top", columns: 2, title: false }).graphicSpec,
          source.createLegend({ channels: ["size"], position: "top", columns: 2, count: 3, border: true, itemGap: ["left", "right"].includes(position) ? 18 : 40 })
            .editLegend({ title: false }).graphicSpec);
      }
    }
  } },
  { id: "guides/weighted-rules", async run() {
const weightedRules = chart()
      .createCanvas({ width: 500, height: 350, margin: { top: 30, bottom: 30, left: 30, right: 150 } })
      .createData({ values: [
        { x: 1, x2: 3, y: 2, weight: 0 },
        { x: 2, x2: 4, y: 4, weight: 10 }
      ] })
      .createRuleMark()
      .encodeX({ field: "x", fieldType: "quantitative" })
      .encodeX2({ field: "x2", fieldType: "quantitative" })
      .encodeY({ field: "y", fieldType: "quantitative" })
      .encodeStrokeWidth({ field: "weight", scale: { range: [1, 6] } })
      .createLegend({ channels: ["strokeWidth"] });
assert.deepEqual(
      weightedRules.graphicSpec.objects.rule.items.map(
        item => item.properties.strokeWidth
      ),
      [1, 6]
    );
const exactWidthLegend = weightedRules.editLegend({
      values: [0, 5, 10]
    });
assert.deepEqual(
      exactWidthLegend.graphicSpec.objects.strokeWidthLegendLabels.items.map(
        item => item.properties.text
      ),
      ["0", "5", "10"]
    );
assert.deepEqual(
      exactWidthLegend.graphicSpec.objects.strokeWidthLegendSymbols.items.map(
        item => item.properties.strokeWidth
      ),
      [1, 3.5, 6]
    );
assert.deepEqual(exactWidthLegend.guideConfigs.legend.strokeWidth.sampling, {
      mode: "values", values: [0, 5, 10], count: 5
    });
assert.equal(
      exactWidthLegend.editLegend({ values: "auto" })
        .graphicSpec.objects.strokeWidthLegendSymbols.items.length,
      5
    );
assert.throws(
      () => exactWidthLegend.editScale({ id: "strokeWidth", domain: [0, 4] }),
      /outside the scale domain/
    );
for (const position of ["right", "left", "top", "bottom"]) {
      const roomy = weightedRules.removeLegend().editCanvas({ width: 1000, height: 800, margin: 250 });
      const edge = roomy.createLegend({ channels: ["strokeWidth"], position, count: 3, border: true });
      assert.equal(edge.guideConfigs.legend.strokeWidth.position, position);
      assert.deepEqual(edge.editLegend({ position: "top", columns: 2, title: false }).graphicSpec,
        roomy.createLegend({ channels: ["strokeWidth"], position: "top", columns: 2, count: 3, border: true, itemGap: ["left", "right"].includes(position) ? 18 : 32 })
          .editLegend({ title: false }).graphicSpec);
      assert.ok(renderToSVG(edge).includes("stroke-width"));
    }
  } },
  { id: "guides/comparison-rows", async run() {
const comparisonRows = [
      { row: "A", column: "X", x: 1, y: 10, z: 100, group: "g1" },
      { row: "A", column: "Y", x: 2, y: 20, z: 200, group: "g2" },
      { row: "B", column: "X", x: 3, y: 30, z: 300, group: "g1" }
    ];
const comparisonUnit = chart()
      .createCanvas({ width: 180, height: 140, margin: 36 })
      .createData({ id: "comparison", values: comparisonRows })
      .createPointMark({ id: "comparisonPoint", data: "comparison" })
      .encodeX({ target: "comparisonPoint", field: "x" })
      .encodeY({ target: "comparisonPoint", field: "y" })
      .encodeColor({ target: "comparisonPoint", field: "group" });
const grid = comparisonUnit.facetGrid({
      id: "packageGrid",
      rows: { field: "row", values: ["A", "B"] },
      columns: { field: "column", values: ["X", "Y"] },
      combinations: "full"
    });
const repeated = comparisonUnit.repeatCharts({
      id: "packageRepeat",
      target: "comparisonPoint",
      channel: "x",
      fields: ["x", "y", "z"]
    });
const revisedGrid = grid.editFacetSource({ program: comparisonUnit });
const emptyGridCell = grid.children["packageGrid-row-2-column-2"];
assert.equal(emptyGridCell.semanticSpec.layers.length, 1);
assert.deepEqual(emptyGridCell.graphicSpec.objects.comparisonPoint.items, []);
assert.deepEqual(repeated.compositionSpec.facet.repeat.fields, ["x", "y", "z"]);
assert.deepEqual(revisedGrid.compositionSpec.children, grid.compositionSpec.children);
  } },
  { id: "guides/entry-surface-2", async run() {
for (const method of [
      "facetGrid", "repeatCharts", "editFacetSource",
      "insertCompositionChild", "removeCompositionChild", "reorderCompositionChildren"
    ]) assert.equal(basicChart()[method], undefined, method);
  } },
  { id: "guides/histogram-labels", async run() {
const histogramLabels = chart().createCanvas({ width: 480, height: 360, margin: 50 })
      .createData({ values: [{ value: 1 }, { value: 1.5 }, { value: 100 }] })
      .createBarMark().encodeHistogram({ field: "value", maxBins: 2 })
      .createTextMark({ text: "bin" });
assert.deepEqual(histogramLabels.editCanvas({ width: 600 }).resolvedScales.x.domain, histogramLabels.resolvedScales.x.domain);
const filteredHistogramLabels = histogramLabels.filterMarks({ target: "bar", channel: "x", op: "lt", value: 50 });
assert.ok(filteredHistogramLabels.editCanvas({ width: 600 }).graphicSpec.objects.text.items.length > 0);
const emptyHistogramLabels = filteredHistogramLabels.filterMarks({
      target: "bar", mode: "compose", channel: "x", op: "gt", value: 1000
    });
assert.equal(emptyHistogramLabels.graphicSpec.objects.bar.items.length, 0);
assert.deepEqual(emptyHistogramLabels.resolvedScales.x.domain, filteredHistogramLabels.resolvedScales.x.domain);
const restoredHistogramLabels = emptyHistogramLabels.removeMarkFilter({ target: "bar" });
assert.deepEqual(restoredHistogramLabels.semanticSpec, histogramLabels.semanticSpec);
assert.deepEqual(restoredHistogramLabels.graphicSpec, histogramLabels.graphicSpec);
  } },
  { id: "guides/reference-rect", async run() {
const referenceRect = chart().createCanvas({ width: 480, height: 320, margin: 40 })
      .createData({ values: [] }).createRectMark({ data: "data" })
      .encodeX({ datum: 2, scale: { domain: [0, 10] } }).encodeX2({ datum: 6 });
assert.equal(referenceRect.graphicSpec.objects.rect.items.length, 1);
assert.equal(referenceRect.editCanvas({ height: 400 }).graphicSpec.objects.rect.items[0].properties.height, 320);
assert.equal(referenceRect.createMarkLabels({ value: "Range" }).graphicSpec.objects["rect-labels"].items[0].properties.text, "Range");
  } },
  { id: "guides/source-text-scale", async run() {
const sourceTextScale = chart().createCanvas({ width: 480, height: 320, margin: 60 })
      .createData({ values: [{ x: 1, y: 1, next: 100 }, { x: 2, y: 3, next: 1000 }] })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
      .createTextMark({ source: "point", text: "label" })
      .encodeY({ target: "point", field: "next", scale: { id: "next-y" } }).createAxes().createGrid();
assert.deepEqual(sourceTextScale.resolvedScales["next-y"].domain, [100, 1000]);
assert.equal(sourceTextScale.semanticSpec.guides.axis.y.scale, "next-y");
assert.throws(() => sourceTextScale.encodeY({ target: "text", field: "y" }), /source-owned Text positions/);
  } },
  { id: "guides/standalone-axis", async run() {
const standaloneAxis = chart().createCanvas({ width: 500, height: 300, margin: 70 })
      .createCoordinate({ id: "ruler", type: "cartesian" })
      .createScale({ id: "amount", type: "linear", domain: [0, 100] })
      .createXAxis({ coordinate: "ruler", scale: "amount" });
assert.equal(standaloneAxis.semanticSpec.layers.length, 0);
assert.equal(standaloneAxis.semanticSpec.datasets.length, 0);
const widerAxis = standaloneAxis.editCanvas({ width: 700 }).editXScale({ domain: [0, 200] });
assert.deepEqual(widerAxis.resolvedScales.amount.range, [70, 630]);
assert.deepEqual(widerAxis.resolvedScales.amount.domain, [0, 200]);
assert.deepEqual(deserializeProgram(serializeProgram(widerAxis)).graphicSpec, widerAxis.graphicSpec);
assert.match(renderToSVG(widerAxis), /<text/);
  } },
  { id: "guides/explicit-rotations", async run() {
const explicitRotations = chart().createCanvas({ width: 320, height: 240, margin: 80 })
      .createData({ values: [{ x: 1, y: 2 }] })
      .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
      .createTextMark({ id: "rotationText", source: "point", text: "R", rotation: { value: 90, unit: "degrees" } })
      .createXAxisTitle({ text: "X", rotation: { value: -90, unit: "degrees" } });
assert.deepEqual([
      explicitRotations.graphicSpec.objects.rotationText.items[0].properties.rotation,
      explicitRotations.graphicSpec.objects.xAxisTitle.properties.rotation
    ], [Math.PI / 2, -Math.PI / 2]);
  } },
  { id: "guides/semantic-labels", async run() {
const semanticLabels = chart().createCanvas({ width: 480, height: 360, margin: 50 })
      .createData({ values: [{ category: "A", value: 1 }, { category: "A", value: 1 }, { category: "B", value: 6 }] })
      .createPiePlot({ category: "category", value: "value", aggregate: "sum", guides: false })
      .createMarkLabels({ id: "text", content: "share", format: ".1%", layout: {} });
assert.deepEqual(semanticLabels.graphicSpec.objects.text.items.map(i => i.properties.text), ["25.0%", "75.0%"]);
assert.deepEqual(semanticLabels.filterMarks({ target: "piePlot", field: "category", op: "eq", value: "B" })
      .graphicSpec.objects.text.items.map(i => i.properties.text), ["100.0%"]);
assert.deepEqual(semanticLabels.encodeText({ content: "value", format: "auto" }).graphicSpec.objects.text.items.map(i => i.properties.text), ["2", "6"]);
assert.deepEqual(semanticLabels.encodeText({ content: "value", format: ".2e" }).graphicSpec.objects.text.items.map(i => i.properties.text), ["2.00e+0", "6.00e+0"]);
const selectedSemanticLabels = semanticLabels.editMarkLabelSelection({
      target: "text",
      select: { field: "value", op: "max" }
    });
assert.deepEqual(selectedSemanticLabels.graphicSpec.objects.text.items.map(i => i.properties.text), ["75.0%"]);
assert.deepEqual(selectedSemanticLabels.editMarkLabelSelection({ target: "text", all: true })
      .graphicSpec.objects.text.items.map(i => i.properties.text), ["25.0%", "75.0%"]);
const placedSemanticLabels = semanticLabels.editMarkLabelPlacement({
      target: "text",
      placement: {
        anchor: "outsideEnd",
        gap: 8,
        leader: { stroke: "#123456", strokeWidth: 2 }
      }
    });
assert.equal(placedSemanticLabels.markConfigs.text.labelAuthoring.placement.anchor, "outsideEnd");
assert.equal(placedSemanticLabels.graphicSpec.objects["text-placement-leaders"].items.length, 2);
assert.notDeepEqual(
      placedSemanticLabels.graphicSpec.objects.text.items.map(i => [i.properties.x, i.properties.y]),
      semanticLabels.graphicSpec.objects.text.items.map(i => [i.properties.x, i.properties.y])
    );
const resetSemanticLabels = placedSemanticLabels.editMarkLabelPlacement({
      target: "text",
      placement: "auto"
    });
assert.equal(resetSemanticLabels.markConfigs.text.labelAuthoring.placement, undefined);
assert.equal(resetSemanticLabels.graphicSpec.objects["text-placement-leaders"], undefined);
const labelsRemoved = semanticLabels.removeMarkLabels({ source: "piePlot" })
      .editCanvas({ width: 520 })
      .applyTheme({ theme: "dark" });
assert.equal(labelsRemoved.semanticSpec.layers.some(layer => layer.id === "piePlot"), true);
assert.equal(labelsRemoved.semanticSpec.layers.some(layer => layer.id === "text"), false);
assert.equal(labelsRemoved.graphicSpec.objects.text, undefined);
assert.equal(labelsRemoved.materializationConfigs.labelLayouts?.text, undefined);
  } },
  { id: "guides/legend-base", async run() {
const legendBase = chart()
      .createCanvas({
        width: 720,
        height: 620,
        margin: { top: 180, right: 220, bottom: 180, left: 220 }
      })
      .createData({ values: [
        { x: 1, y: 4, group: "Alpha" },
        { x: 2, y: 6, group: "Beta" }
      ] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeColor({ field: "group" });
const nearLegend = legendBase.createLegend({
      position: "right",
      offset: 8,
      border: true
    });
const farLegend = legendBase.createLegend({
      position: "right",
      offset: 80,
      border: true
    });
const editedLegend = nearLegend.editLegendLayout({ offset: 80 });
const legendX = candidate => Object.entries(candidate.graphicSpec.objects)
      .find(([id]) => id.endsWith("LegendTitle"))?.[1].properties.x;
assert.equal(legendX(farLegend) - legendX(nearLegend), 72);
assert.deepEqual(editedLegend.graphicSpec, farLegend.graphicSpec);
  } }
];
