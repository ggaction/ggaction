import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { pathFillContains } from "../../../src/grammar/pathGeometry.js";
import { projectGeoAnimationGroup } from "../../../src/materialization/animation/geo.js";
import { normalizeAnimationGeoGroup, prepareGeoInterpolation, sampleGeoInterpolation, resolveAnimationGeoGeometry, ANIMATION_GEO_VERSION } from "../../../src/grammar/animation/geoState.js";
const feature = (id,geometry) => ({type:"Feature",id,properties:{id},geometry});
const point = (id,coordinates) => feature(id,{type:"Point",coordinates});
const collection = features => ({type:"FeatureCollection",features});
function make(features,parameters={},mode="point",options={}) {
  let program=chart().createCanvas({width:400,height:300,margin:0})
    .createGeometryData({id:"world",format:"geojson",values:collection(features),coordinateKind:parameters.type==="identity"?"planar":"geographic",featureKey:["properties","id"]})
    .createProjection({id:"projection",type:"equirectangular",scalePx:100,translatePx:[200,150],...parameters}).createCoordinate({type:"geo"});
  const action={point:"createGeoPointMark",shape:"createGeoShapeMark",line:"createGeoLineMark"}[mode];
  return program[action]({id:"map",...options});
}
const group = program => projectGeoAnimationGroup(program,program.semanticSpec.layers.find(layer=>layer.id==="map"));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
const props=program=>program.graphicSpec.objects.map.items.map(node=>({type:node.type,properties:node.properties}));
function nativeEqual(prepared,program) {
  const actual=resolveAnimationGeoGeometry(prepared).features.flatMap(feature=>feature.parts),expected=props(program);
  assert.equal(actual.length,expected.length);
  for(const [index,part]of actual.entries()) {
    assert.equal(part.type,expected[index].type);
    for(const [key,value]of Object.entries(part.properties))assert.deepEqual(value,expected[index].properties[key]);
  }
}

test("Geo prepared values reproduce native endpoints and literal log-scale quaternion movement",()=>{
  const from=make([point("city",[0,0])]),to=from.editProjection({scalePx:400,translatePx:[240,170],rotateDeg:[30,0,0]}).editGeoPointMark({radiusPx:9});
  const before=serializeProgram(from),plan=prepareGeoInterpolation(group(from),group(to));
  assert.equal(plan.kind,"geo");assert.equal(plan.version,ANIMATION_GEO_VERSION);
  nativeEqual(sampleGeoInterpolation(plan,0).group,from);nativeEqual(sampleGeoInterpolation(plan,1).group,to);
  const current=sampleGeoInterpolation(plan,.5),geometry=resolveAnimationGeoGeometry(current.group).features[0].parts[0];
  close(current.group.parameters.scalePx,200);close(current.group.parameters.rotateDeg[0],15);
  close(geometry.properties.x,220+200*Math.PI/12);close(geometry.properties.y,160);assert.equal(geometry.properties.radius,6);
  const nativeMiddle=from.editProjection(current.group.parameters).editGeoPointMark({radiusPx:6});nativeEqual(current.group,nativeMiddle);
  assert.equal(serializeProgram(from),before);assert.ok(Object.isFrozen(current.group.features[0].geometry.coordinates));
});

test("current camera values rebase without previous plans and preserve stationary geometry",()=>{
  const from=group(make([point("city",[10,20])],{scalePx:150,rotateDeg:[27,-43,17]}));
  const to=structuredClone(from);to.parameters.scalePx=900;to.parameters.rotateDeg=[-50,10,12];
  const plan=prepareGeoInterpolation(from,to),sample=sampleGeoInterpolation(plan,.37);
  const expected=new Map([0,.5,1].map(time=>[time,sampleGeoInterpolation(plan,time)]));
  for(const time of [1,.5,0,.5])assert.deepEqual(sampleGeoInterpolation(plan,time),expected.get(time));
  const stationary=prepareGeoInterpolation(from,from);for(const t of [.01,.5,.99])assert.deepEqual(sampleGeoInterpolation(stationary,t).group,from);
  const rebased=prepareGeoInterpolation(sample.group,from);assert.deepEqual(sampleGeoInterpolation(rebased,0).group,sample.group);
  const restored=prepareGeoInterpolation(JSON.parse(JSON.stringify(sample.group)),JSON.parse(JSON.stringify(from)));
  assert.deepEqual(sampleGeoInterpolation(rebased,.5),sampleGeoInterpolation(restored,.5));
});

test("camera streaming reveals clipped features and changes seam parts using current projection",()=>{
  const from=make([point("front",[0,0]),point("back",[180,0])],{type:"orthographic"}),to=from.editProjection({rotateDeg:[120,0,0]});
  const a=group(from),b=group(to),plan=prepareGeoInterpolation(a,b);
  assert.equal(a.features.length,2);assert.equal(resolveAnimationGeoGeometry(a).features[1].parts.length,0);
  const current=sampleGeoInterpolation(plan,.9);nativeEqual(current.group,from.editProjection(current.group.parameters));
  assert.equal(resolveAnimationGeoGeometry(current.group).features[1].parts.length,1);
  const line=make([feature("seam",{type:"LineString",coordinates:[[170,0],[-170,0]]})],{},"line");
  const moved=line.editProjection({rotateDeg:[30,0,0]});const linePlan=prepareGeoInterpolation(group(line),group(moved));
  assert.equal(resolveAnimationGeoGeometry(linePlan.from).features[0].parts.length,2);
  const middle=sampleGeoInterpolation(linePlan,.5);nativeEqual(middle.group,line.editProjection(middle.group.parameters));
  assert.equal(resolveAnimationGeoGeometry(middle.group).features[0].parts.length,1);
});

test("polygon holes and spherical radius over ninety degrees retain native filled complement",()=>{
  const square=[[0,0],[100,0],[100,100],[0,100],[0,0]],hole=[[25,25],[25,75],[75,75],[75,25],[25,25]];
  const planar=make([feature("region",{type:"Polygon",coordinates:[square,hole]})],{type:"identity",scalePx:1,translatePx:[0,0]},"shape");
  const plan=prepareGeoInterpolation(group(planar),group(planar.editProjection({scalePx:4,translatePx:[20,40]})));
  const current=sampleGeoInterpolation(plan,.5),part=resolveAnimationGeoGeometry(current.group).features[0].parts[0];
  assert.equal(pathFillContains(part.properties.commands,{x:30,y:40},{fillRule:part.properties.fillRule}),true);
  assert.equal(pathFillContains(part.properties.commands,{x:110,y:120},{fillRule:part.properties.fillRule}),false);
  nativeEqual(current.group,planar.editProjection(current.group.parameters));
  const globe=make([point("disk",[0,0])],{type:"equirectangular"},"point",{radiusDeg:120});
  const diskPlan=prepareGeoInterpolation(group(globe),group(globe.editProjection({rotateDeg:[30,20,0],scalePx:200})));
  const disk=sampleGeoInterpolation(diskPlan,.5);nativeEqual(disk.group,globe.editProjection(disk.group.parameters));
});

test("source keys control reorder and unsupported geometry changes stay explicit",()=>{
  const from=group(make([point("a",[0,0]),point("b",[10,0])])),to=structuredClone(from);
  to.features.reverse();to.features[0].radiusPx=11;
  const plan=prepareGeoInterpolation(from,to),middle=sampleGeoInterpolation(plan,.5);
  assert.equal(middle.group.features[0].key,to.features[0].key);assert.equal(middle.group.features[0].radiusPx,7);
  const changed=structuredClone(to);changed.features[0].geometry.coordinates=[20,0];changed.features.push({...changed.features[0],key:"new"});
  const failures=prepareGeoInterpolation(from,changed);
  assert.deepEqual(failures.failures.map(f=>f.reason),["geo-feature-geometry","geo-feature-topology"]);
  const failedSample=sampleGeoInterpolation(failures,.5);
  assert.deepEqual(failedSample.failures,failures.failures);
  assert.deepEqual(failedSample.group.features[0],changed.features[0]);
  for(const [mutate,reason]of [
    [value=>value.key=JSON.stringify([[],"other"]),"geo-identity"],
    [value=>value.binding.interpolation="great-circle","geo-binding"],
    [value=>value.parameters.type="mercator","projection-type"],
    [value=>value.parameters.clipAngleDeg=80,"projection-parameters"]
  ]){const next=structuredClone(from);mutate(next);assert.equal(prepareGeoInterpolation(from,next).reason,reason);}
});

test("normalized state rejects getters extra fields stale shapes and invalid budgets before sampling",()=>{
  const original=group(make([point("city",[0,0])])),before=structuredClone(original);
  const invalid=[null,[],{}, {...original,extra:true},{...original,projection:{...original.projection,kind:"geometry"}},
    {...original,coordinateKind:"planar"},{...original,key:'[ [], "map" ]'},
    {...original,parameters:{type:"equirectangular"}},{...original,features:[original.features[0],original.features[0]]},
    {...original,features:[{...original.features[0],radiusPx:-1}]},
    {...original,features:[{...original.features[0],geometry:{type:"Point",coordinates:[0,91]}}]},
    {...original,features:[{...original.features[0],polygonWinding:undefined}]},
    {...original,features:[{...original.features[0],geometry:{type:"Point",coordinates:[0,0],extra:1}}]},
    {...original,features:Array(100001).fill(original.features[0])}];
  for(const input of invalid)assert.throws(()=>normalizeAnimationGeoGroup(input));
  let reads=0;const getter={...original};Object.defineProperty(getter,"features",{enumerable:true,get(){reads++;return [];}});
  assert.throws(()=>normalizeAnimationGeoGroup(getter),/accessors/);assert.equal(reads,0);
  const cycle={...original};cycle.features=cycle;assert.throws(()=>normalizeAnimationGeoGroup(cycle),/cycles/);
  const plan=prepareGeoInterpolation(original,original);
  for(const time of [-1,2,NaN,Infinity,undefined])assert.throws(()=>sampleGeoInterpolation(plan,time));
  assert.throws(()=>sampleGeoInterpolation({...plan,version:99},.5),/authentic/);
  assert.throws(()=>sampleGeoInterpolation(JSON.parse(JSON.stringify(plan)),.5),/authentic/);
  assert.deepEqual(original,before);
});

test("native adapter requires explicit exact owner and retains repeated namespace identity",()=>{
  const p=make([point("city",[0,0])]),layer=p.semanticSpec.layers[0];
  assert.throws(()=>projectGeoAnimationGroup(p,{...layer}),/exact/);
  const left=projectGeoAnimationGroup(p,layer,["pair-a"]),right=projectGeoAnimationGroup(p,layer,["pair-b"]);
  assert.notEqual(left.key,right.key);assert.deepEqual(left.features,right.features);
  const composite=hconcat({id:"pair",programs:[{id:"a",program:p},{id:"b",program:p}]});assert.equal(composite.compositionSpec.children.length,2);
  assert.equal(prepareGeoInterpolation(left,right).reason,"geo-identity");
});

test("generated graticules share source keys and the native stream after camera edits",()=>{
  const from=chart().createCanvas({width:400,height:300,margin:0}).createProjection({id:"projection",type:"equirectangular",scalePx:40,translatePx:[200,150]})
    .createCoordinate({type:"geo"}).createGraticule({id:"map",stepDeg:[90,45]});
  const to=from.editProjection({scalePx:80,rotateDeg:[10,5,0]}),plan=prepareGeoInterpolation(group(from),group(to)),middle=sampleGeoInterpolation(plan,.5);
  assert.equal(plan.from.logicalId,"graticule");nativeEqual(middle.group,from.editProjection(middle.group.parameters));
  const tampered=structuredClone(plan.from);tampered.logicalId="other";assert.throws(()=>normalizeAnimationGeoGroup(tampered),/graticule/);
});

test("null empty geometry and native mode or coordinate mismatch fail without silent repair",()=>{
  const base=group(make([point("city",[0,0])])),empty={...base,features:[]};
  assert.deepEqual(resolveAnimationGeoGeometry(empty).features,[]);
  const nulls={...base,features:[{...base.features[0],geometry:null}]};
  assert.equal(resolveAnimationGeoGeometry(nulls).features[0].parts.length,0);
  const incompatible={...base,features:[{...base.features[0],geometry:{type:"LineString",coordinates:[[0,0],[1,1]]}}]};
  assert.throws(()=>normalizeAnimationGeoGroup(incompatible),/incompatible/);
  const planar=group(make([point("city",[0,0])],{type:"identity"}));
  assert.throws(()=>normalizeAnimationGeoGroup({...planar,binding:{...planar.binding,radiusDeg:10}}),/spherical/);
  assert.throws(()=>normalizeAnimationGeoGroup({...planar,features:[{...planar.features[0],polygonWinding:"left-hand"}]}),/polygonWinding/);
  assert.throws(()=>projectGeoAnimationGroup(make([point("city",[0,0])]),{},[3]),/strings/);
});

test("great-circle route hints and authored winding pass through unchanged",()=>{
  const from=make([feature("route",{type:"LineString",coordinates:[[0,0],[180,0]]})],{},"line",{interpolation:"great-circle",routeHint:[90,30]});
  const to=from.editProjection({rotateDeg:[10,0,0]}),plan=prepareGeoInterpolation(group(from),group(to)),middle=sampleGeoInterpolation(plan,.5);
  assert.deepEqual(middle.group.binding.routeHint,[90,30]);nativeEqual(middle.group,from.editProjection(middle.group.parameters));
  const left={...plan.from,features:plan.from.features.map(f=>({...f,polygonWinding:"left-hand"}))};
  assert.equal(prepareGeoInterpolation(plan.from,left).failures[0].reason,"geo-feature-geometry");
});


test("native resolved size fields prepare radius from semantic mapping rather than endpoint pixels",()=>{
  const city=point("city",[10,20]);city.properties.n=4;
  const from=make([city]).encodeSize({field:"n",scale:{id:"size",domain:[1,4],range:[Math.PI,16*Math.PI]}});
  const prepared=group(from);assert.equal(prepared.features[0].radiusPx,4);nativeEqual(prepared,from);
  const edited=from.editGraphics({target:from.graphicSpec.objects.map.items[0].id,property:"radius",value:99});
  assert.equal(group(edited).features[0].radiusPx,4);
});

test("completed fit scale and translation are sampled without rerunning fit",()=>{
  const from=chart().createCanvas({width:400,height:300,margin:0})
    .createGeometryData({id:"world",format:"geojson",values:collection([point("a",[0,0]),point("b",[20,20])]),coordinateKind:"planar",featureKey:["properties","id"]})
    .createProjection({id:"projection",type:"identity",fit:{width:100,height:100,padding:0}}).createCoordinate({type:"geo"}).createGeoPointMark({id:"map"});
  const to=from.editProjection({fit:{width:200,height:200,padding:0}}),plan=prepareGeoInterpolation(group(from),group(to));
  assert.equal(Object.hasOwn(plan.from.parameters,"fit"),false);assert.equal(plan.from.parameters.scalePx,5);assert.equal(plan.to.parameters.scalePx,10);
  const current=sampleGeoInterpolation(plan,.5);close(current.group.parameters.scalePx,Math.sqrt(50));
  nativeEqual(current.group,from.editProjection(current.group.parameters));
});
