import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
const range = ["#000000", "#ffffff"];
const data = values => values.map((value, i) => ({x:i+1,y:i+2,value,group:i<2?"A":"B"}));
function plot(values=[1,10,100], scale={type:"log"}, guides={legend:{count:3}}) {
  return chart().createCanvas({width:640,height:400,margin:100}).createData({values:data(values)})
    .createScatterPlot({id:"points",x:"x",y:"y",color:{field:"value",fieldType:"quantitative",scale:{range,...scale}},guides});
}
const fills = (p,id="points") => p.graphicSpec.objects[id].items.map(item=>item.properties.fill);
const labels = p => p.graphicSpec.objects.colorGradientLabels.items.map(item=>item.properties);
const close = (x,y) => assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);

test("log colors and gradient ticks share logarithmic positions",()=>{
  const p=plot();
  assert.deepEqual(fills(p),["#000000","#808080","#ffffff"]);
  assert.deepEqual(labels(p).map(i=>i.text),["1","10","100"]);
  const ys=labels(p).map(i=>i.y); close(ys[0]-ys[1],ys[1]-ys[2]);
  assert.equal(p.resolvedScales.color.base,10);
  const horizontal=plot([1,10,100],{type:"log"},{axes:false,grid:false,legend:{position:"bottom",count:3}});
  const xs=labels(horizontal).map(i=>i.x); close(xs[1]-xs[0],xs[2]-xs[1]);
  assert.match(renderToSVG(p),/#808080/);
});

test("signed symlog colors, zero, and constant edits remain synchronized",()=>{
  const p=plot([-1,-.01,0,.01,1],{type:"symlog",constant:.01});
  assert.equal(fills(p)[0],"#000000");assert.equal(fills(p)[2],"#808080");assert.equal(fills(p)[4],"#ffffff");
  const before=JSON.stringify(p);
  const next=p.editColorScale({constant:.1});
  assert.notEqual(fills(next)[1],fills(p)[1]);
  assert.equal(next.resolvedScales.color.constant,.1);
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec,next.graphicSpec);
  assert.deepEqual(fills(next.editColorScale({reverse:true})),[...fills(next)].reverse());
});

test("color family edits clean transform parameters and rematerialize legends",()=>{
  const p=plot([1,10,100],{type:"log"},{});
  const sequential=p.editColorScale({type:"sequential"});
  assert.equal(sequential.resolvedScales.color.base,undefined);
  assert.notEqual(fills(sequential)[1],fills(p)[1]);
  assert.deepEqual(fills(sequential.editColorScale({type:"log",base:2})),fills(p));
  assert.equal(p.editColorScale({interpolate:"lab"}).editColorScale({type:"symlog"}).resolvedScales.color.interpolate,"lab");
  const discretized=p.editColorScale({type:"quantize",range:["red","blue"]});
  assert.equal(discretized.graphicSpec.objects.colorGradientStrips,undefined);
  assert.deepEqual(fills(discretized.editColorScale({type:"log",range})),fills(p));
  assert.deepEqual(fills(p.encodeColor({target:"points",field:"value",fieldType:"quantitative",scale:{type:"symlog",constant:.01}})),fills(plot([1,10,100],{type:"symlog",constant:.01})));
});

test("invalid log domains, temporal transforms, and parameters reject atomically",()=>{
  const p=plot();const before=JSON.stringify(p);
  for(const patch of [{domain:[0,100]},{domain:[-1,100]},{base:0},{base:1},{base:Infinity},{constant:1},{midpoint:10}]){
    assert.throws(()=>p.editColorScale(patch));assert.equal(JSON.stringify(p),before);
  }
  assert.throws(()=>plot([-1,0,1],{type:"log"}));
  assert.throws(()=>plot([1,2,3],{type:"symlog",constant:0}));
  assert.throws(()=>p.encodeColor({target:"points",field:"value",fieldType:"temporal",scale:{type:"log"}}),/quantitative/);
  assert.deepEqual(fills(plot([-100,-10,-1],{type:"log"})),["#000000","#808080","#ffffff"]);
  assert.deepEqual(fills(plot([.1,1,10,100,1000],{type:"log",domain:[1,100],clamp:true})),["#000000","#000000","#808080","#ffffff","#ffffff"]);
});

test("direct color scales and position scales retain distinct range contracts",()=>{
  const p=chart().createScale({id:"c",type:"log",domain:[1,100],range});
  assert.equal(p.editScale({id:"c",base:2}).semanticSpec.scales[0].base,2);
  const numeric=chart().createScale({id:"x",type:"log",domain:[1,100],range:[0,300]});
  assert.equal(numeric.semanticSpec.scales[0].interpolate,undefined);
  assert.throws(()=>numeric.editScale({id:"x",interpolate:"lab"}),/interpolate/);
});

test("transformed colors support text, rect, aggregated bars, and independent stroke",()=>{
  const base=()=>chart().createCanvas({margin:100}).createData({values:data([1,10,100])});
  const color={field:"value",fieldType:"quantitative",scale:{type:"log",range}};
  const rect=base().createRectMark({id:"cells"}).encodeX({field:"x",fieldType:"ordinal"}).encodeY({field:"y",fieldType:"ordinal"}).encodeColor(color);
  assert.deepEqual(fills(rect,"cells"),fills(plot()));
  const text=base().createTextMark({id:"labels"}).encodeChannels({target:"labels",channels:{x:{field:"x"},y:{field:"y"},text:{field:"value"}}}).encodeColor(color);
  assert.deepEqual(fills(text,"labels"),fills(plot()));
  const bar=base().createBarPlot({id:"bars",x:{field:"x",fieldType:"ordinal"},y:"value",color,guides:false});
  assert.deepEqual(fills(bar,"bars"),fills(plot()));
  const stroke=base().createScatterPlot({id:"points",x:"x",y:"y",guides:false}).encodeStroke(color).createLegend({channels:["stroke"]});
  assert.deepEqual(stroke.graphicSpec.objects.points.items.map(i=>i.properties.stroke),fills(plot()));
  assert.ok(stroke.graphicSpec.objects.strokeGradientStrips.items.length>0);
});

test("shared facet legends retain transformed labels and child colors",()=>{
  const p=plot([1,10,100,1000],{type:"log"},false).facet({field:"group",guides:{legend:"shared"}});
  const svg=renderToSVG(p);
  assert.match(svg,/>10<\/text>/);
  assert.match(svg,/>100<\/text>/);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
});
