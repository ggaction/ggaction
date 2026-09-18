import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";

const values = [{x:1,y:2,k:10}, {x:2,y:3,k:"10"}, {x:3,y:1,k:false}];
function build(factory = chart) {
  return factory().createCanvas({width:800,height:500,margin:{left:60,right:260,top:60,bottom:130}})
    .createData({values}).createScatterPlot({
      id:"points",x:"x",y:"y",size:{field:"k",fieldType:"nominal"},guides:false
    }).createLegend({channels:["size"]});
}
function labels(program) {
  return program.graphicSpec.objects.sizeLegendLabels.items.map(item=>item.properties.text);
}
function areas(program) {
  return program.graphicSpec.objects.sizeLegendSymbols.items.map(item=>Math.PI*item.properties.radius**2);
}

test("categorical point size renders original labels and matching areas in Full and Basic",()=>{
  for (const factory of [chart,basicChart]) {
    const program=build(factory);
    assert.deepEqual(program.resolvedScales.size.domain,[10,"10",false]);
    assert.deepEqual(labels(program),["10","10","false"]);
    areas(program).forEach((area,i)=>assert.ok(Math.abs(area-[24,110,196][i])<1e-10));
    assert.match(renderToSVG(program),/>false<\/text>/);
    const pointAreas = program.graphicSpec.objects.points.items.map(item => Math.PI * item.properties.radius ** 2);
    pointAreas.forEach((area, index) => assert.ok(Math.abs(area - [24, 110, 196][index]) < 1e-10));
  }
});

test("categorical size edits preserve order, immutability, persistence and layout replay",()=>{
  const original=build();
  const snapshot=serializeProgram(original);
  const edited=original.editSizeScale({domain:[false,"10",10],range:[81,9,36]})
    .editLegend({channels:["size"],title:"Categories",labels:{fontSize:11}})
    .editCanvas({width:900});
  assert.deepEqual(labels(edited),["false","10","10"]);
  areas(edited).forEach((area,i)=>assert.ok(Math.abs(area-[81,9,36][i])<1e-10));
  assert.deepEqual(deserializeProgram(serializeProgram(edited)).graphicSpec,edited.graphicSpec);
  assert.equal(serializeProgram(original),snapshot);
  assert.throws(()=>original.editLegend({channels:["size"],count:2}),/do not support count/);
  assert.throws(()=>original.editSizeScale({type:"linear",domain:[0,10],range:[24,196]}),/incompatible/);
});

test("categorical size coexists with independent continuous color and rejects mismatched types",()=>{
  const base=build();
  const colored=base.encodeColor({field:"y",fieldType:"quantitative"})
    .createLegend({channels:["color"],position:"bottom"});
  assert.deepEqual(labels(colored),["10","10","false"]);
  assert.equal(colored.resolvedScales.color.type,"sequential");
  assert.match(renderToSVG(colored),/>false<\/text>/);
  assert.throws(()=>base.encodeSize({field:"x",fieldType:"quantitative"}),/must match/);
});

test("categorical size shares domains across facets and retains explicit unknown areas",()=>{
  const original=build();
  const faceted=original.facet({field:"k",columns:3});
  const svg=renderToSVG(faceted);
  assert.match(svg,/>false<\/text>/);
  const facetAreas = Object.entries(faceted.graphicSpec.objects)
    .filter(([id]) => id.endsWith("_points"))
    .flatMap(([, object]) => object.items.map(item => Math.PI * item.properties.radius ** 2));
  assert.equal(facetAreas.length, 3);
  facetAreas.forEach((area, index) => assert.ok(Math.abs(area - [24, 110, 196][index]) < 1e-10));
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec,faceted.graphicSpec);
  const fallback=chart().createCanvas().createData({values:[
    {x:1,y:2,k:"A"},{x:2,y:1,k:null},{x:3,y:3,k:"B"}
  ]}).createScatterPlot({
    id:"points",x:"x",y:"y",size:{field:"k",fieldType:"nominal",scale:{
      domain:["A"],range:[36],unknown:9
    }},guides:false
  });
  const mapped=fallback.graphicSpec.objects.points.items.map(item=>Math.PI*item.properties.radius**2);
  mapped.forEach((area,i)=>assert.ok(Math.abs(area-[36,9,9][i])<1e-10));
});


test("categorical size refreshes shared consumers and rejects numeric legend sampling", () => {
  const original = build();
  const shared = original.createData({id:"other",values:[{x:4,y:4,k:"new"}]})
    .createScatterPlot({id:"otherPoints",data:"other",x:"x",y:"y",size:{field:"k",fieldType:"ordinal"},guides:false});
  assert.deepEqual(shared.resolvedScales.size.domain,[10,"10",false,"new"]);
  assert.deepEqual(labels(shared),["10","10","false","new"]);
  const rebound = original.encodeChannels({target:"points",channels:{
    size:{field:"x",fieldType:"ordinal",scale:{id:"categories"}}
  }});
  assert.deepEqual(rebound.resolvedScales.categories.domain,[1,2,3]);
  assert.deepEqual(labels(rebound),["1","2","3"]);
  assert.throws(() => original.editLegendBlock({target:"points",channel:"size",count:2}), /sampled legend/);
  assert.throws(() => original.editLegend({channels:["size"],labels:{format:".2f"}}), /original category labels/);
});
