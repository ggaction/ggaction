import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../../src/index.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { prepareGeoInterpolation, sampleGeoInterpolation } from "../../../src/grammar/animation/geoState.js";
import { projectGeoAnimationPresentations, normalizeGeoAnimationPresentation, resolveGeoAnimationPresentation, validateGeoAnimationPresentations, geoAnimationFeatureOrigin } from "../../../src/materialization/animation/geoPresentation.js";

const point=(id,coordinates)=>({type:"Feature",id,properties:{id},geometry:{type:"Point",coordinates}});
const make=(features=[point("a",[0,0])],options={})=>chart().createCanvas({width:400,height:300,margin:0})
  .createGeometryData({id:"world",format:"geojson",values:{type:"FeatureCollection",features},coordinateKind:"geographic",featureKey:["properties","id"]})
  .createProjection({id:"projection",type:"orthographic",scalePx:100,translatePx:[200,150]})
  .createCoordinate({type:"geo"}).createGeoPointMark({id:"map",...options});
const state=p=>projectGeoAnimationPresentations(p,projectAnimationEndpoint(p));
const partValues=graphics=>graphics.map(({type,properties,identity})=>({type,properties,identity}));

test("native prepared presentation retains hidden features and exact styled output",()=>{
  const p=make([point("front",[0,0]),point("back",[180,0])],{fill:{type:"pattern",style:"diagonal",pitch:8,strokeWidth:1,foreground:"red",background:"white",coordinateSpace:"object"},outline:{color:"black",width:2},shadow:{color:"#0008",blurRadius:2,offsetX:1,offsetY:2}});
  const before=JSON.stringify(p),prepared=state(p),group=prepared.groups[0];
  assert.equal(group.presentation.geometry.features.length,2);assert.equal(group.presentation.styles.length,2);
  const resolved=resolveGeoAnimationPresentation(group.presentation);
  assert.deepEqual(partValues(resolved.graphics),partValues(p.graphicSpec.objects.map.items));
  assert.equal(prepared.items.filter(Boolean).length,1);assert.equal(group.reason,undefined);
  assert.ok(Object.isFrozen(group.presentation.styles[1]));assert.equal(JSON.stringify(p),before);
});

test("empty endpoint collections retain explicit order and frames for intermediate visible parts",()=>{
  const p=make().editProjection({clipExtentPx:[[0,0],[400,300]],translatePx:[-200,150]}),q=p.editProjection({translatePx:[600,150]});
  assert.equal(p.graphicSpec.objects.map.items.length,0);assert.equal(q.graphicSpec.objects.map.items.length,0);
  const a=state(p),b=state(q);assert.equal(a.groups.length,1);assert.equal(a.items.filter(Boolean).length,0);
  const plan=prepareGeoInterpolation(a.groups[0].presentation.geometry,b.groups[0].presentation.geometry),geometry=sampleGeoInterpolation(plan,.5).group;
  const current=resolveGeoAnimationPresentation({...a.groups[0].presentation,geometry}),native=p.editProjection(geometry.parameters);
  assert.equal(current.graphics.length,1);assert.equal(current.graphics[0].properties.x,200);
  assert.deepEqual(partValues(current.graphics),partValues(native.graphicSpec.objects.map.items));
  assert.equal(a.groups[0].insertion,projectAnimationEndpoint(p).scene.nodes.length);
});

test("nested repeated owners reuse the actual collection clip offset and native order",()=>{
  const p=make([point("a",[0,0]),point("b",[180,0])],{clip:true});
  const both=hconcat({id:"pair",programs:[{id:"left",program:p},{id:"right",program:p}]}),endpoint=projectAnimationEndpoint(both),prepared=state(both);
  assert.equal(prepared.groups.length,2);assert.notDeepEqual(prepared.groups[0].presentation.frame.offset,prepared.groups[1].presentation.frame.offset);
  for(const [index,item]of prepared.items.entries())if(item){const group=prepared.groups[item.group],node=endpoint.scene.nodes[index];
    assert.deepEqual(group.presentation.frame,{offset:node.offset,clip:node.clip,clips:node.clips});
    assert.ok(group.presentation.frame.clips.length>0);assert.equal(item.reason,undefined);
    assert.deepEqual(JSON.parse(group.presentation.geometry.key)[0],JSON.parse(endpoint.identities[index].key)[0]);
  }
});

test("primitive geometry appearance and removal edits remain explicit prepared fallback",()=>{
  const p=make(),id=p.graphicSpec.objects.map.items[0].id;
  for(const edited of [p.editGraphics({target:id,property:"radius",value:99}),p.editGraphics({target:id,property:"fill",value:"red"})]){
    const prepared=state(edited);assert.equal(prepared.groups[0].reason,"edited-geo-graphics");assert.equal(prepared.items.filter(Boolean)[0].reason,"edited-geo-graphics");
    assert.equal(prepared.groups[0].presentation.geometry.features[0].radiusPx,3);
  }
  const removed=p.editGraphics({target:"map",property:"items",value:[]});
  assert.equal(state(removed).groups[0].reason,"edited-geo-graphics");
  const wrong=structuredClone(p.graphicSpec);wrong.objects.map.items[0].identity.lineage.resource.revision++;
  const stale=p._clone({graphicSpec:wrong});assert.throws(()=>state(stale),/exact native/);
});

test("presentation validation rejects malformed appearance frame and accessor inputs",()=>{
  const p=make(),presentation=state(p).groups[0].presentation,before=structuredClone(presentation);
  for(const mutate of [x=>x.styles=[],x=>x.styles[0].radiusPx=3,x=>delete x.styles[0].opacity,x=>x.frame.offset=[0],x=>x.frame.clip=[0,0,-1,2],x=>x.frame.clips=[{x:0,y:0,width:-1,height:1}],x=>x.plotOrigin=[Infinity,0],x=>x.extra=1]){
    const value=structuredClone(presentation);mutate(value);assert.throws(()=>normalizeGeoAnimationPresentation(value));
  }
  let reads=0;const getter={...presentation};Object.defineProperty(getter,"styles",{enumerable:true,get(){reads++;return [];}});
  assert.throws(()=>normalizeGeoAnimationPresentation(getter),/accessors/);assert.equal(reads,0);assert.deepEqual(presentation,before);
  assert.throws(()=>projectGeoAnimationPresentations(p,projectAnimationEndpoint(make())),/exact native endpoint/);
  assert.deepEqual(state(chart().createCanvas({width:10,height:10,margin:0})).groups,[]);
});

test("path clipping part identity and current geometry match native intermediate materialization",()=>{
  const line={type:"Feature",id:"route",properties:{id:"route"},geometry:{type:"LineString",coordinates:[[170,0],[-170,0]]}};
  const p=chart().createCanvas({width:400,height:300,margin:0}).createGeometryData({id:"world",format:"geojson",values:{type:"FeatureCollection",features:[line]},coordinateKind:"geographic",featureKey:["properties","id"]})
    .createProjection({id:"projection",type:"equirectangular",scalePx:50,translatePx:[200,150]}).createCoordinate({type:"geo"}).createGeoLineMark({id:"map",stroke:"red"});
  const a=state(p).groups[0].presentation,b=state(p.editProjection({rotateDeg:[30,0,0]})).groups[0].presentation;
  const geometry=sampleGeoInterpolation(prepareGeoInterpolation(a.geometry,b.geometry),.5).group;
  const current=resolveGeoAnimationPresentation({...b,geometry});assert.equal(current.graphics.length,1);
  assert.deepEqual(partValues(current.graphics),partValues(p.editProjection(geometry.parameters).graphicSpec.objects.map.items));
});


test("restored presentation state rejects forged roles lineage and closed proof fields",()=>{
  const p=make(),endpoint=projectAnimationEndpoint(p),prepared=state(p),itemIndex=prepared.items.findIndex(Boolean);
  for(const [caseIndex,mutate] of [
    x=>x.extra=true,x=>x.items.pop(),x=>x.groups[0].extra=1,x=>x.groups[0].insertion=-1,
    x=>x.groups[0].insertion=endpoint.scene.nodes.length+1,x=>x.groups.push(x.groups[0]),
    x=>x.groups[0].reason="unknown",x=>x.items[itemIndex]=null,x=>x.items[itemIndex].extra=1,
    x=>x.items[itemIndex].group=2,x=>x.items[itemIndex].key="unknown",x=>x.items[itemIndex].role="other",
    x=>x.items[itemIndex].reason="edited-geo-graphics",x=>x.items[itemIndex].reason="unknown",
    x=>x.groups[0].presentation.geometry.binding.geometry.revision++,x=>x.groups[0].presentation.styles[0].fill="red",
    x=>x.groups[0].insertion=itemIndex+1
  ].entries()){const value=structuredClone(prepared);mutate(value);assert.throws(()=>validateGeoAnimationPresentations(value,endpoint),`case ${caseIndex}`);}
  assert.deepEqual(validateGeoAnimationPresentations(JSON.parse(JSON.stringify(prepared)),endpoint),prepared);
  const omitted={...endpoint,identities:endpoint.identities.slice(0,-1),scene:{...endpoint.scene,nodes:endpoint.scene.nodes.slice(0,-1)}};
  const absent=structuredClone(prepared);absent.items.pop();assert.throws(()=>validateGeoAnimationPresentations(absent,omitted),/omitted/);
});

test("generated and planar shape presentations preserve plot anchored paint with real clipping",()=>{
  const p=chart().createCanvas({width:200,height:160,margin:10}).createProjection({id:"projection",type:"equirectangular",scalePx:20,translatePx:[100,80]})
    .createCoordinate({type:"geo"}).createGraticule({id:"grid",stepDeg:[90,45]});
  const generated=state(p);assert.equal(generated.groups[0].presentation.geometry.logicalId,"graticule");
  assert.deepEqual(partValues(resolveGeoAnimationPresentation(generated.groups[0].presentation).graphics),partValues(p.graphicSpec.objects.grid.items));
  const polygon={type:"Feature",id:"square",properties:{id:"square"},geometry:{type:"Polygon",coordinates:[[[0,0],[40,0],[40,40],[0,40],[0,0]]]}},
    shape=chart().createCanvas({width:200,height:160,margin:10}).createGeometryData({id:"plane",format:"geojson",values:{type:"FeatureCollection",features:[polygon]},coordinateKind:"planar",featureKey:["properties","id"]})
    .createProjection({id:"projection",type:"identity",scalePx:1,translatePx:[20,20]}).createCoordinate({type:"geo"})
    .createGeoShapeMark({id:"map",fill:{type:"pattern",style:"dots",coordinateSpace:"plot",pitch:8,strokeWidth:1,foreground:"blue",background:"white"}})
    .editGraphics({target:"map",property:"clip",value:{type:"path",commands:[{op:"M",x:0,y:0},{op:"L",x:100,y:0},{op:"L",x:100,y:100},{op:"Z"}]}});
  const presentation=state(shape).groups[0].presentation;
  assert.equal(presentation.frame.clips[0].type,"path");
  const resolved=resolveGeoAnimationPresentation(presentation);
  assert.deepEqual(partValues(resolved.graphics),partValues(shape.graphicSpec.objects.map.items));
  assert.deepEqual(resolved.graphics[0].properties.fill.origin,{x:10,y:10});
});

test("prepared group order follows actual graphic order including empty collection ties",()=>{
  const p=make([point("hidden",[180,0])]).createGeoPointMark({id:"second"});
  const [parentId,parent]=Object.entries(p.graphicSpec.objects).find(([,object])=>object.children?.includes("map"));
  const reordered=p.editGraphics({target:parentId,property:"children",value:[...parent.children].reverse()});
  const prepared=state(reordered);
  assert.deepEqual(prepared.groups.map(group=>JSON.parse(group.presentation.geometry.key)[1]),["second","map"]);
  assert.equal(prepared.groups[0].insertion,prepared.groups[1].insertion);
});


test("native hidden-feature origins preserve actual child IDs without invented scene indices",()=>{
  const p=make([point("hidden",[180,0])]),composed=hconcat({id:"pair",programs:[{id:"left-right",program:p},{id:"left",program:p}]}),prepared=state(composed);
  const keys=prepared.groups.map(group=>group.presentation.geometry.features[0].key);
  const first=geoAnimationFeatureOrigin(prepared,0,keys[0]),second=geoAnimationFeatureOrigin(prepared,1,keys[1]);
  assert.equal(first.program,composed);assert.equal(first.kind,"geo-feature");assert.equal(first.ownerId,"map");
  assert.deepEqual(first.childPath,["left-right"]);assert.deepEqual(second.childPath,["left"]);
  assert.notEqual(first.itemKey,second.itemKey);assert.equal(Object.hasOwn(first,"index"),false);
  assert.ok(Object.isFrozen(first.childPath));assert.equal(prepared.items.filter(Boolean).length,0);
  assert.throws(()=>geoAnimationFeatureOrigin(JSON.parse(JSON.stringify(prepared)),0,keys[0]),/exact prepared/);
  assert.throws(()=>geoAnimationFeatureOrigin(prepared,0,"missing"),/exact prepared/);
});
