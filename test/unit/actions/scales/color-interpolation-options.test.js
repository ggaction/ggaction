import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {chart as basic} from "../../../../src/basic.js";
import {serializeProgram,deserializeProgram} from "../../../../src/persistence.js";
import {decodeValue,encodeValue} from "../../../../src/persistence/codec.js";
const rows=Object.freeze([{x:1,y:2,v:8},{x:2,y:3,v:17.5},{x:3,y:4,v:24.8}].map(Object.freeze));
const scale={domain:[8,24.8],range:["yellow","red"]};
function source(factory=chart) {return factory().createCanvas({width:600,height:500,margin:{left:70,top:70,right:180,bottom:70}}).createData({values:rows}).createScatterPlot({x:"x",y:"y",guides:false});}
const fills=p=>p.graphicSpec.objects.scatterPlot.items.map(item=>item.properties.fill);
test("new color options share immutable Full and Basic encoding and persistence",()=>{
 for(const factory of [chart,basic])for(const options of [{interpolate:"hcl",whitePoint:"d50"},{interpolate:"cubehelix",gamma:2.2},{type:"pow",exponent:3}]) {
  const base=source(factory),before=serializeProgram(base),input=JSON.stringify(options);
  const p=base.encodeColor({field:"v",fieldType:"quantitative",scale:{...scale,...options}});
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  assert.equal(serializeProgram(base),before);assert.equal(JSON.stringify(options),input);
  assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
  assert.equal(p.graphicSpec.objects.scatterPlot.items.length,3);
 }
});
test("color edits reset explicitly, clear incompatible inherited interpolation parameters and retain compatible ones",()=>{
 const p=source().encodeColor({field:"v",fieldType:"quantitative",scale:{...scale,interpolate:"hcl",whitePoint:"d50"}});
 const baseline=serializeProgram(p);
 assert.deepEqual(fills(p),["#ffff00","#ff9300","#ff0000"]);
 assert.equal(p.editColorScale({whitePoint:"auto"}).semanticSpec.scales.at(-1).whitePoint,undefined);
 const power=p.editColorScale({type:"pow",exponent:3});
 assert.equal(power.semanticSpec.scales.at(-1).whitePoint,"d50");
 assert.equal(power.resolvedScales.color.exponent,3);
 assert.equal(power.editColorScale({type:"sequential"}).semanticSpec.scales.at(-1).exponent,undefined);
 const gamma=p.editColorScale({interpolate:"cubehelix",gamma:2.2});
 assert.equal(gamma.semanticSpec.scales.at(-1).whitePoint,undefined);
 assert.equal(gamma.editColorScale({gamma:"auto"}).semanticSpec.scales.at(-1).gamma,undefined);
 assert.equal(gamma.editColorScale({interpolate:"rgb"}).semanticSpec.scales.at(-1).gamma,undefined);
 for(const args of [{interpolate:"rgb",whitePoint:"d50"},{interpolate:"hcl",gamma:1},{gamma:0},{whitePoint:"d55"},{type:"pow",exponent:-1}])assert.throws(()=>p.editColorScale(args));
 assert.equal(serializeProgram(p),baseline);
});
test("new color paints agree across point, stroke, gradient and original-value sampled legends",()=>{
 for(const options of [{interpolate:"hcl",whitePoint:"d50"},{interpolate:"cubehelix",gamma:2.2},{type:"pow",exponent:3}]) {
  const p=source().encodeColor({field:"v",fieldType:"quantitative",scale:{...scale,...options}})
   .encodeStroke({field:"v",fieldType:"quantitative",scale:{...scale,...options}});
  const expected=fills(p);
  assert.deepEqual(p.graphicSpec.objects.scatterPlot.items.map(i=>i.properties.stroke),expected);
  const symbols=p.createLegend({title:false,representation:"symbols",values:[8,17.5,24.8]});
  assert.deepEqual(symbols.graphicSpec.objects.colorGradientSymbols.items.map(i=>i.properties.fill),expected);
  const gradient=p.createLegend({title:false});
  assert.equal(gradient.graphicSpec.objects.colorGradientStrips.items.length,60);
  const resized=gradient.editCanvas({width:650});
  assert.deepEqual(resized.graphicSpec.objects.colorGradientStrips.items.map(i=>i.properties.fill),gradient.graphicSpec.objects.colorGradientStrips.items.map(i=>i.properties.fill));
  assert.deepEqual(deserializeProgram(serializeProgram(symbols)).graphicSpec,symbols.graphicSpec);
 }
});
test("creation and re-encoding reject unsupported interpolation controls atomically",()=>{
 const p=source(),before=serializeProgram(p);
 for(const options of [{interpolate:"lab",whitePoint:"auto"},{interpolate:"cubehelix",gamma:"auto"},{interpolate:"rgb",gamma:1},{interpolate:"rgb",whitePoint:"d65"},{type:"sqrt",exponent:.5},{type:"pow",exponent:3,midpoint:16}]) {
  assert.throws(()=>p.encodeColor({field:"v",fieldType:"quantitative",scale:{...scale,...options}}));
  assert.equal(serializeProgram(p),before);
 }
});
test("saved interpolation options retain their closed types and reject tampered conventions",()=>{
 const p=source().encodeColor({field:"v",fieldType:"quantitative",scale:{...scale,interpolate:"lab",whitePoint:"d50"}});
 for(const mutate of [s=>{s.semanticSpec.scales.at(-1).whitePoint="d55";},s=>{s.resolvedScales.color.gamma=-1;},s=>{s.semanticSpec.scales.at(-1).interpolate="rgb";}]) {
  const envelope=JSON.parse(serializeProgram(p));const state=decodeValue(envelope.payload);mutate(state);envelope.payload=encodeValue(state);
  assert.throws(()=>deserializeProgram(JSON.stringify(envelope)));
 }
 const reset=p.encodeColor({field:"v",fieldType:"quantitative",scale:{interpolate:"rgb"}});
 assert.equal(reset.semanticSpec.scales.at(-1).whitePoint,undefined);
});
test("focused stroke editors retain the complete continuous color control surface",()=>{
 const p=source().encodeStroke({field:"v",fieldType:"quantitative",scale:{...scale,interpolate:"lab",whitePoint:"d50"}});
 const power=p.editStrokeScale({target:"scatterPlot",type:"pow",exponent:3});
 assert.equal(power.resolvedScales.stroke.type,"pow");assert.equal(power.resolvedScales.stroke.exponent,3);
 assert.equal(power.resolvedScales.stroke.whitePoint,"d50");
 const gamma=power.editStrokeScale({target:"scatterPlot",interpolate:"cubehelix",gamma:2.2});
 assert.equal(gamma.resolvedScales.stroke.whitePoint,undefined);
 assert.equal(gamma.resolvedScales.stroke.gamma,2.2);
 assert.equal(gamma.editStrokeScale({target:"scatterPlot",gamma:"auto"}).resolvedScales.stroke.gamma,undefined);
});

test("continuous color controls survive source revision and shared facet replay",()=>{
 for(const options of [{interpolate:"hcl",whitePoint:"d50"},{interpolate:"cubehelix",gamma:2.2},{type:"pow",exponent:3}]) {
  const p=source().encodeColor({field:"v",fieldType:"quantitative",scale:{...scale,...options}})
   .createLegend({representation:"symbols",values:[8,17.5,24.8],title:false});
  const before=serializeProgram(p);
  const revised=p.reviseData({source:p.semanticSpec.datasets[0].id,id:"revised",values:[...rows].reverse()});
  assert.deepEqual(fills(revised),fills(p).toReversed());
  assert.deepEqual(revised.graphicSpec.objects.colorGradientSymbols,p.graphicSpec.objects.colorGradientSymbols);
  assert.equal(serializeProgram(p),before);
  const faceted=p.removeLegend({}).facet({field:"x",guides:{legend:"shared"}});
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec,faceted.graphicSpec);
  assert.deepEqual(faceted.semanticSpec.datasets[0].values,rows);
 }
});

