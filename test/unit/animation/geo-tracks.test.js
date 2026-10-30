import test from "node:test";
import assert from "node:assert/strict";
import { chart,hconcat } from "../../../src/index.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectGeoAnimationPresentations,resolveGeoAnimationPresentation } from "../../../src/materialization/animation/geoPresentation.js";
import { prepareGeoTracks,sampleGeoTracks } from "../../../src/animation/geoTracks.js";

const point=(id,coordinates)=>({type:"Feature",properties:{id},geometry:{type:"Point",coordinates}});
const make=features=>chart().createCanvas({width:400,height:300,margin:0})
 .createGeometryData({id:"world",format:"geojson",coordinateKind:"geographic",featureKey:["properties","id"],values:{type:"FeatureCollection",features:features??[point("a",[0,0])]}})
 .createProjection({id:"map",type:"orthographic",scalePx:100,translatePx:[200,150]})
 .createCoordinate({type:"geo"}).createGeoPointMark({id:"places"});
const state=p=>projectGeoAnimationPresentations(p,projectAnimationEndpoint(p));
const flat=sample=>sample.flatMap(group=>group.emissions.flatMap(emission=>emission.graphics));

test("camera tracks generate a native middle feature when both endpoints contain no part",()=>{
 const p=make().editProjection({clipExtentPx:[[0,0],[400,300]],translatePx:[-200,150]}),q=p.editProjection({translatePx:[600,150]});
 const a=state(p),b=state(q),prepared=prepareGeoTracks(a,b),before=JSON.stringify([a,b]);
 assert.equal(prepared.skipFrom.size,0);assert.equal(prepared.skipTo.size,0);
 const sample=sampleGeoTracks(prepared.state,.5),native=p.editProjection(sample[0].presentation.geometry.parameters);
 assert.equal(flat(sample).length,1);assert.equal(flat(sample)[0].properties.x,200);
 assert.deepEqual(flat(sample).map(({type,properties,identity})=>({type,properties,identity})),native.graphicSpec.objects.places.items.map(({type,properties,identity})=>({type,properties,identity})));
 assert.deepEqual(flat(sampleGeoTracks(prepared.state,0)),[]);assert.deepEqual(flat(sampleGeoTracks(prepared.state,1)),[]);
 assert.equal(JSON.stringify([a,b]),before);assert.throws(()=>sampleGeoTracks(structuredClone(prepared.state),.5),/authentic/);
 assert.throws(()=>sampleGeoTracks(prepared.state,NaN),/between 0 and 1/);
});

test("changed feature appearance does not disable the other compatible camera features",()=>{
 const p=make([point("a",[0,0]),point("b",[20,0])]),a=state(p),b=structuredClone(state(p.editProjection({rotateDeg:[30,0,0]})));
 b.groups[0].presentation.styles[0].fill="red";
 const prepared=prepareGeoTracks(a,b),sample=sampleGeoTracks(prepared.state,.5);
 assert.equal(sample[0].presentation.geometry.features.length,1);assert.equal(prepared.state.groups[0].fallback[0].reason,"appearance");
 const aIndex=a.items.findIndex(item=>item?.key===b.groups[0].presentation.geometry.features[0].key),bIndex=b.items.findIndex(item=>item?.key===b.groups[0].presentation.geometry.features[0].key);
 assert.equal(prepared.fallbackTrack({sourceIndex:aIndex,targetIndex:bIndex}).reason,"appearance");
 assert.equal(prepared.skipTo.has(bIndex),false);assert.equal(prepared.skipTo.size,1);
 assert.equal(flat(sample)[0].identity.key,resolveGeoAnimationPresentation(sample[0].presentation).graphics[0].identity.key);
});

test("seam changes emit current native part roles without borrowing missing endpoint indices",()=>{
 const line={type:"Feature",properties:{id:"route"},geometry:{type:"LineString",coordinates:[[170,0],[-170,0]]}};
 const p=chart().createCanvas({width:400,height:300,margin:0}).createGeometryData({id:"world",format:"geojson",coordinateKind:"geographic",featureKey:["properties","id"],values:{type:"FeatureCollection",features:[line]}})
 .createProjection({id:"map",type:"equirectangular",scalePx:50,translatePx:[200,150]}).createCoordinate({type:"geo"}).createGeoLineMark({id:"places"});
 const a=state(p),b=state(p.editProjection({rotateDeg:[30,0,0]})),prepared=prepareGeoTracks(a,b);
 assert.equal(prepared.skipFrom.size,2);assert.equal(prepared.skipTo.size,1);
 const sample=sampleGeoTracks(prepared.state,.5);assert.equal(flat(sample).length,1);
 assert.deepEqual(flat(sample)[0].properties,p.editProjection(sample[0].presentation.geometry.parameters).graphicSpec.objects.places.items[0].properties);
 assert.equal(Object.hasOwn(sample[0].emissions[0],"sourceIndex"),false);
});

test("nested empty group slots preserve actual owner and feature drawing order",()=>{
 const p=make([point("first",[180,0]),point("second",[180,10])]);
 const a=hconcat({id:"pair",programs:[{id:"left",program:p},{id:"right",program:p}]}),q=p.editProjection({rotateDeg:[180,0,0]}),b=hconcat({id:"pair",programs:[{id:"left",program:q},{id:"right",program:q}]});
 const prepared=prepareGeoTracks(state(a),state(b)),sample=sampleGeoTracks(prepared.state,.5);
 assert.equal(sample.length,2);assert.notEqual(sample[0].presentation.geometry.key,sample[1].presentation.geometry.key);
 for(const group of sample){assert.deepEqual(group.emissions.map(x=>x.key),group.presentation.geometry.features.map(x=>x.key));assert.ok(group.emissions.every((x,i,list)=>i===0||list[i-1].slot<=x.slot));}
});

test("incompatible camera clip and geometry edits preserve explicit fallback reasons",()=>{
 const p=make(),a=state(p);
 for(const [b,reason]of [[state(p.editProjection({type:"equirectangular"})),"projection-type"],[state(p.editGraphics({target:p.graphicSpec.objects.places.items[0].id,property:"radius",value:20})),"edited-geo-graphics"]]){
  const prepared=prepareGeoTracks(a,b);assert.equal(prepared.state.groups[0].fallback[0].reason,reason);assert.deepEqual(sampleGeoTracks(prepared.state,.5),[]);
 }
 const b=structuredClone(a);b.groups[0].presentation.geometry.features[0].geometry.coordinates[0]=10;
 assert.equal(prepareGeoTracks(a,b).state.groups[0].fallback[0].reason,"geo-feature-geometry");
 const c=structuredClone(a);c.groups[0].presentation.frame.clips.push({type:"path",commands:[{op:"M",x:0,y:0},{op:"L",x:100,y:100}]});
 assert.equal(prepareGeoTracks(a,c).state.groups[0].fallback[0].reason,"clip-topology");
 assert.equal(prepareGeoTracks({groups:[],items:[]},{groups:[],items:[]}).state.groups.length,0);
});

test("geographic dynamic decisions are closed and bind the real source feature and part",async()=>{
 const {createGeoAnimationDecision,validateGeoAnimationDecision}=await import("../../../src/grammar/animation/geoDecision.js");
 const identity=make().graphicSpec.objects.places.items[0].identity,decision=createGeoAnimationDecision(identity);
 assert.ok(Object.isFrozen(decision));assert.equal(Object.hasOwn(decision,"sourceIndex"),false);assert.equal(Object.hasOwn(decision,"targetIndex"),false);
 assert.deepEqual(validateGeoAnimationDecision(JSON.parse(JSON.stringify(decision)),identity),decision);
 for(const update of [{kind:"semantic-kernel"},{kernel:"unknown"},{ownerKey:"[]"},{itemKey:"other"},{role:"other"},{sourceIndex:0},{targetIndex:0}])assert.throws(()=>validateGeoAnimationDecision({...decision,...update},identity));
 const missing={...decision};delete missing.role;assert.throws(()=>validateGeoAnimationDecision(missing,identity));
 let reads=0;const getter={...decision};Object.defineProperty(getter,"role",{enumerable:true,get(){reads++;return identity.role;}});assert.throws(()=>validateGeoAnimationDecision(getter,identity),/accessor/);assert.equal(reads,0);
 for(const lineage of [{kind:"resource",resource:{kind:"layout",id:"world",revision:0}},{data:"data",logicalDataId:"data",revision:0,rowKeys:[]}])assert.throws(()=>validateGeoAnimationDecision(decision,{...identity,lineage}));
});

test("partial source membership changes preserve common features and classify new keys",async()=>{
 const {emptyAnimationGeos}=await import("../../../src/animation/geoTracks.js");
 const p=make(),q=p.editGeometryData({values:{type:"FeatureCollection",features:[point("new",[20,0]),point("a",[0,0])]}}).editProjection({rotateDeg:[30,0,0]});
 const a=state(p),b=state(q),prepared=prepareGeoTracks(a,b);
 assert.equal(prepared.state.groups[0].fallback[0].reason,"geo-feature-topology");
 assert.equal(sampleGeoTracks(prepared.state,.5)[0].presentation.geometry.features.length,1);
 assert.equal(prepared.fallbackTrack({sourceIndex:a.items.findIndex(Boolean),targetIndex:b.items.findIndex(item=>item?.key===a.items.find(Boolean).key)}),undefined);
 const empty=emptyAnimationGeos(b.items.length),unrelated=prepareGeoTracks(empty,b);
 assert.equal(unrelated.state.groups.length,0);assert.equal(unrelated.fallbackTrack({sourceIndex:0,targetIndex:b.items.findIndex(Boolean)}).reason,"geo-identity");
 assert.equal(prepareGeoTracks(empty,empty).fallbackTrack({sourceIndex:0,targetIndex:0}),undefined);
});
