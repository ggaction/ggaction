import test from "node:test";import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { encodeValue, decodeValue } from "../../src/persistence/codec.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { createLinearNiceCount } from "../../examples/linear-nice-count/program.js";

function fixture(factory=chart,nice={count:10}){
  return factory().createCanvas({plot:{width:200,height:120},margin:{left:40,top:20,right:20,bottom:30}})
    .createData({values:[{x:0,y:0},{x:.5,y:54},{x:1,y:108}]})
    .createLinePlot({x:{field:"x",scale:{domain:[0,1]}},y:{field:"y",scale:{zero:true,nice}},guides:false});
}
test("Full and Basic facades retain the same immutable count policy and graphics",()=>{
  const full=fixture(),basic=fixture(basicChart);
  assert.deepEqual(full.graphicSpec,basic.graphicSpec);assert.deepEqual(full.resolvedScales.y.domain,[0,110]);
  const input={count:10},p=fixture(chart,input);input.count=20;
  assert.deepEqual(p.semanticSpec.scales.find(s=>s.id==="y").nice,{count:10});
  assert.deepEqual(p.resolvedScales.y.domain,[0,110]);
});
test("focused and generic editors rematerialize the same resolved owner",()=>{
  const before=fixture(chart,true),saved=JSON.stringify(before),focused=before.editYScale({nice:{count:10}}),generic=before.editScale({id:"y",nice:{count:10}});
  assert.deepEqual(focused.graphicSpec,fixture().graphicSpec);assert.deepEqual(generic.graphicSpec,focused.graphicSpec);
  assert.deepEqual(before.resolvedScales.y.domain,[0,120]);assert.equal(JSON.stringify(before),saved);
  assert.deepEqual(focused.editYScale({nice:false}).resolvedScales.y.domain,[0,108]);
  assert.deepEqual(focused.editYScale({nice:true}).resolvedScales.y.domain,[0,120]);
});
test("explicit descending domains keep precedence and auto restores count inference",()=>{
  const p=fixture().editYScale({domain:[200,-10]});assert.deepEqual(p.resolvedScales.y.domain,[200,-10]);
  assert.deepEqual(p.editYScale({domain:"auto"}).resolvedScales.y.domain,[0,110]);
  const reversed=fixture().editYScale({reverse:true});assert.deepEqual(reversed.resolvedScales.y.domain,[0,110]);
  assert.deepEqual(reversed.graphicSpec,fixture().editYScale({reverse:true}).graphicSpec);
});
test("independent facets apply the count rule to every actual child domain",()=>{
  const maxima=[133,108,171,107,139,116],values=maxima.flatMap((maximum,i)=>[{group:String(i),x:0,y:0},{group:String(i),x:1,y:maximum}]);
  const p=chart().createCanvas({plot:{width:100,height:80},margin:30}).createData({values})
    .createLinePlot({x:"x",y:{field:"y",scale:{zero:true,nice:{count:10}}},guides:false})
    .facet({field:"group",scales:{y:"independent"}});
  const actual=p.compositionSpec.children.map(id=>p.children[id].resolvedScales.y.domain);
  assert.deepEqual(actual,[140,110,180,110,140,120].map(maximum=>[0,maximum]));
  assert.deepEqual(p.semanticSpec.datasets[0].values,values);
  assert.deepEqual(p.editFacetScales({y:"shared"}).compositionSpec.children.map(id=>
    p.editFacetScales({y:"shared"}).children[id].resolvedScales.y.domain),maxima.map(()=>[0,180]));
});
test("data revisions and filters refresh domains without changing original rows or old programs",()=>{
  const p=fixture(),old=JSON.stringify(p);
  const revised=p.reviseData({source:"data",id:"newData",values:[{x:0,y:0},{x:1,y:133}]});
  assert.deepEqual(revised.resolvedScales.y.domain,[0,140]);assert.equal(JSON.stringify(p),old);
  const points=chart().createCanvas().createData({values:[{x:0,y:0},{x:.5,y:54},{x:1,y:108}]})
    .createScatterPlot({x:"x",y:{field:"y",scale:{zero:true,nice:{count:10}}},guides:false});
  const filtered=points.filterMarks({target:"scatterPlot",field:"x",op:"lte",value:.5});
  assert.deepEqual(filtered.resolvedScales.y.domain,[0,55]);
  assert.deepEqual(filtered.semanticSpec.datasets[0].values,points.semanticSpec.datasets[0].values);
});
test("shared scale edits and filtering refresh all consumers",()=>{
  const p=fixture().createData({id:"high",values:[{x:0,y:0},{x:1,y:133}]})
    .createScatterPlot({id:"other",data:"high",x:"x",y:"y",guides:false});
  assert.deepEqual(p.resolvedScales.y.domain,[0,140]);
  const q=p.filterMarks({target:"other",field:"y",op:"eq",value:0});
  assert.deepEqual(q.resolvedScales.y.domain,[0,110]);
  assert.deepEqual(q.graphicSpec.objects.linePlot,fixture().graphicSpec.objects.linePlot);
});
test("persistence preserves canonical policy, pixels and editable inference",()=>{
  const p=createLinearNiceCount(),stored=serializeProgram(p),restored=deserializeProgram(stored);
  assert.equal(serializeProgram(restored),stored);assert.deepEqual(restored.graphicSpec,p.graphicSpec);
  assert.equal(renderToSVG(restored),renderToSVG(p));assert.deepEqual(restored.editYScale({nice:true}).resolvedScales.y.domain,[0,120]);
});
for(const nice of[{count:0},{count:1.5},{count:10,extra:true},null])test("invalid count edit is atomic "+JSON.stringify(nice),()=>{
  const p=fixture(),snapshot=serializeProgram(p);assert.throws(()=>p.editYScale({nice}));assert.equal(serializeProgram(p),snapshot);
});
test("time/transformed/type edits cannot retain an incompatible count object",()=>{
  const p=fixture(),snapshot=serializeProgram(p);
  for(const type of["time","sqrt","pow","log","symlog"]){
    assert.throws(()=>p.editYScale({type,nice:{count:10}}));assert.equal(serializeProgram(p),snapshot);
  }
  const changed=p.editYScale({type:"sqrt"});assert.equal(changed.semanticSpec.scales.find(s=>s.id==="y").nice,undefined);
});
test("count policy does not broaden color or size scale roles",()=>{
  const p=chart().createCanvas().createData({values:[{x:0,y:0},{x:1,y:108}]}).createScatterPlot({x:"x",y:"y",guides:false});
  assert.throws(()=>p.encodeColor({field:"y",fieldType:"quantitative",scale:{nice:{count:10}}}));
  assert.throws(()=>p.encodeSize({field:"y",scale:{nice:{count:10}}}));
});
test("corrupt semantic count objects are rejected on restore",()=>{
  const stored=serializeProgram(fixture());for(const bad of[{count:0},{count:10,extra:true},{count:"10"}]){
    const envelope=JSON.parse(stored),state=decodeValue(envelope.payload);state.semanticSpec.scales.find(s=>s.id==="y").nice=bad;envelope.payload=encodeValue(state);
    assert.throws(()=>deserializeProgram(JSON.stringify(envelope)));
  }
});
