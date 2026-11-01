import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../src/index.js';
import {planTransition,sampleTransition} from '../../../src/animation.js';
import {exportTransitionPlan,restoreTransitionPlan} from '../../../src/animation/planner.js';
import {normalizeGeoTextPresentation,resolveGeoTextPresentation} from '../../../src/materialization/animation/geoTextGeometry.js';
import {blendGeoTextGraphics} from '../../../src/materialization/animation/geoTextBlend.js';
import {geoTextEndpointStyle} from '../../../src/materialization/animation/geoTextExpressions.js';
import {inheritGeoTextOrigins} from '../../../src/materialization/animation/geoText.js';
import {animationFrameProvenance} from '../../../src/animation/frameProvenance.js';

const copy=v=>JSON.parse(JSON.stringify(v));
function endpoints(){const from=chart().createCanvas({width:300,height:200,margin:0})
  .createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{name:'A'},geometry:{type:'Point',coordinates:[40,50]}}]}})
  .createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places-mark'}).createMarkLabels({id:'labels',field:'name'});
  const to=from.editProjection({scalePx:4}),plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}});return {from,to,plan,payload:exportTransitionPlan(plan)};}

test('closed Geo Text presentation rejects malformed raw identities, coordinates and expression shapes',()=>{
  const {payload}=endpoints(),original=payload.from.geotexts.groups[0].presentation;
  const bad=[p=>p.key='[]',p=>p.key='[[],""]',p=>p.projection.kind='geometry',p=>p.coordinateKind='wrong',p=>p.plotOrigin=[0,Infinity],
    p=>p.bounds.right=p.bounds.left,p=>p.entries.push(copy(p.entries[0])),p=>p.entries[0].identity.role='other',
    p=>p.entries[0].source.key=JSON.stringify([[],'m','point',['source','a']]),p=>p.entries[0].source.digest='bad',
    p=>p.entries[0].anchor=[1],p=>p.entries[0].anchor=[NaN,0],p=>p.entries[0].extra=true,
    p=>p.expressions[0].properties=[],p=>p.expressions[0].layout={},p=>p.expressions[0].leader={stroke:'red'},
    p=>p.expressions[0].weight=.5,p=>p.expressions[0].textMetrics={},p=>delete p.expressions[0].layout,
    p=>{p.expressions[0].weight=.5;p.expressions.push(copy(p.expressions[0]));},
    p=>p.expressions=Array.from({length:65},(_,i)=>({...copy(p.expressions[0]),weight:1/65,properties:[{...p.expressions[0].properties[0],text:String(i)}]}))];
  for(const [index,mutate]of bad.entries()){const value=copy(original);mutate(value);assert.throws(()=>normalizeGeoTextPresentation(value),undefined,`malformation ${index}`);}
  const nullAnchor=copy(original);nullAnchor.entries[0].anchor=null;assert.deepEqual(resolveGeoTextPresentation(nullAnchor),{labels:[],leaders:[]});
  const empty=copy(original);empty.entries=[];empty.expressions[0].properties=[];assert.deepEqual(resolveGeoTextPresentation(empty),{labels:[],leaders:[]});
});

test('strict Geo Text restoration rejects missing outputs, corrupt leader frame, slots and stale group reasons',()=>{
  const {payload}=endpoints(),index=payload.from.geotexts.items.findIndex(Boolean);
  for(const mutate of [
    p=>p.from.geotexts.groups.push(copy(p.from.geotexts.groups[0])),
    p=>p.from.geotexts.groups[0].insertion=-1,
    p=>p.from.geotexts.groups[0].insertion=index+1,
    p=>{const entry=p.from.geotexts.groups[0].presentation.entries[0],key=JSON.parse(entry.source.key);key[3][1]='missing';entry.source.key=JSON.stringify(key);},
    p=>p.from.geotexts.groups[0].leaderFrame=null,
    p=>p.from.geotexts.groups[0].reason='unknown',
    p=>p.from.geotexts.items[index]=null,
    p=>p.from.geotexts.items[index].group=8,
    p=>p.from.geotexts.items[index].reason='unknown',
    p=>p.from.geotexts.items[index].key='other',
    p=>p.from.geotexts.order=[],
    p=>p.from.geotexts.order.push(['bogus','wrong'])
  ]){const value=copy(payload);mutate(value);assert.throws(()=>restoreTransitionPlan(value));}
});

test('native Text source authority cannot be rebound to an unrelated scoped owner',()=>{
  const {plan}=endpoints(),proof=animationFrameProvenance(sampleTransition(plan,50)),state=proof.geotexts;
  const other=copy(state);other.groups[0].presentation.key=JSON.stringify([[],'unrelated']);
  assert.throws(()=>inheritGeoTextOrigins(other,state,[0],[[]]),/retain its target owner/);
  assert.throws(()=>inheritGeoTextOrigins(state,state,[1],[[]]),/retain its target owner/);
  assert.equal(proof.native.nodes.find((node,index)=>state.items[index]!==null).origin.ownerId,'labels');
});

test('per-item blending preserves backdrop semantics and rejects missing frame or source overflow',()=>{
  const {payload}=endpoints(),presentation=payload.from.geotexts.groups[0].presentation;
  const graphic=resolveGeoTextPresentation(presentation).labels[0],frame=payload.from.geotexts.groups[0].frame;
  const output=value=>({labels:[value],leaders:[]}),red={...graphic,properties:{...graphic.properties,fill:'red',blend:'multiply'}},blue={...graphic,properties:{...graphic.properties,fill:'blue',blend:'multiply'}};
  const result=blendGeoTextGraphics([output(red),output(blue)],[{weight:.5},{weight:.5}],{frame});
  assert.equal(result.labels[0].properties.blend,'multiply');assert.ok(result.labels[0].properties.sources.every(source=>!Object.hasOwn(source.properties,'blend')));
  assert.throws(()=>blendGeoTextGraphics([output(red),output(blue)],[{weight:.5},{weight:.5}]),/current concrete frame/);
  assert.throws(()=>blendGeoTextGraphics([output(red),output(graphic)],[{weight:.5},{weight:.5}],{frame}),/different backdrop/);
  assert.throws(()=>blendGeoTextGraphics(Array(65).fill(output(graphic)),Array(65).fill({weight:1/65}),{frame}),/source budget/);
  const partial=blendGeoTextGraphics([output(red),output(blue),{labels:[],leaders:[]}],[{weight:.25},{weight:.25},{weight:.5}],{frame});
  assert.equal(partial.labels[0].properties.opacity,.5);assert.deepEqual(partial.labels[0].properties.sources.map(s=>s.weight),[.5,.5]);
  const zero=blendGeoTextGraphics([output(graphic)],[{weight:0}],{frame});assert.deepEqual(zero,{labels:[],leaders:[]});
  const rectangular={...frame,clip:{x:0,y:0,width:300,height:200},clips:[{x:1,y:1,width:200,height:150}]};
  assert.equal(blendGeoTextGraphics([output(red),output(blue)],[{weight:.5},{weight:.5}],{frame:rectangular}).labels[0].properties.sources[0].clip,rectangular.clip);
});

test('different backdrop is rejected atomically while unchanged native Text remains exact',()=>{
  const {from}=endpoints(),to=from.editTextMark({target:'labels',textOverrides:[{match:{fields:{name:'A'}},occurrence:0,text:'B'}],blend:'multiply'}).editProjection({scalePx:4});
  assert.throws(()=>planTransition({from,to,options:{durationMs:100,easing:'linear'}}),/different backdrop blend modes/);
  const presentation=copy(endpoints().payload.from.geotexts.groups[0].presentation);
  presentation.expressions[0].properties[0].opacity=.2;presentation.expressions.push({...copy(presentation.expressions[0]),weight:.5,properties:[null]});presentation.expressions[0].weight=.5;
  assert.equal(geoTextEndpointStyle(presentation,0).opacity,null);
  const native=sampleTransition(planTransition({from,to:from,options:{durationMs:100,easing:'linear'}}),50);assert.ok(native.decisions.some(d=>d.kernel==='native-geo-text'));
});
