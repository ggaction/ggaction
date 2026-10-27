import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from "node:assert/strict";
import test from "node:test";
import {chart, render} from "../../../../src/index.js";
import {ChartProgram} from "../../../../src/extension.js";
import {chart as basic} from "../../../../src/basic.js";
import {serializeProgram, deserializeProgram} from "../../../../src/persistence.js";
import {renderToSVG} from "../../../../src/renderers/svg.js";
import {decodeValue} from "../../../../src/persistence/codec.js";
import {createCanvas} from "@napi-rs/canvas";

const rows = Object.freeze([
  {x:0,y:1,g:"a",size:1}, {x:1,y:2,g:"a",size:1},
  {x:0,y:3,g:"b",size:4}, {x:1,y:4,g:"b",size:4}
].map(Object.freeze));
const source = factory => factory()
  .createCanvas({width:480,height:300,margin:{left:40,right:140,top:30,bottom:50}})
  .createData({values:rows});
const points = factory => source(factory).createScatterPlot({x:"x",y:"y",guides:false});
const lines = factory => source(factory).createLinePlot({x:"x",y:"y",guides:false});
const patterns = (p,id="linePlot") => p.graphicSpec.objects[id].items.map(i=>i.properties.strokeDash);
function equivalent(actual, expected) {
  assertEquivalentMeaning(actual.semanticSpec,expected.semanticSpec);
  assertEquivalentMeaning(actual.graphicSpec,expected.graphicSpec);
  assert.deepEqual(actual.guideConfigs,expected.guideConfigs);
  assert.equal(renderToSVG(actual),renderToSVG(expected));
}
function atomic(p, apply, match) {
  const before=serializeProgram(p);assert.throws(()=>apply(p),match);assert.equal(serializeProgram(p),before);
}

for (const withLegend of [false,true]) {
  test(`Basic dash reassignment matches Full with legend=${withLegend}`,()=>{
    const build=factory=>{
      let p=lines(factory).encodeStrokeDash({field:"g"});
      if(withLegend)p=p.createLegend();
      return p.encodeStrokeDash({field:"g",scale:{range:["dotted"]}});
    };
    const p=build(basic);equivalent(p,build(chart));assert.deepEqual(patterns(p),[[1,3],[1,3]]);
    assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
    for(const method of ["editScale","editStrokeDashScale","editLegend","removeLegend"])assert.equal(typeof p[method],"undefined",method);
  });
}

test("position reassignment refreshes default axes and maps original point coordinates",()=>{
  const build=factory=>source(factory).createScatterPlot({x:"x",y:"y"})
    .encodeX({field:"x",scale:{domain:[0,10]}}).encodeY({field:"y",scale:{domain:[0,10]}});
  const p=build(basic);equivalent(p,build(chart));
  assert.deepEqual(p.graphicSpec.objects.scatterPlot.items.map(i=>i.properties.x),[40,70,40,70]);
  assert.deepEqual(p.resolvedScales.x.domain,[0,10]);
  assert.ok(p.graphicSpec.objects.xAxisLabels.items.length>0);
});

for(const [name,assign,patch]of[
  ["color",{field:"g"},{field:"g",scale:{range:["red","blue"]}}],
  ["size",{field:"size"},{field:"size",scale:{domain:[1,4],range:[25,100]}}],
  ["shape",{field:"g"},{field:"g",scale:{range:["diamond","square"]}}]
])test(`Basic ${name} reassignment reuses the Full mapping policy`,()=>{
  const action="encode"+name[0].toUpperCase()+name.slice(1);
  const build=factory=>points(factory)[action](assign)[action](patch);
  const p=build(basic);equivalent(p,build(chart));
  equivalent(deserializeProgram(serializeProgram(p)),p);
  assert.deepEqual(p.semanticSpec.datasets[0].values,rows);
});

test("all consumers of a shared dash scale and its original legend update atomically",()=>{
  const p=source(basic).createLinePlot({id:"first",x:"x",y:"y",guides:false})
    .encodeStrokeDash({field:"g",scale:{id:"dash"}}).createLegend()
    .createLineMark({id:"second"}).encodeX({field:"x"}).encodeY({field:"y"})
    .encodeStrokeDash({field:"g",scale:{id:"dash"}});
  const before=serializeProgram(p),options=Object.freeze({range:Object.freeze(["dashdot"])});
  const changed=p.encodeStrokeDash({field:"g",scale:options});
  assert.equal(serializeProgram(p),before);
  for(const id of ["first","second"])assert.deepEqual(patterns(changed,id),[[6,3,1,3],[6,3,1,3]]);
  assert.deepEqual(changed.guideConfigs.legend.series.domain,["a","b"]);
  assert.deepEqual(changed.graphicSpec.objects.seriesLegendSymbols.items.map(i=>i.properties.strokeDash),[[6,3,1,3],[6,3,1,3]]);
  atomic(p,q=>q.encodeStrokeDash({field:"g",scale:{domain:["a"]}}),/outside/);
  atomic(p,q=>q.encodeStrokeDash({field:"g",scale:{range:[[0,0]]}}),/dash|pattern/i);
});

test("incomplete Basic lines retain scale reassignment until positions are complete",()=>{
  const build=factory=>source(factory).createLineMark({id:"paths"})
    .encodeStrokeDash({field:"g"})
    .encodeStrokeDash({field:"g",scale:{domain:["a"],range:["dotted"],unknown:[]}})
    .encodeY({field:"y"}).encodeX({field:"x"});
  const p=build(basic);equivalent(p,build(chart));assert.deepEqual(patterns(p,"paths"),[[1,3],[]]);
});

test("same-type fallback updates remain strict for raw categories and do not extend the legend",()=>{
  const p=lines(basic).encodeStrokeDash({field:"g",scale:{range:["dotted","dashdot"]}}).createLegend();
  const changed=p.encodeStrokeDash({field:"g",scale:{domain:["a"],unknown:[]}});
  assert.deepEqual(patterns(changed),[[1,3],[]]);
  assert.deepEqual(changed.guideConfigs.legend.series.domain,["a"]);
  assert.deepEqual(changed.semanticSpec.datasets[0].values,rows);
  atomic(changed,q=>q.encodeStrokeDash({field:"g",scale:{unknown:[0,0]}}),/dash|pattern/i);
});

test("quantitative color type transitions keep the Full boundary and Basic new-ID alternative",()=>{
  const build=factory=>points(factory).encodeColor({field:"size",fieldType:"quantitative",scale:{domain:[1,4],range:["white","orange"]}}).createLegend();
  const p=build(basic);atomic(p,q=>q.encodeColor({field:"size",fieldType:"quantitative",scale:{type:"sqrt"}}),/Full ChartProgram; use a new scale id in Basic/);
  const named=p.encodeColor({field:"size",fieldType:"quantitative",scale:{id:"rootColor",type:"sqrt",domain:[1,4],range:["white","orange"]}});
  assert.equal(named.resolvedScales.rootColor.type,"sqrt");
  const full=build(chart).encodeColor({field:"size",fieldType:"quantitative",scale:{type:"sqrt"}});
  assert.equal(full.resolvedScales.color.type,"sqrt");
  assert.equal(typeof named.editScale,"undefined");
});

test("Full color-family transitions retain existing categorical legend replacement",()=>{
  const p=points(chart).encodeColor({field:"g"}).createLegend();
  const changed=p.encodeColor({field:"size",fieldType:"quantitative",scale:{type:"sequential",domain:[1,4],range:["white","orange"]}});
  assert.equal(changed.resolvedScales.color.type,"sequential");
  assert.ok(changed.guideConfigs.legend.gradient);
  assert.equal(changed.guideConfigs.legend.color,undefined);
});

test("Full subclass overrides still receive bound encoding scale edits",()=>{
  let calls=0;
  class Customized extends ChartProgram {
    editScale(args) {calls++;return super.editScale(args);}
  }
  const p=lines(()=>new Customized()).encodeStrokeDash({field:"g"});
  const changed=p.encodeStrokeDash({field:"g",scale:{range:["dotted"]}});
  assert.equal(calls,1);assert.ok(changed instanceof Customized);assert.deepEqual(patterns(changed),[[1,3],[1,3]]);
});

test("Basic serialization retains reassignment and the existing editable Full restoration contract",()=>{
  const build=factory=>lines(factory).encodeStrokeDash({field:"g"}).createLegend()
    .encodeStrokeDash({field:"g",scale:{range:["dotted"]}});
  const p=build(basic),restored=deserializeProgram(serializeProgram(p));equivalent(restored,p);
  assert.equal(typeof p.editScale,"undefined");assert.equal(typeof restored.editScale,"function");
  const pixels=program=>{const c=createCanvas(480,300),ctx=c.getContext("2d");render(program,ctx);return ctx.getImageData(0,0,480,300).data;};
  assert.deepEqual(pixels(p),pixels(build(chart)));
});


test("Basic internal edit ownership does not permit unregistered trace operations",()=>{
  const p=lines(basic).encodeStrokeDash({field:"g"}).encodeStrokeDash({field:"g",scale:{range:["dotted"]}});
  assert.equal(typeof p.editScale,"undefined");
  const restored=deserializeProgram(serializeProgram(p));assert.equal(typeof p.editScale,"undefined");assert.equal(typeof restored.editScale,"function");
  const envelope=JSON.parse(serializeProgram(p));
  const state=decodeValue(envelope.payload);
  state.trace.children[0].op="unregisteredScaleOwner";
  const invalid=new p.constructor(state);
  assert.throws(()=>serializeProgram(invalid),/Cannot persist unregistered action "unregisteredScaleOwner"/);
  assert.equal(typeof p.editScale,"undefined");
});
