import assert from "node:assert/strict";
import test from "node:test";
import {chart} from "../../../../src/index.js";
import {chart as basic} from "../../../../src/basic.js";
import {serializeProgram, deserializeProgram} from "../../../../src/persistence.js";
import {decodeValue, encodeValue} from "../../../../src/persistence/codec.js";
import {mapSequentialColors} from "../../../../src/grammar/scales/color.js";
import {gammaColorVectors} from "../../../fixtures/nonpositive-color-gamma.js";

const vectors=gammaColorVectors.filter(v=>v.gamma<=0&&v.range[0]==="#75190b"&&v.range[1]==="#90f2a4");
const rows=Object.freeze(Array.from({length:9},(_,i)=>Object.freeze({x:i,y:i+1,v:i/8,group:i<5?"first":"second"})));
function source(factory=chart){return factory().createCanvas({width:600,height:500,margin:{left:70,top:70,right:180,bottom:70}}).createData({values:rows}).createScatterPlot({x:"x",y:"y",guides:false});}
const options=v=>({domain:[0,1],range:v.range,interpolate:v.interpolation,gamma:v.gamma});
const fills=p=>p.graphicSpec.objects.scatterPlot.items.map(i=>i.properties.fill);

for(const vector of vectors){
 test(`${vector.interpolation} gamma ${vector.gamma} preserves immutable Full and Basic color, legends and persistence`,()=>{
  for(const factory of [chart,basic]){const base=source(factory),before=serializeProgram(base),scale=options(vector),input=JSON.stringify(scale),p=base.encodeColor({field:"v",fieldType:"quantitative",scale});assert.deepEqual(fills(p),vector.colors);assert.equal(p.semanticSpec.scales.find(s=>s.id==="color").gamma,vector.gamma);assert.equal(p.resolvedScales.color.gamma,vector.gamma);assert.deepEqual(p.semanticSpec.datasets[0].values,rows);assert.equal(serializeProgram(base),before);assert.equal(JSON.stringify(scale),input);assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
   const symbols=p.createLegend({title:false,representation:"symbols",values:vector.positions});assert.deepEqual(symbols.graphicSpec.objects.colorGradientSymbols.items.map(i=>i.properties.fill),vector.colors);assert.deepEqual(deserializeProgram(serializeProgram(symbols)).graphicSpec,symbols.graphicSpec);
   const gradient=p.createLegend({title:false}),positions=Array.from({length:60},(_,i)=>1-(i+.5)/60),expected=mapSequentialColors(positions,[0,1],vector.range,{interpolation:vector.interpolation,gamma:vector.gamma});assert.deepEqual(gradient.graphicSpec.objects.colorGradientStrips.items.map(i=>i.properties.fill),expected);
  }
 });
 test(`${vector.interpolation} gamma ${vector.gamma} shares fill, stroke and focused/generic editing`,()=>{
  const base=source().encodeColor({field:"v",fieldType:"quantitative",scale:{...options(vector),gamma:1}}),before=serializeProgram(base),p=base.editColorScale({gamma:vector.gamma});assert.deepEqual(fills(p),vector.colors);assert.equal(serializeProgram(base),before);assert.deepEqual(base.editScale({id:"color",gamma:vector.gamma}).graphicSpec,p.graphicSpec);
  const stroke=p.encodeStroke({field:"v",fieldType:"quantitative",scale:options(vector)});assert.deepEqual(stroke.graphicSpec.objects.scatterPlot.items.map(i=>i.properties.stroke),vector.colors);const edited=stroke.editStrokeScale({target:"scatterPlot",gamma:1}).editStrokeScale({target:"scatterPlot",gamma:vector.gamma});assert.deepEqual(edited.graphicSpec,stroke.graphicSpec);
  const reset=p.editColorScale({gamma:"auto"});assert.equal(reset.semanticSpec.scales.find(s=>s.id==="color").gamma,undefined);assert.deepEqual(reset.graphicSpec,base.editColorScale({gamma:"auto"}).graphicSpec);assert.equal(p.editColorScale({interpolate:"rgb"}).semanticSpec.scales.find(s=>s.id==="color").gamma,undefined);
 });
}

test("zero and negative color controls survive source revision, Canvas changes and shared facets",()=>{
 for(const vector of vectors){const p=source().encodeColor({field:"v",fieldType:"quantitative",scale:options(vector)}).createLegend({representation:"symbols",values:vector.positions,title:false}),before=serializeProgram(p),revised=p.reviseData({source:"data",id:"reversed",values:[...rows].reverse()});assert.deepEqual(fills(revised),vector.colors.toReversed());assert.deepEqual(revised.graphicSpec.objects.colorGradientSymbols,p.graphicSpec.objects.colorGradientSymbols);assert.equal(serializeProgram(p),before);assert.deepEqual(fills(p.editCanvas({width:650})),vector.colors);const faceted=p.removeLegend({}).facet({field:"group",guides:{legend:"shared"}});assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec,faceted.graphicSpec);assert.deepEqual(faceted.semanticSpec.datasets[0].values,rows);}
});

test("nonpositive direct scale creation and edits retain numeric values without introducing new fields",()=>{
 for(const gamma of [0,-.1]){const p=chart().createScale({id:"tone",type:"sequential",domain:[0,1],range:["yellow","red"],interpolate:"cubehelix-long",gamma});assert.equal(p.semanticSpec.scales[0].gamma,gamma);assert.equal(p.editScale({id:"tone",gamma:"auto"}).semanticSpec.scales[0].gamma,undefined);assert.deepEqual(deserializeProgram(serializeProgram(p)).semanticSpec,p.semanticSpec);}
});

test("incompatible modes, invalid numeric values and nonzero overflow reject without changing programs",()=>{
 const p=source().encodeColor({field:"v",fieldType:"quantitative",scale:{domain:[0,1],range:["yellow","red"],interpolate:"cubehelix"}}),before=serializeProgram(p);
 for(const patch of [{gamma:Infinity},{gamma:-Infinity},{gamma:NaN},{gamma:"0"},{gamma:-2000},{gamma:-900},{interpolate:"rgb",gamma:0},{interpolate:"lab",gamma:-.1}]){assert.throws(()=>p.editColorScale(patch));assert.equal(serializeProgram(p),before);}
 for(const mutate of [s=>{s.semanticSpec.scales.find(v=>v.id==="color").gamma=Infinity;},s=>{s.resolvedScales.color.gamma="0";}]){const saved=JSON.parse(serializeProgram(p)),state=decodeValue(saved.payload);mutate(state);saved.payload=encodeValue(state);assert.throws(()=>deserializeProgram(JSON.stringify(saved)));}
});
