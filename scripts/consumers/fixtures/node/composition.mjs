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
  { id: "composition/content-facet", async run() {
const contentFacet = chart().createCanvas({plot:{width:100,height:100},margin:70})
      .createData({values:[{group:"A",x:5,y:5},{group:"B",x:10,y:10}]})
      .createScatterPlot({x:{field:"x",scale:{domain:[0,10]}},y:{field:"y",scale:{domain:[0,10]}},guides:false})
      .editPointMark({stroke:false}).encodePointRadius({value:3})
      .facet({field:"group",spacing:"plot",headers:{anchor:"content"}})
      .editCompositionLayout({topLane:"shared"});
assert.deepEqual(contentFacet.graphicSpec.objects["facet-headers"].items.map(i=>i.properties.y),[54,51]);
assert.deepEqual(deserializeProgram(serializeProgram(contentFacet)).graphicSpec,contentFacet.graphicSpec);
  } },
  { id: "composition/program", async run() {
for (const factory of [chart, basicChart]) {
      const values = [{x:0,y:-0.15},{x:1,y:0.3}];
      const p = factory().createCanvas({width:600,height:480,margin:90})
        .createData({values})
        .createLinePlot({x:"x",y:{field:"y",scale:{domain:[-0.15,0.3]}},guides:false})
        .createYAxis({title:false,ticksAndLabels:{count:10,labels:{fontSize:10,format:"ticks"}}});
      const texts = program => program.graphicSpec.objects.yAxisLabels.items.map(i=>i.properties.text);
      assert.deepEqual(texts(p),["−0.15","−0.10","−0.05","0.00","0.05","0.10","0.15","0.20","0.25","0.30"]);
      assert.deepEqual(p.semanticSpec.datasets[0].values,values);
      const restored=deserializeProgram(serializeProgram(p));
      assert.equal(renderToSVG(restored),renderToSVG(p));
      assert.deepEqual(texts(restored.editYScale({domain:[0,900]})),["0","100","200","300","400","500","600","700","800","900"]);
      assert.equal((await renderToPNGBuffer(p)).width,600);
      assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,4).toString(),"%PDF");
    }
for (const factory of [chart,basicChart]) {
      const rightRows=[{name:"A",age:25},{name:"B",age:39}],leftRows=[{person:"B",group:"First"},{person:"A",group:"Second"}];
      const base=factory().createCanvas({width:400,height:280,margin:50})
        .createData({id:"people",values:rightRows}).createData({id:"groups",values:leftRows});
      const joined=base.createLookupData({id:"ages",field:"person",lookup:{data:"people",key:"name",fields:["age"]}});
      assert.deepEqual(joined.semanticSpec.datasets.find(d=>d.id==="ages").values,[{person:"B",group:"First",age:39},{person:"A",group:"Second",age:25}]);
      assert.deepEqual(joined.semanticSpec.datasets.find(d=>d.id==="people").values,rightRows);
      assert.deepEqual(joined.semanticSpec.datasets.find(d=>d.id==="groups").values,leftRows);
      const bars=joined.createBarPlot({x:"group",y:"age"});
      assert.deepEqual(deserializeProgram(serializeProgram(bars)).graphicSpec,bars.graphicSpec);
      assert(renderToSVG(bars).includes("<rect"));
      assert((await renderToPNGBuffer(bars)).buffer.length>100);
      assert((await renderToPDFBuffer(bars)).buffer.length>100);
      if(factory===chart){
        const edited=bars.editLookupData({target:"ages",lookup:{data:"people",key:"name",fields:["age"],as:["years"]}});
        assert.equal(edited.semanticSpec.layers[0].encoding.y.field,"years");
        assert.deepEqual(edited.graphicSpec.objects.barPlot.items,bars.graphicSpec.objects.barPlot.items);
        assert.equal(edited.graphicSpec.objects.yAxisTitle.properties.text,"mean(years)");
        const revised=bars.reviseData({source:"people",id:"peopleV2",values:[{name:"A",age:30},{name:"B",age:45}]});
        const id=revised.materializationConfigs.data.lookup.ages.current;
        assert.deepEqual(revised.semanticSpec.datasets.find(d=>d.id===id).values.map(r=>r.age),[45,30]);
      }else assert.equal(bars.editLookupData,undefined);
    }
for (const factory of [chart,basicChart]) {
      const dashRows=[{x:0,y:1,g:"A"},{x:1,y:1,g:"A"},{x:0,y:2,g:"B"},{x:1,y:2,g:"B"}];
      const fixedDash=factory().createCanvas({width:500,height:300,margin:60})
        .createData({values:dashRows}).createLinePlot({x:"x",y:"y",guides:false})
        .encodeGroup({field:"g"}).encodeStrokeDash({field:"g"})
        .editLineMark({stroke:"orange",opacity:0.6})
        .createLegend({symbol:{layers:[{type:"line",length:10,lineWidth:1,opacity:1}]}});
      const samples=program=>program.graphicSpec.objects.seriesLegendSymbols.items.map(item=>item.properties);
      assert.deepEqual(samples(fixedDash).map(item=>item.stroke),["orange","orange"]);
      assert.ok(samples(fixedDash).every(item=>item.opacity===1));
      const changed=fixedDash.editLineMark({stroke:"purple"});
      assert.deepEqual(samples(changed).map(item=>item.stroke),["purple","purple"]);
      assert.deepEqual(samples(fixedDash).map(item=>item.stroke),["orange","orange"]);
      assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec,changed.graphicSpec);
    }
for (const factory of [chart, basicChart]) for (const continuous of [false, true]) {
      const base = factory().createCanvas({ width: 800, height: 600, margin: 150 })
        .createData({ values: [{ x: 1, y: 2, g: "A", n: 1 }, { x: 2, y: 3, g: "B", n: 2 }] })
        .createScatterPlot({ x: "x", y: "y", guides: false })
        .encodeColor({ field: continuous ? "n" : "g", fieldType: continuous ? "quantitative" : "nominal" });
      const multiline = base.createLegend({ title: "Alpha\nBeta" });
      const title = Object.values(multiline.graphicSpec.objects).find(o => o.properties?.text === "Alpha\nBeta");
      assert.deepEqual(title.properties.lines.map(line => line.text), ["Alpha", "Beta"]);
      assert.match(renderToSVG(multiline), /<tspan[^>]*>Alpha<\/tspan><tspan[^>]*>Beta<\/tspan>/);
      const restored = deserializeProgram(serializeProgram(multiline));
      assert.deepEqual(restored.graphicSpec, multiline.graphicSpec);
      assert.deepEqual(restored.editLegend({ title: "One" }).graphicSpec, base.createLegend({ title: "One" }).graphicSpec);
    }
for (const factory of [chart, basicChart]) {
      let grouped = factory().createCanvas({ width: 1000, height: 800, margin: 100 })
        .createData({ values: [{ x: 1, y: 2, g: "A", n: 1 }, { x: 2, y: 3, g: "B", n: 2 }] })
        .createPointMark({ id: "groupedPoints" }).encodeX({ field: "x" }).encodeY({ field: "y" })
        .encodeColor({ field: "g" }).encodeSize({ field: "n" });
      if (factory === chart) grouped = grouped.encodeOpacity({ field: "n" });
      grouped = grouped.createLegend({ channels: ["color"], position: "top-left", blockLayout: "row" })
        .createLegend({ channels: ["size"], count: 2 });
      if (factory === chart) grouped = grouped.createLegend({ channels: ["opacity"], count: 2 });
      assert.deepEqual(grouped.guideConfigs.legendGroups.groupedPoints, {
        placement: { position: "top-left", align: "center", offset: 8 }, blockLayout: "row", inferredOffset: true
      });
      assert.ok(renderToSVG(grouped).includes("<svg"));
      if (factory === chart) {
        const free = grouped.editLegendLayout({ at: { x: 201, y: 79 } });
        assert.deepEqual(free.guideConfigs.legendGroups.groupedPoints, {
          placement: { at: { x: 201, y: 79 } }, blockLayout: "row"
        });
        const restored = deserializeProgram(serializeProgram(free));
        assert.deepEqual(restored.graphicSpec, free.graphicSpec);
        assert.deepEqual(restored.editCanvas({ width: 1001 }).editCanvas({ width: 1000 }).graphicSpec, free.graphicSpec);
        const removedOwner = free.removeLegend()
          .createLegend({ channels: ["opacity"], at: { x: 10, y: 10 } })
          .encodeOpacity({ value: 0.5 }).removeMark({ target: "groupedPoints" });
        assert.equal(removedOwner.guideConfigs.legendGroups, undefined);
        assert.doesNotThrow(() => deserializeProgram(serializeProgram(removedOwner)));
      }
    }
const program = chart()
      .createCanvas({ width: 160, height: 120, margin: 20 })
      .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
      .createPointMark()
      .encodeX({ field: "x" })
      .encodeY({ field: "y" })
      .encodeRadius({ value: 3 });
const alternative = exportAccessibleData(program);
assert.equal(alternative.views[0].rows.length, 2);
assert.ok(Object.isFrozen(alternative.views[0].rows));
assert.deepEqual(
      getDatasetSchema(program, { data: "data" }).schema.fields.map(field => field.name),
      ["x", "y"]
    );
assert.equal(describeAction(program, {
      action: "editPointMark",
      target: { kind: "mark", id: "point" },
      options: { fill: "red" }
    }).applicability, "supported");
assert.equal(inspectProgram(program).views.some(view => view.owner.id === "point"), true);
const restored = deserializeProgram(serializeProgram(program));
const revised = program.reviseData({ source: "data", id: "updatedData", values: [
      { x: 1, y: 2 }, { x: 3, y: 7 }, { x: 4, y: 3 }
    ] });
assert.equal(comparePrograms(program, revised).equivalence, "different");
assert.equal(revised.graphicSpec.objects.point.items.length, 3);
assert.equal(program.graphicSpec.objects.point.items.length, 2);
const measured = program.applyTextMetrics({ profile: { schemaVersion: 1, id: "host", measurements: [] } });
assert.equal(measured.materializationConfigs.textMetrics.id, "host");
assert.deepEqual(measured.removeTextMetrics().graphicSpec, program.graphicSpec);
assert.equal(renderToSVG(restored), renderToSVG(program));
assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(program))), renderToSVG(program));
assert.notDeepEqual(restored.editPointMark({ fill: "red" }).graphicSpec, program.graphicSpec);
const jittered = program.jitterPoints({
      channel: "x",
      maxOffset: { pixels: 2 },
      seed: "package-consumer",
      key: "x"
    });
assert.notDeepEqual(
      jittered.graphicSpec.objects.point.items.map(item => item.properties.x),
      program.graphicSpec.objects.point.items.map(item => item.properties.x)
    );
assert.deepEqual(
      jittered.removeJitter().graphicSpec.objects.point.items,
      program.graphicSpec.objects.point.items
    );
assert.equal(program.graphicSpec.objects.point.items.length, 2);
const statisticalReferences = program
      .createReferenceLine({
        id: "packageMean",
        source: "point",
        axis: "y",
        statistic: { op: "mean" }
      })
      .createReferenceBand({
        id: "packageRange",
        source: "point",
        axis: "y",
        statistics: [{ op: "min" }, { op: "max" }]
      });
assert.deepEqual(
      statisticalReferences.semanticSpec.datasets.find(dataset =>
        dataset.id === "packageMean-statistical-reference-data"
      ).values,
      [{ value: 3 }]
    );
assert.equal(statisticalReferences.graphicSpec.objects.packageMean.items.length, 1);
assert.equal(statisticalReferences.graphicSpec.objects.packageRange.items.length, 1);
const atomic = program.encodeChannels({
      target: "point",
      channels: { x: { field: "y" }, y: { field: "x" } }
    });
assert.equal(atomic.semanticSpec.layers[0].encoding.x.field, "y");
assert.equal(atomic.semanticSpec.layers[0].encoding.y.field, "x");
const aspect = program.editCoordinate({
      target: "main",
      aspect: { mode: "frame", ratio: 1 }
    });
assert.deepEqual(aspect.semanticSpec.coordinates[0].aspect, {
      mode: "frame", ratio: 1, alignX: "center", alignY: "center"
    });
const themed = program.applyTheme({ theme: "dark" });
assert.equal(themed.graphicSpec.objects.canvas.properties.background, "#0f172a");
assert.equal(themed.graphicSpec.objects.point.items[0].properties.fill, "#60a5fa");
assert.equal(themed.removeTheme().graphicSpec.objects.canvas.properties.background, "white");
for (const create of [chart, basicChart]) for (const position of ["top", "bottom"]) {
      for (const align of ["left", "center", "right"]) {
        const source = create().createCanvas({ width: 1200, height: 1000, margin: 300 })
          .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
          .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" })
          .encodeColor({ field: "x", fieldType: "quantitative" });
        assert.throws(() => source.createLegend({ position: "left", align: "right" }), /center alignment/);
        assert.throws(() => source.createLegend({ titleStyle: { offset: 10 } }), /titleStyle.*offset/);
        const program = source.createLegend({ position, align, offset: 40, border: true });
        if (create === chart) {
          assert.deepEqual(program.editLegendLayout({ titlePosition: "top" }).graphicSpec, program.graphicSpec);
          assert.throws(() => program.editLegend({ titleStyle: { offset: 10 } }), /titleStyle.*offset/);
        }
        const border = program.graphicSpec.objects.colorGradientBackground.properties;
        const left = border.x - border.strokeWidth / 2;
        const right = border.x + border.width + border.strokeWidth / 2;
        const actual = align === "left" ? left : align === "right" ? right : (left + right) / 2;
        assert.ok(Math.abs(actual - ({ left: 300, center: 600, right: 900 }[align])) < 1e-9);
        const nearEdge = position === "top" ? border.y + border.height + border.strokeWidth / 2
          : border.y - border.strokeWidth / 2;
        assert.equal(nearEdge, position === "top" ? 260 : 740);
        assert.match(renderToSVG(program), /<svg /);
        if (create === chart) assert.deepEqual(program.editLegend({ border: false })
          .editLegend({ border: true }).graphicSpec, program.graphicSpec);
      }
    }
const polar = chart()
      .createCanvas({ width: 160, height: 160, margin: 20 })
      .createData({ values: [{ angle: 0, distance: 1 }, { angle: 1, distance: 2 }] })
      .createPointMark()
      .encodeTheta({ field: "angle" })
      .encodeR({ field: "distance" })
      .encodePointRadius({ value: 3 });
assert.equal(polar.semanticSpec.layers[0].coordinate, "polar");
assert.equal(polar.graphicSpec.objects.point.items.length, 2);
const polarComponents = polar.editCanvas({ width: 480, height: 480, margin: 80 })
      .createThetaAxisTitle({ text: "Angle" })
      .createThetaAxisLine().createThetaAxisTicks({ values: [0, 0.5] })
      .createThetaAxisLabels({ values: [0, 0.5] })
      .createRadialAxisTitle({ angle: 180, text: "Distance", position: "outside" })
      .createRadialAxisLine().createRadialAxisTicks({ count: 3 })
      .createRadialAxisLabels({ count: 3 });
assert.equal(polarComponents.guideConfigs.axis.radius.layout.angle, 180);
assert.equal(polarComponents.graphicSpec.objects.thetaAxisLabels.items.length, 2);
assert.equal(polarComponents.graphicSpec.objects.radialAxisTitle.properties.text, "Distance");
assert.match(renderToSVG(polarComponents), /Distance/);
const polarRemoved = polarComponents.editRadialAxis({ angle: 45, title: false, ticksAndLabels: false });
assert.equal(polarRemoved.graphicSpec.objects.radialAxisTitle, undefined);
assert.equal(polarRemoved.graphicSpec.objects.radialAxisLabels, undefined);
assert.equal(polarRemoved.guideConfigs.axis.radius.layout.angle, 45);
const polarEmpty = polarRemoved.editRadialAxis({ line: false });
assert.equal(polarEmpty.semanticSpec.guides.axis?.radius, undefined);
assert.equal(polarEmpty.guideConfigs.axis?.radius, undefined);
const titleOnly = polarEmpty.createRadialAxis({ angle: 180, line: false, ticksAndLabels: false, title: { text: "Restored" } });
assert.equal(titleOnly.graphicSpec.objects.radialAxisTitle.properties.text, "Restored");
assert.equal(titleOnly.graphicSpec.objects.radialAxisLine, undefined);
assert.throws(() => polarEmpty.editRadialAxis({ angle: 90 }), /existing/);
assert.throws(() => polarEmpty.createThetaAxis({ angle: 90 }), /Unknown/);
assert.equal(polar.graphicSpec.objects.thetaAxisTitle, undefined);
const arcs = chart()
      .createCanvas({ width: 160, height: 160, margin: 20 })
      .createData({ values: [{ group: "A" }, { group: "A" }, { group: "B" }] })
      .createArcMark({ innerRadius: 0.4, padAngle: 2 })
      .encodeTheta({ field: "group", aggregate: "count" })
      .encodeColor({ field: "group" });
assert.equal(arcs.graphicSpec.objects.arc.items.length, 2);
const overflowArcs = arcs.editArcMark({ innerRadius: { unit: "px", value: 30 } })
      .editCoordinate({ target: "polar", polarFrame: {
        radius: { unit: "px", value: 70 }, overflow: "allow"
      } });
assert.equal(overflowArcs.graphicSpec.objects.arc.items.length, 2);
assert.deepEqual(overflowArcs.markConfigs.arc.innerRadius, { unit: "px", value: 30 });
assert.equal(overflowArcs.semanticSpec.coordinates.find(item => item.id === "polar").polarFrame.overflow, "allow");
assert.equal(
      arcs.graphicSpec.objects.arc.items.every(
        item => item.properties.commands.at(-1).op === "Z"
      ),
      true
    );
const pair = hconcat({
      programs: [program, polar],
      gap: 8
    }).editCompositionLayout({ padding: 4 });
const replaced = pair.replaceCompositionChild({
      target: "view-2",
      program: arcs
    });
const inserted = pair.insertCompositionChild({
      id: "polarArcs",
      program: arcs,
      after: "view-1"
    });
const reordered = inserted.reorderCompositionChildren({
      order: ["polarArcs", "view-2", "view-1"]
    });
const removed = reordered.removeCompositionChild({ target: "view-2" });
const nested = vconcat({ programs: [pair, replaced] });
assert.equal(replaced.children["view-2"], arcs);
assert.deepEqual(removed.compositionSpec.children, ["polarArcs", "view-1"]);
assert.equal(removed.children.polarArcs, arcs);
assert.equal(nested.compositionSpec.direction, "vertical");
const faceted = program.facet({ field: "x", columns: 2 });
assert.equal(faceted.compositionSpec.type, "facet");
assert.equal(
      faceted.children["facet-cell-1"].semanticSpec.datasets.find(
        dataset => dataset.id === "facet-cell-1-data"
      ).values.length,
      1
    );
const memoryPNG = await renderToPNGBuffer(program);
const memoryPDF = await renderToPDFBuffer(program);
assert.equal(memoryPNG.buffer instanceof Uint8Array, true);
assert.equal(memoryPDF.buffer instanceof Uint8Array, true);
assert.equal(memoryPNG.bytes, memoryPNG.buffer.length);
assert.equal(memoryPDF.pages, 1);
const result = await renderToPNG(program, {
      output: consumerPath(new URL("./chart.png", import.meta.url)),
      pixelRatio: 1
    });
assert.equal(result.width, 160);
assert.equal(result.height, 120);
const pdf = await renderToPDF(program, {
      output: consumerPath(new URL("./chart.pdf", import.meta.url)),
      metadata: {
        title: "Package consumer chart",
        keywords: ["package", "consumer"]
      }
    });
assert.equal(pdf.width, 160);
assert.equal(pdf.height, 120);
assert.equal(pdf.pages, 1);
assert.ok(pdf.bytes > 0);
const svg = renderToSVG(program, {
      title: "Package consumer chart",
      resourceNamespace: "packageConsumer"
    });
assert.match(svg, /^<svg /);
assert.match(svg, /<title>Package consumer chart<\/title>/);
assert.match(svg, /<circle /);
  } },
  { id: "composition/deserialize-program", async run() {
{
      const {createFacetHeaderRotation} = await import("./facet-header-rotation.js");
      const p = createFacetHeaderRotation();
      assert.deepEqual(p.graphicSpec.objects.canvas.properties, {width:185,height:195,background:"white"});
      assert.deepEqual(p.graphicSpec.objects["facet-headers"].items.map(i=>[i.properties.x,i.properties.y,i.properties.rotation]), [[9,50,-Math.PI/2],[9,135,-Math.PI/2]]);
      assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
      assert(renderToSVG(p).includes("North"));
      assert.equal((await renderToPNGBuffer(p)).buffer.subarray(1,4).toString(),"PNG");
      assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0,4).toString(),"%PDF");
      assert.equal(typeof basicChart().editFacetHeaders,"undefined");
    }
  } },
  { id: "composition/shared-lane", async run() {
const sharedLane=createFacetSharedTopLaneProgram();
assert.equal(sharedLane.compositionSpec.topLane,"shared");
assert.deepEqual(sharedLane.graphicSpec.objects.canvas.properties,{width:508,height:262,background:"white"});
assert.deepEqual(deserializeProgram(serializeProgram(sharedLane)).graphicSpec,sharedLane.graphicSpec);
const stackedLane=sharedLane.editCompositionLayout({topLane:"stacked"});
assert.equal(Object.hasOwn(stackedLane.compositionSpec,"topLane"),false);
assert.equal(stackedLane.graphicSpec.objects.canvas.properties.height,302);
assert.deepEqual(stackedLane.editCompositionLayout({topLane:"shared"}).graphicSpec,sharedLane.graphicSpec);
assert.throws(()=>sharedLane.editTitle({offset:20}),/Shared facet top lane/);
assert.ok(renderToSVG(sharedLane).includes("Grouped Bar Chart"));
assert.ok((await renderToPNGBuffer(sharedLane)).buffer.length>100);
assert.ok((await renderToPDFBuffer(sharedLane)).buffer.length>100);
  } },
  { id: "composition/create-canvas", async run() {
{
      const neutralHueExpected = ["#4682b4","#6090bd","#789fc6","#8faecf","#a5bed8","#bbcde2","#d1ddeb","#e7edf4","#fdfdfd"];
      const neutralHueRows = Array.from({length:9},(_,i)=>({x:i,y:i,v:i/8}));
      const neutralHue = chart().createCanvas({width:600,height:500,margin:100})
        .createData({values:neutralHueRows}).createScatterPlot({x:"x",y:"y",guides:false})
        .encodeColor({field:"v",fieldType:"quantitative",scale:{domain:[0,1],range:["#4682b4","#fdfdfd"],interpolate:"hcl",whitePoint:"d50"}})
        .createLegend({title:false,representation:"symbols",values:[0,.5,1]});
      assert.deepEqual(neutralHue.graphicSpec.objects.scatterPlot.items.map(item=>item.properties.fill),neutralHueExpected);
      assert.deepEqual(neutralHue.graphicSpec.objects.colorGradientSymbols.items.map(item=>item.properties.fill),[neutralHueExpected[0],neutralHueExpected[4],neutralHueExpected[8]]);
      assert.deepEqual(deserializeProgram(serializeProgram(neutralHue)).graphicSpec,neutralHue.graphicSpec);
      const neutralHueLab = neutralHue.editColorScale({interpolate:"lab",whitePoint:"d50"});
      assert.equal(renderToSVG(neutralHue),renderToSVG(neutralHueLab));
      assert.deepEqual((await renderToPNGBuffer(neutralHue)).buffer,(await renderToPNGBuffer(neutralHueLab)).buffer);
      assert.deepEqual(neutralHue.editColorScale({reverse:true}).graphicSpec.objects.scatterPlot.items.map(item=>item.properties.fill),neutralHueExpected.toReversed());
      assert.deepEqual(neutralHue.semanticSpec.datasets[0].values,neutralHueRows);
      const foldPartitionRows = [{country:"USA",gold:10,silver:20},{country:"Canada",gold:7,silver:26}];
      const foldPartitionUnit = chart().createCanvas({width:160,height:320,margin:{left:45,right:10,top:70,bottom:50}})
        .createData({values:foldPartitionRows}).createFoldData({id:"long",fields:["gold","silver"],as:{key:"k",value:"v"}})
        .createBarPlot({x:"country",y:"v",guides:false});
      const foldPartition = foldPartitionUnit.facet({field:"k",data:"long",columns:2});
      assert.deepEqual(foldPartition.compositionSpec.facet.values,["gold","silver"]);
      const foldPanelValues = foldPartition.compositionSpec.children.map(id=>{
        const c=foldPartition.children[id],d=c.semanticSpec.datasets.find(d=>d.id===c.semanticSpec.layers[0].data);
        assert.deepEqual(c.semanticSpec.datasets[0].values,foldPartitionRows);
        assert.equal(c.semanticSpec.datasets.find(d=>d.id==="long").values.length,4);
        return d.values.map(r=>r.v);
      });
      assert.deepEqual(foldPanelValues,[[10,7],[20,26]]);
      const foldRestored = deserializeProgram(serializeProgram(foldPartition));
      assert.equal(renderToSVG(foldRestored),renderToSVG(foldPartition));
      assert.deepEqual((await renderToPNGBuffer(foldPartition)).buffer,(await renderToPNGBuffer(foldRestored)).buffer);
      assert.ok((await renderToPDFBuffer(foldPartition)).buffer.length>100);
      const facetNumericRows = [{x:0,y:0,v:0,g:"a"},{x:1,y:1,v:1,g:"b"}];
      const facetNumericScale = {domain:[0,1],range:["red","blue"],interpolate:"lab",whitePoint:"d50"};
      const facetNumericUnit = chart().createCanvas({width:800,height:800,margin:200})
        .createData({values:facetNumericRows}).createScatterPlot({x:"x",y:"y",guides:false})
        .encodeColor({field:"v",fieldType:"quantitative",scale:facetNumericScale})
        .encodeStroke({field:"v",fieldType:"quantitative",scale:facetNumericScale});
      const facetNumeric = facetNumericUnit.facet({field:"g",guides:{legend:"shared"}});
      assert.deepEqual(Object.keys(facetNumeric.guideConfigs.legend),["gradient","strokeGradient"]);
      const facetNumericRestored = deserializeProgram(serializeProgram(facetNumeric));
      assert.deepEqual(facetNumericRestored.graphicSpec,facetNumeric.graphicSpec);
      assert.equal(renderToSVG(facetNumeric),renderToSVG(facetNumericRestored));
      const facetNumericPng = await renderToPNGBuffer(facetNumeric);
      assert.ok(facetNumericPng.buffer.byteLength > 1000);
      assert.deepEqual(facetNumericPng.buffer,(await renderToPNGBuffer(facetNumericRestored)).buffer);
      assert.deepEqual(facetNumericUnit.semanticSpec.datasets[0].values,facetNumericRows);
      for (const child of Object.values(facetNumeric.children)) {
        assert.equal(child.graphicSpec.objects.canvas.properties.height,800);
        assert.deepEqual(child.guideConfigs.legend ?? {},{});
      }

    }
  } },
  { id: "composition/windowed", async run() {
for(const factory of [chart,basicChart]){
      const combinedBase=factory().createCanvas({width:1000,height:800,margin:250})
        .createData({values:[{x:0,y:0,g:"A"},{x:1,y:1,g:"B"}]})
        .createPointMark({id:"p"}).encodeX({field:"x"}).encodeY({field:"y"})
        .encodeShape({field:"g",scale:{range:["circle","square"]}})
        .encodeSize({field:"g",fieldType:"ordinal",scale:{range:[25,100]}});
      const combined=combinedBase.createLegend({combine:"size-shape"});
      assert.equal(combined.graphicSpec.objects.seriesLegendSymbolPoints.items[1].properties.width,10);
      assert.deepEqual(deserializeProgram(serializeProgram(combined)).graphicSpec,combined.graphicSpec);
      assert.ok((await renderToPNGBuffer(combined)).buffer.length>100);
      const windowed=combinedBase.createLegend({combine:"size-shape",clipHeight:6});
      assert.equal(windowed.guideConfigs.legend.series.clipHeight,6);
      assert.ok(windowed.graphicSpec.objects.seriesLegendSymbolPoints.children.length>0);
      if (factory === chart) assert.deepEqual(windowed.editLegendSymbols({channel:"shape",clipHeight:"auto"}).graphicSpec,combined.graphicSpec);
      assert.deepEqual(deserializeProgram(serializeProgram(windowed)).graphicSpec,windowed.graphicSpec);
      if(factory===chart){
        const windowParent=combinedBase.facet({field:"g",columns:2,guides:{legend:{combine:"size-shape",position:"top-left",clipHeight:6}}})
          .editLegendSymbols({channel:"size",clipHeight:8}).editCompositionLayout({gap:10});
        assert.equal(windowParent.guideConfigs.legend.series.clipHeight,8);
        assert.deepEqual(deserializeProgram(serializeProgram(windowParent)).graphicSpec,windowParent.graphicSpec);
        const windowPair=hconcat({programs:[windowed,windowed]});
        assert.deepEqual(deserializeProgram(serializeProgram(windowPair)).graphicSpec,windowPair.graphicSpec);
        assert.ok(Object.keys(windowPair.graphicSpec.objects).every(id=>/^[A-Za-z0-9_-]+$/.test(id)));
      }
      const translucent=combinedBase.createLegend({combine:"size-shape",symbol:{layers:[{type:"point",opacity:0.7}]}});
      assert.equal(translucent.graphicSpec.objects.seriesLegendSymbolPoints.items[0].properties.blend,"normal");
      assert.deepEqual(deserializeProgram(serializeProgram(translucent)).graphicSpec,translucent.graphicSpec);
      assert.ok((await renderToPNGBuffer(translucent)).buffer.length>100);
    }
const windowed = chart()
      .createData({
        id: "events",
        values: [
          { group: "A", order: 2, value: 3 },
          { group: "A", order: 1, value: 2 },
          { group: "B", order: 1, value: 4 }
        ]
      })
      .createWindowData({
        id: "windowedEvents",
        partitionBy: "group",
        sortBy: [{ field: "order" }],
        operations: [
          { op: "rowNumber", as: "rowNumber" },
          { op: "cumulativeSum", field: "value", as: "runningValue" },
          {
            op: "movingMean",
            field: "value",
            as: "movingValue",
            frame: { preceding: 1 }
          }
        ]
      });
const windowValues = windowed.semanticSpec.datasets.find(
      dataset => dataset.id === "windowedEvents"
    ).values;
assert.deepEqual(
      windowValues.map(row => [row.rowNumber, row.runningValue, row.movingValue]),
      [[2, 5, 2.5], [1, 2, 2], [1, 4, 4]]
    );
  } },
  { id: "composition/parent-legend", async run() {
const parentLegend=chart().createCanvas({plot:{width:60,height:275},margin:{top:35,right:5,bottom:60,left:45}})
      .createData({values:Array.from({length:8},(_,i)=>({x:i,y:i+1,g:i%2?"B":"A",panel:String(i%4)}))})
      .createScatterPlot({x:"x",y:"y",color:"g",guides:false})
      .facet({field:"panel",columns:4,spacing:"plot",gap:2,guides:{legend:{position:"top-left"}}})
      .editLegendTitle({fontSize:11}).editLegendLabels({channel:"color",fontSize:10})
      .editLegendLayout({channel:"color",position:"bottom-right"});
assert.equal(parentLegend.compositionSpec.facet.guides.legend.type,"authored-legend");
assert.equal(parentLegend.guideConfigs.legend.color.labels.fontSize,10);
assert.deepEqual(deserializeProgram(serializeProgram(parentLegend)).editCompositionLayout({gap:8}).graphicSpec,
      parentLegend.editCompositionLayout({gap:8}).graphicSpec);
assert.ok((await renderToPNGBuffer(parentLegend)).buffer.length>100);
assert.ok((await renderToPDFBuffer(parentLegend)).buffer.length>100);
assert.equal(parentLegend.removeLegend().editCompositionLayout({gap:8}).compositionSpec.facet.guides.legend,false);
  } },
  { id: "composition/parent-combined", async run() {
const parentCombined=chart().createCanvas({plot:{width:600,height:450},margin:100})
      .createData({values:Array.from({length:8},(_,i)=>({x:i,y:i+1,v:i+1,panel:i%2?"B":"A"}))})
      .createScatterPlot({x:"x",y:"y",guides:false})
      .encodeColor({field:"v",fieldType:"quantitative",scale:{domain:[1,8],range:["black","white"]}})
      .encodeSize({field:"v",scale:{domain:[1,8],range:[100,900]}})
      .facet({field:"panel",columns:2,guides:{legend:{channels:["color","size"],combine:"color-size",position:"top-right",count:3,clipHeight:12}}});
assert.deepEqual(Object.keys(parentCombined.guideConfigs.legend),["colorSize"]);
assert.equal(parentCombined.semanticSpec.guides.legend.colorSize.colorScale,"color");
assert.equal(parentCombined.semanticSpec.guides.legend.colorSize.sizeScale,"size");
assert.deepEqual(deserializeProgram(serializeProgram(parentCombined)).editCompositionLayout({gap:20}).graphicSpec,
      parentCombined.editCompositionLayout({gap:20}).graphicSpec);
const parentCombinedEdited=parentCombined.editLegendSymbols({channel:"size",symbol:{opacity:0.7}});
assert.equal(parentCombinedEdited.guideConfigs.legend.colorSize.symbol.opacity,0.7);
const parentCombinedRemoved=parentCombinedEdited.removeLegend({channels:["color"]});
assert.equal(parentCombinedRemoved.editCompositionLayout({gap:25}).guideConfigs.legend,undefined);
assert.equal(parentCombinedRemoved.semanticSpec.guides.legend?.colorSize,undefined);
assert.deepEqual(deserializeProgram(serializeProgram(parentCombinedRemoved)).graphicSpec,parentCombinedRemoved.graphicSpec);
assert.ok((await renderToPNGBuffer(parentCombined)).buffer.length>100);
assert.ok((await renderToPDFBuffer(parentCombined)).buffer.length>100);
  } },
  { id: "composition/initial-headers", async run() {
const initialHeaders = chart().createCanvas({ width: 250, height: 200, margin: 50 })
      .createData({ values: [{ x: 1, y: 2, group: "A" }, { x: 2, y: 3, group: "B" }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .facet({ field: "group", headers: { color: "red", column: { side: "right" } } });
assert.equal(initialHeaders.materializationConfigs.facets.facet.headers.common.color, "red");
assert.deepEqual(deserializeProgram(serializeProgram(initialHeaders)).graphicSpec, initialHeaders.graphicSpec);
assert.ok((await renderToPNGBuffer(initialHeaders)).buffer.length > 1000);
  } },
  { id: "composition/many-panels", async run() {
const manyPanels = chart().createCanvas({ width: 120, height: 100, margin: 20 })
      .createData({ id: "manyRows", values: Array.from({ length: 212 }, (_, i) => ({
        group: "item-" + Math.floor(i / 2), x: i % 2, y: i % 7
      })) })
      .createLinePlot({ x: "x", y: "y", groupBy: "group", guides: false })
      .facet({ field: "group", columns: 10, scales: { x: "independent", y: "independent" } });
const manyStored = serializeProgram(manyPanels);
assert.equal(JSON.parse(manyStored).schemaVersion, 3);
const manyRestored = deserializeProgram(manyStored);
assert.equal(Object.keys(manyRestored.children).length, 106);
const manyChildren = Object.values(manyRestored.children);
assert.equal(manyChildren[0].semanticSpec.datasets[0].values, manyChildren[105].semanticSpec.datasets[0].values);
assert.equal(serializeProgram(manyRestored), manyStored);
assert.ok((await renderToPNGBuffer(manyRestored)).buffer.length > 1000);
  } },
  { id: "composition/compact-facet", async run() {
const compactFacet = chart().createCanvas({ width: 200, height: 140,
      margin: { left: 80, right: 20, top: 20, bottom: 20 }
    }).createData({ values: [{ group: "A", x: 1, y: 1 }, { group: "B", x: 2, y: 2 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .facet({ field: "group", spacing: "plot", gap: 5 });
assert.equal(compactFacet.graphicSpec.objects.canvas.properties.width, 305);
assert.equal(compactFacet.editCompositionLayout({ gap: 11 }).graphicSpec.objects.canvas.properties.width, 311);
assert.deepEqual(deserializeProgram(serializeProgram(compactFacet)).graphicSpec, compactFacet.graphicSpec);
assert.match(renderToSVG(compactFacet), /<svg/);
const facetTitle = compactFacet.createTitle({ text: "Panel groups", titleStyle: { fontStyle: "italic" } });
assert.equal(facetTitle.graphicSpec.objects.chartTitle.properties.fontStyle, "italic");
assert.equal(facetTitle.editCompositionLayout({ gap: 11 }).graphicSpec.objects.chartTitle.properties.fontStyle, "italic");
const shiftedFacetTitle = facetTitle.editTitle({ alongOffset: -10, subtitle: "Notes" });
assert.equal(shiftedFacetTitle.graphicSpec.objects.chartTitle.properties.x, facetTitle.graphicSpec.objects.chartTitle.properties.x - 10);
assert.equal(shiftedFacetTitle.graphicSpec.objects.chartSubtitle.properties.x, shiftedFacetTitle.graphicSpec.objects.chartTitle.properties.x);
assert.deepEqual(deserializeProgram(serializeProgram(shiftedFacetTitle)).graphicSpec, shiftedFacetTitle.graphicSpec);
assert.throws(() => facetTitle.editTitle({ alongOffset: 10000 }), /outside the Canvas/);
  } },
  { id: "composition/plot-anchored-facet", async run() {
const plotAnchoredFacet = chart().createCanvas({ width: 400, height: 280,
      margin: { left: 80, right: 200, top: 40, bottom: 40 } })
      .createData({ values: [{ panel: "A", category: "u", x: 1, y: 2 }, { panel: "B", category: "v", x: 2, y: 3 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false }).encodeColor({ field: "category" })
      .createLegend().facet({ field: "panel", guides: { legend: "shared" } });
assert.equal(plotAnchoredFacet.graphicSpec.objects.canvas.properties.width, 816);
const promotedLegendCanvas = plotAnchoredFacet.graphicSpec.objects["facet-shared-legend"].properties;
const promotedLegendTitle = plotAnchoredFacet.graphicSpec.objects.colorLegendTitle.properties;
assert.equal(promotedLegendCanvas.x + promotedLegendTitle.x, 624);
assert.equal(promotedLegendCanvas.y + promotedLegendTitle.y, 40);
assert(Object.values(plotAnchoredFacet.children).every(child =>
      child.graphicSpec.objects.canvas.properties.width === 400 && child.materializationConfigs.canvas.margin.right === 200));
assert.deepEqual(deserializeProgram(serializeProgram(plotAnchoredFacet)).graphicSpec, plotAnchoredFacet.graphicSpec);
  } },
  { id: "composition/package-polar-rows", async run() {
const packagePolarRows = [
      { panel: "A", angle: 0, bearing: 45, radius: 1, distance: 10 },
      { panel: "A", angle: 90, bearing: 135, radius: 2, distance: 20 },
      { panel: "B", angle: 0, bearing: 45, radius: 10, distance: 100 },
      { panel: "B", angle: 90, bearing: 135, radius: 20, distance: 200 }
    ];
const createPackagePolarUnit = values => chart()
      .createCanvas({ width: 220, height: 200, margin: 40 })
      .createData({ id: "packagePolarData", values })
      .createPolarScatterPlot({
        id: "packagePolar",
        theta: { field: "angle", scale: { nice: false, zero: false } },
        radius: { field: "radius", scale: { nice: false, zero: false } },
        guides: false
      })
      .createThetaGrid({ coordinate: "polar", scale: "theta", values: [0, 90] })
      .editCoordinate({
        target: "polar",
        aspect: { mode: "frame", ratio: 1 },
        polarFrame: {
          center: { x: 0.25, y: 0.5 },
          radius: { unit: "fraction", value: 0.8 }
        }
      })
      .createMarkLabels({
        id: "packagePolarLabels", source: "packagePolar", field: "radius"
      });
const packagePolarUnit = createPackagePolarUnit(packagePolarRows);
const packagePolarFacet = packagePolarUnit.facet({
      id: "packagePolarFacet", field: "panel"
    })
      .editFacetHeaders({ labelMap: [{ value: "A", label: "Alpha" }] })
      .editFacetScales({ r: "independent" })
      .applyTheme({
        theme: { base: "light", tokens: { background: "#fff7ed" } },
        scope: "descendants"
      });
assert.deepEqual(Object.values(packagePolarFacet.children).map(child =>
      child.resolvedScales.radius.domain), [[1, 2], [10, 20]]);
assert.deepEqual(Object.values(packagePolarFacet.children).map(child =>
      child.resolvedScales.radius.range), [[0, 24], [0, 24]]);
assert.deepEqual(packagePolarFacet.graphicSpec.objects["packagePolarFacet-headers"]
      .items.map(item => item.properties.text), ["Alpha", "B"]);
assert.equal(Object.values(packagePolarFacet.children).every(child =>
      child.graphicSpec.objects.packagePolarLabels.items.length === 2 &&
      child.graphicSpec.objects.thetaGridLines.items.length === 2 &&
      child.graphicSpec.objects.canvas.properties.background === "#fff7ed"), true);
const packagePolarRepeat = packagePolarUnit.repeatCharts({
      id: "packagePolarRepeat", target: "packagePolar", channel: "r",
      fields: ["radius", "distance"]
    });
assert.deepEqual(Object.values(packagePolarRepeat.children).map(child =>
      child.semanticSpec.layers.find(layer => layer.id === "packagePolar")
        .encoding.radius.field), ["radius", "distance"]);
assert.equal(Object.values(packagePolarRepeat.children).every(child =>
      child.semanticSpec.layers.some(layer =>
        layer.id === "packagePolarLabels" && layer.source === "packagePolar"
      )), true);
const resizedPackagePolarFacet = packagePolarFacet.editFacetSource({
      program: createPackagePolarUnit(packagePolarRows)
        .editCanvas({ width: 260, height: 240 })
    });
assert.equal(Object.values(resizedPackagePolarFacet.children).every(child =>
      child.graphicSpec.objects.canvas.properties.width === 260 &&
      child.graphicSpec.objects.canvas.properties.height === 240), true);
assert.deepEqual(Object.values(resizedPackagePolarFacet.children).map(child =>
      child.resolvedScales.radius.range), [[0, 32], [0, 32]]);
assert.match(renderToSVG(resizedPackagePolarFacet), /^<svg/);
  } },
  { id: "composition/package-parallel-unit", async run() {
const packageParallelUnit = chart()
      .createCanvas({ width: 240, height: 180, margin: 35 })
      .createData({ id: "packageParallelData", values: [
        { panel: "A", a: 1, b: 100, c: 5, d: 50 },
        { panel: "A", a: 2, b: 200, c: 6, d: 60 },
        { panel: "B", a: 10, b: 1000, c: 50, d: 500 },
        { panel: "B", a: 20, b: 2000, c: 60, d: 600 }
      ] })
      .createParallelCoordinates({
        id: "packageParallel",
        dimensions: [
          { field: "a", scale: { zero: false, nice: false } },
          { field: "b", scale: { zero: false, nice: false } }
        ],
        guides: false
      })
      .createParallelAxes()
      .editParallelAxis({ field: "a", title: { text: "Primary" } });
const packageParallelEdited = packageParallelUnit.editParallelScale({
      target: "packageParallel", dimension: "a", domain: [0, 20]
    });
const packageParallelFacet = packageParallelEdited.facet({
      id: "packageParallelFacet", field: "panel",
      scales: { parallelDimensions: "shared" }
    });
assert.deepEqual(Object.values(packageParallelFacet.children).map(child =>
      child.resolvedScales["packageParallel-parallel-0"].domain),
    [[0, 20], [0, 20]]);
assert.deepEqual(Object.values(packageParallelFacet.children).map(child =>
      child.graphicSpec.objects.parallelAxisTitles.items.map(
        item => item.properties.text
      )), [["Primary", "b"], ["Primary", "b"]]);
const packageParallelRepeat = packageParallelEdited.repeatCharts({
      id: "packageParallelRepeat", target: "packageParallel",
      channel: { parallelDimension: "a" }, fields: ["c", "d"]
    });
assert.deepEqual(Object.values(packageParallelRepeat.children).map(child =>
      child.semanticSpec.layers[0].encoding.parallel.dimensions.map(
        dimension => dimension.field
      )), [["c", "b"], ["d", "b"]]);
const packageParallelScales = packageParallelEdited.semanticSpec.layers[0]
      .encoding.parallel.dimensions.map(dimension => dimension.scale);
const packageParallelCleaned = packageParallelEdited
      .removeMark({ target: "packageParallel" })
      .removeScale({ id: packageParallelScales[0] })
      .removeScale({ id: packageParallelScales[1] })
      .removeData({ id: "packageParallelData" })
      .removeCoordinate({ id: "parallel" });
assert.deepEqual(packageParallelCleaned.semanticSpec.datasets, []);
assert.deepEqual(packageParallelCleaned.semanticSpec.scales, []);
assert.deepEqual(packageParallelCleaned.semanticSpec.coordinates, []);
assert.equal(packageParallelCleaned.context.currentGuide, undefined);
  } }
];
