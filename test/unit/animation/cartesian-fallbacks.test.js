import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { planTransition } from "../../../src/animation/planner.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectCartesianAnimationState } from "../../../src/materialization/animation/cartesian.js";
import { prepareCartesianTrack } from "../../../src/animation/cartesianTracks.js";
import { prepareCartesianInterpolation, resolveCartesianAnimationGeometry } from "../../../src/grammar/animation/cartesianState.js";
const values=[{id:"a",x:1,y:2,c:"A",g:"u"},{id:"b",x:2,y:4,c:"B",g:"v"}];
const base=()=>chart().createCanvas({width:300,height:200}).createData({id:"d",values,keyField:"id"});
const line=()=>base().createLineMark({id:"m"}).encodeX({field:"x"}).encodeY({field:"y"});
const reasons=p=>projectCartesianAnimationState(p,projectAnimationEndpoint(p)).map(state=>state.reason);
const plan=(from,to)=>planTransition({from,to,options:{durationMs:100}});

test("native unsupported Cartesian state remains explicit instead of inferring positions from pixels",()=>{
  const source=line();
  assert.ok(reasons(new ChartProgram({graphicSpec:source.graphicSpec})).includes("semantic-unavailable"));
  assert.ok(reasons(source.editSemantic({property:"layer[m].encoding.x",remove:true})).includes("incomplete-position"));
  for(const type of ["rule","rect","bar"]) {
    const action={rule:"createRuleMark",rect:"createRectMark",bar:"createBarMark"}[type];
    let p=base()[action]({id:"m"});
    if(type==="bar") p=p.encodeX({field:"c",fieldType:"nominal"}).encodeY({field:"y"});
    else if(type==="rect") p=p.encodeXRange({lower:"x",upper:"y",fieldType:"quantitative"});
    else p=p.encodeX({field:"x",fieldType:"quantitative"});
    p=p.editSemantic({property:"layer[m].encoding.x",remove:true}).editSemantic({property:"layer[m].encoding.y",remove:true});
    assert.ok(reasons(p).includes("incomplete-position"),type);
  }
  const polar=base().createLineMark({id:"m"}).encodeTheta({field:"x"}).encodeR({field:"y"});
  assert.ok(reasons(polar).includes("coordinate-family"));
  const offset=base().createRuleMark({id:"m"}).encodeX({field:"c",fieldType:"nominal"}).encodeXOffset({field:"g"});
  assert.ok(reasons(offset).some(reason=>reason===undefined));
  const conditional=source.createParameter({id:"enabled",value:true}).encodeX({target:"m",conditions:[{when:{version:2,registry:"standard@1",root:{type:"parameter",id:"enabled"}},value:{field:"x"}}],otherwise:{field:"y"}});
  assert.ok(reasons(conditional).some(reason=>reason===undefined));
  const density=base().createDensityPlot({id:"density",field:"y",bandwidth:1,extent:[0,5],steps:5,guides:false});
  assert.ok(reasons(density).some(reason=>reason===undefined));
  const graph=structuredClone(source.graphicSpec);graph.objects.m.items[0].identity.role="foreign";
  assert.ok(reasons(source._clone({graphicSpec:graph})).includes("primitive-role"));
});

test("native Cartesian lineage must retain the exact final item membership",()=>{
  const source=line(),endpoint=projectAnimationEndpoint(source), index=endpoint.identities.findIndex(Boolean);
  const wrong=structuredClone(endpoint);wrong.identities[index].lineage.rowKeys=[];
  assert.throws(()=>projectCartesianAnimationState(source,wrong),/exact final item/);
  const absent=structuredClone(endpoint),key=JSON.parse(absent.identities[index].key);key[3][1]='["array",["absent"]]';
  absent.identities[index].key=JSON.stringify(key);
  assert.throws(()=>projectCartesianAnimationState(source,absent),/exact final item/);
});

test("Cartesian tracks fade on incompatible appearance, primitive, topology and clipping",()=>{
  const source=line(),changed=source.editLineMark({stroke:"red"});
  assert.equal(plan(source,changed).tracks[0].kind,"semantic-cartesian");
  assert.equal(plan(source,changed).tracks[0].appearance.entries[0].key,"stroke");
  const endpoint=projectAnimationEndpoint(source),state=projectCartesianAnimationState(source,endpoint),index=endpoint.identities.findIndex(Boolean);
  const match={sourceIndex:index,targetIndex:index,key:"item",role:"body"};
  for(const [reason,mutate] of [
    ["primitive-kind",node=>{node.type="rect";}],
    ["topology",node=>{node.topology="different";}],
    ["clip-topology",node=>{node.clips.push([0,0,50,50]);}],
    ["appearance",node=>{node.properties.stroke={type:"pattern"};}]
  ]) {
    const to=structuredClone(endpoint);mutate(to.scene.nodes[index]);
    assert.equal(prepareCartesianTrack(match,endpoint,to,state[index],state[index]).reason,reason);
  }
  assert.equal(prepareCartesianTrack(match,endpoint,endpoint,{reason:"unsupported-family"},{reason:"unsupported-family"}),undefined);
});

test("raw ranged and centered bars retain pixel width and explicit temporal interval width",()=>{
  const ranged=base().createBarMark({id:"m"}).encodeX({field:"c",fieldType:"nominal"}).encodeYRange({lower:"x",upper:"y"});
  const centered=base().createBarMark({id:"m",orientation:"vertical"}).encodeX({field:"x"}).encodeY({field:"y"}).encodeBarWidth({pixels:10});
  const interval=chart().createCanvas().createData({id:"d",values:[{id:"a",date:"2026-01-01",v:2},{id:"b",date:"2026-02-01",v:4}],keyField:"id"})
    .createBarMark({id:"m"}).encodeX({field:"date",fieldType:"temporal",scale:{domain:[Date.UTC(2026,0,1),Date.UTC(2026,2,1)],nice:false}}).encodeY({field:"v",aggregate:"sum"}).encodeBarWidth({interval:{unit:"month",insetStart:2,insetEnd:2}});
  for(const from of [ranged,centered,interval]) {
    const p=plan(from,from.editCanvas({width:500}));assert.ok(p.tracks.every(track=>track.kind==="semantic-cartesian"));
  }
  const point=v=>({value:v,scale:{type:"linear",domain:[0,10],range:[0,100]}});
  const state={kind:"line",policy:{curve:"linear"},points:[{x:point(1),y:point(2)}],grid:[["a"]]};
  assert.deepEqual(resolveCartesianAnimationGeometry(state).properties.commands,[{op:"M",x:10,y:20}]);
  assert.equal(prepareCartesianInterpolation(state,{reason:"edited-position"}).reason,"edited-position");
});

test("unsupported stored scale state rejects semantic interpolation and weighted cells retain all member keys",()=>{
  const histogram=chart().createCanvas().createData({id:"d",keyField:"id",values:[{id:"a",x:1,w:2},{id:"b",x:1.5,w:3},{id:"c",x:3,w:1}]})
    .createHistogram({id:"m",field:"x",weight:{field:"w",kind:"frequency"},binBoundaries:[0,2,4],guides:false});
  const p=plan(histogram,histogram.editCanvas({width:600}));
  assert.ok(p.tracks.every(track=>track.kind==="semantic-cartesian"));
  assert.equal(p.tracks[0].cartesian.from.points[1].y.value,5);
  const rule=base().createRuleMark({id:"m"}).encodeX({field:"x",fieldType:"quantitative"});
  const endpoint=projectAnimationEndpoint(rule), resolvedScales={...rule.resolvedScales,x:{...rule.resolvedScales.x,type:"future"}};
  assert.ok(projectCartesianAnimationState(rule._clone({resolvedScales}),endpoint).some(state=>state.reason==="scale-type"));
});

test("Cartesian source and repeated mapping work are bounded before preparing row geometry",()=>{
  const source=line(), endpoint=projectAnimationEndpoint(source);
  const dataset=source.semanticSpec.datasets[0];
  const huge=source._clone({semanticSpec:{...source.semanticSpec,datasets:[{...dataset,values:Array(10001).fill(dataset.values[0])}]}});
  assert.throws(()=>projectCartesianAnimationState(huge,endpoint),/10000/);
  const costly=source._clone({resolvedScales:{...source.resolvedScales,x:{...source.resolvedScales.x,domain:['x'.repeat(3_000_000)]}}});
  assert.throws(()=>projectCartesianAnimationState(costly,endpoint),/mapping work/);
});
