import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chart, prepareFontResource, prepareTextMetrics, prepareFontRendering, hconcat } from '../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';
import { exportTransitionPlan, restoreTransitionPlan } from '../../../src/animation/planner.js';
import { animationFrameProvenance } from '../../../src/animation/frameProvenance.js';
import { prepareAnimationHitFrame } from '../../../src/interaction/hitProgram.js';
import { canvasSceneSnapshot } from '../../../src/sceneSnapshot.js';
import { serializeProgram } from '../../../src/persistence.js';

const feature = (id, name, coordinates = [40,50]) => ({type:'Feature',id,properties:{name},geometry:coordinates === null ? null : {type:'Point',coordinates}});
const collection = features => ({type:'FeatureCollection',features});
function base(features = [feature('a','Old')], camera = {type:'identity'}) {
  return chart().createCanvas({width:400,height:300,margin:0}).createGeometryData({id:'places',format:'geojson',coordinateKind:camera.type==='identity'?'planar':'geographic',featureKey:'id',values:collection(features)})
    .createProjection({id:'map',...camera}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places-mark'}).createMarkLabels({id:'labels',field:'name',dx:4});
}
const change = (p,text) => p.editTextMark({target:'labels',textOverrides:[{match:{fields:{name:'Old'}},occurrence:0,text}]});
const plan = (from,to,extra={}) => planTransition({from,to,options:{durationMs:100,easing:'linear',...extra}});
const nodeTexts = p => canvasSceneSnapshot(p).scene.nodes.filter(n=>n.type==='text');
const geoTexts = frame => frame.scene.nodes.filter((n,i)=>frame.decisions[i]?.kernel==='native-geo-text'&&frame.decisions[i]?.role!=='leader');
const dominant = node => node.type==='text'?node.properties:node.properties.sources.reduce((a,b)=>b.weight>=a.weight?b:a).properties;
const copy = v => JSON.parse(JSON.stringify(v));

test('content expressions both follow current logarithmic camera, with exact native endpoints',()=>{
  const from=base(),to=change(from,'New').editProjection({scalePx:4}),p=plan(from,to),before=serializeProgram(from);
  assert.equal(sampleTransition(p,0).graphicSpec,from.graphicSpec);assert.equal(sampleTransition(p,100).graphicSpec,to.graphicSpec);
  for(const t of [25,50,75]) {
    const frame=sampleTransition(p,t),node=geoTexts(frame)[0],scale=4**(t/100);
    assert.equal(node.type,'weighted-blend');
    assert.deepEqual(node.properties.sources.map(s=>s.properties),[nodeTexts(from.editProjection({scalePx:scale}))[0].properties,nodeTexts(to.editProjection({scalePx:scale}))[0].properties]);
    assert.deepEqual(node.properties.sources.map(s=>s.weight),[1-t/100,t/100]);
    assert.equal(dominant(node).text,t<50?'Old':'New');
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(p)).plan,t).scene,frame.scene);
  }
  assert.equal(serializeProgram(from),before);
});

test('changed geographic Text expressions follow spherical rotation and independent native offsets',()=>{
  const from=base([feature('a','Old',[20,10])],{type:'orthographic',scalePx:100,translatePx:[200,150],rotateDeg:[20,0,0]});
  const to=change(from,'New').editTextMark({target:'labels',fontSize:24,dx:8,dy:-4}).editProjection({scalePx:200,rotateDeg:[60,0,0]});
  const frame=sampleTransition(plan(from,to),50),node=geoTexts(frame)[0],scale=Math.sqrt(100*200);
  const x=200+scale*Math.cos(10*Math.PI/180)*Math.sin(60*Math.PI/180),y=150-scale*Math.sin(10*Math.PI/180);
  for(const [index,source]of node.properties.sources.entries()) {
    assert.ok(Math.abs(source.properties.x-(x+(index?8:4)))<1e-9);
    assert.ok(Math.abs(source.properties.y-(y+(index?-4:0)))<1e-9);
  }
  const style=({x,y,...properties})=>properties;
  assert.deepEqual(node.properties.sources.map(source=>style(source.properties)),[from,to].map(native=>style(nodeTexts(native.editProjection({scalePx:scale,rotateDeg:[40,0,0]}))[0].properties)));
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan(frame,to))).plan,40).scene,sampleTransition(plan(frame,to),40).scene);
});

test('from-only collision leaders keep their current native geometry and precede labels',()=>{
  const from=base([feature('a','Old'),feature('b','Second')]).layoutLabels({target:'labels',leader:{}}).editGraphics({target:'labels',property:'clip',value:{x:10,y:10,width:250,height:180}});
  const to=change(from,'New').removeLabelLayout({target:'labels'}).editProjection({scalePx:4}),frame=sampleTransition(plan(from,to),50);
  const leaders=frame.scene.nodes.flatMap((n,i)=>frame.decisions[i]?.role==='leader'?[{n,i}]:[]);
  assert.equal(leaders.length,1);assert.ok(leaders[0].i<frame.decisions.findIndex(d=>d.kernel==='native-geo-text'&&d.role==='body'));
  const native=canvasSceneSnapshot(from.editProjection({scalePx:2})).scene.nodes.find(n=>n.type==='line');
  assert.deepEqual(leaders[0].n.properties,{...native.properties,opacity:.5});
  const proof=animationFrameProvenance(frame);assert.equal(proof.geotexts.groups[0].presentation.expressions.length,2);
  const rebased=plan(frame,to);assert.equal(sampleTransition(rebased,0),frame);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,30).scene,sampleTransition(rebased,30).scene);
  const reverse=sampleTransition(plan(to,from),50);assert.equal(reverse.decisions.filter(d=>d.role==='leader').length,1);
});

test('middle-only current Text visibility, empty content and nested clips use the native projection',()=>{
  const hidden=base([feature('a','Old',[0,0])],{type:'orthographic',scalePx:100,translatePx:[-200,150],clipExtentPx:[[0,0],[400,300]]});
  const target=change(hidden,'New').editProjection({translatePx:[600,150]});
  const p=plan(hidden,target);assert.equal(nodeTexts(hidden).length,0);assert.equal(nodeTexts(target).length,0);
  const node=geoTexts(sampleTransition(p,50))[0];assert.equal(node.properties.sources[0].properties.x,204);
  const original=base(),empty=original.editGeometryData({target:'places',values:collection([feature('a','')])}),current=sampleTransition(plan(original,empty.editProjection({scalePx:4})),50);
  const only=geoTexts(current)[0];assert.equal(only.type,'text');assert.equal(only.properties.text,'Old');assert.equal(only.properties.opacity,.5);assert.equal(only.properties.x,84);
  const unit=base().editGraphics({target:'labels',property:'clip',value:{x:10,y:10,width:250,height:180}});
  const wrap=p=>hconcat({id:'pair',programs:[{id:'left',program:p},{id:'right',program:unit}],gap:5});
  const frame=sampleTransition(plan(wrap(unit),wrap(change(unit,'New').editProjection({scalePx:4}))),50);
  const blend=geoTexts(frame).find(n=>n.type==='weighted-blend');assert.ok(blend.properties.sources.every(s=>s.clips.length>0));
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan(frame,wrap(unit)))).plan,50).scene,sampleTransition(plan(frame,wrap(unit)),50).scene);
});

test('flat expression rebases retain actual current state and fail atomically above 64 sources',()=>{
  const original=base(),first=change(original,'Text1').editProjection({scalePx:4});let frame=sampleTransition(plan(original,first),50);
  for(let i=2;i<64;i++) {
    const next=change(original,`Text${i}`).editProjection({scalePx:i%2?4:1});frame=sampleTransition(plan(frame,next),50);
    const proof=animationFrameProvenance(frame);assert.equal(Object.hasOwn(proof,'plan'),false);
    assert.equal(proof.geotexts.groups[0].presentation.expressions.length,i+1);
    assert.ok(geoTexts(frame)[0].properties.sources.every(s=>s.type==='text'));
  }
  const before=frame.scene;assert.throws(()=>plan(frame,change(original,'Overflow')),/64 flat expressions/);assert.equal(frame.scene,before);
  const restored=deserializeAnimation(serializeAnimation(plan(frame,original))).plan;
  assert.deepEqual(sampleTransition(restored,50).scene,sampleTransition(plan(frame,original),50).scene);
});

test('closed expression transport rejects invalid weight, font, source, raw anchor and concrete output',()=>{
  const from=base(),to=change(from,'New').editProjection({scalePx:4}),frame=sampleTransition(plan(from,to),50),payload=exportTransitionPlan(plan(frame,to));
  for(const mutate of [
    p=>p.kernels.geoText='native-geo-text@1',
    p=>p.from.geotexts.groups[0].presentation.expressions=[],
    p=>p.from.geotexts.groups[0].presentation.expressions[0].weight=0,
    p=>p.from.geotexts.groups[0].presentation.expressions[0].weight=.9,
    p=>p.from.geotexts.groups[0].presentation.expressions[0].extra=true,
    p=>p.from.geotexts.groups[0].presentation.expressions[0].properties[0].font={},
    p=>p.from.geotexts.groups[0].presentation.entries[0].anchor[0]++,
    p=>p.from.geotexts.groups[0].presentation.expressions[0].properties[0].text='Forged'
  ]) {const changed=copy(payload);mutate(changed);assert.throws(()=>restoreTransitionPlan(changed));}
  let reads=0;const bad=copy(payload);Object.defineProperty(bad.from.geotexts.groups[0].presentation.expressions[0],'weight',{enumerable:true,get(){reads++;return .5;}});
  assert.throws(()=>restoreTransitionPlan(bad));assert.equal(reads,0);
});

async function exactMetrics(p,factor) {
  const bytes=new Uint8Array(readFileSync(new URL('../../fixtures/fonts/metric-fixture.ttf',import.meta.url))),expectedHash=createHash('sha256').update(bytes).digest('hex');
  const decode=value=>Object.fromEntries(['contentHash','family','style','weight','metricsProviderVersion'].map(key=>[key,value[key]]));
  const prepared=await prepareFontResource(p,{kind:'create',id:'font',uri:'fixture:expressions',expectedHash,mimeType:'font/ttf',family:'sans-serif',style:'normal',weight:400,metricsProviderVersion:`fixture@${factor}`},{requestToken:'font',load:()=>({bytes,mimeType:'font/ttf'}),decode});
  const withFont=p.createFontResource({prepared,requestToken:'font'});
  const metrics=await prepareTextMetrics(withFont,{id:'exact',fonts:['font']},{requestToken:'metrics',decode,measure:({asset,queries})=>({contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,widths:queries.map(({text,fontSize})=>text.length*factor*fontSize)})});
  return withFont.applyTextMetrics({prepared:metrics,requestToken:'metrics'});
}

test('mixed source revisions keep target raw lineage and independent actual font metric origins',async()=>{
  const raw=base(),from=await exactMetrics(raw,.4);
  const revised=raw.editGeometryData({target:'places',values:collection([feature('a','New')])}).editProjection({scalePx:4});
  const to=await exactMetrics(revised,.8),frame=sampleTransition(plan(from,to),25),proof=animationFrameProvenance(frame);
  const index=frame.decisions.findIndex(d=>d.kernel==='native-geo-text'),native=proof.native.nodes[index];
  assert.equal(native.origin.program,to);assert.deepEqual(native.metrics.map(value=>value.program),[from,to]);
  assert.equal(proof.endpoint.identities[index].lineage.resource.revision,1);
  assert.equal(dominant(frame.scene.nodes[index]).text,'Old');
  let registered=0,disposed=0;
  const lease=await prepareFontRendering(frame,{register:request=>{
    registered++;assert.ok(request.bytes.length>0);
    return {...Object.fromEntries(['contentHash','family','style','weight','metricsProviderVersion'].map(key=>[key,request[key]])),dispose(){disposed++;}};
  }});
  assert.equal(registered,2);assert.equal(lease.fontCount,2);lease.dispose();lease.dispose();assert.equal(disposed,2);
  const hit=prepareAnimationHitFrame(frame);assert.ok(hit.entries.some(entry=>entry.metadata.ownerId==='labels'&&entry.metadata.resourceRefs[0].revision===1));
  const current=sampleTransition(plan(frame,to),50),again=animationFrameProvenance(current),at=current.decisions.findIndex(d=>d.kernel==='native-geo-text');
  assert.deepEqual(again.native.nodes[at].metrics.map(value=>value.program),[from,to]);assert.equal(again.native.nodes[at].origin.program,to);
  prepareAnimationHitFrame(current);
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan(frame,to))).plan,50).scene,current.scene);
  const restored=sampleTransition(deserializeAnimation(serializeAnimation(plan(frame,to))).plan,50);
  assert.deepEqual(restored.scene.nodes[at].properties.sources.map(source=>source.properties.font.payload),current.scene.nodes[at].properties.sources.map(source=>source.properties.font.payload));
});


test('empty formatted fields retain raw source membership while explicit empty Text keeps native output',()=>{
  const from=base([feature('a','Old'),feature('b','Other')]).layoutLabels({target:'labels',leader:{}});
  const absent={type:'Feature',id:'a',properties:{},geometry:{type:'Point',coordinates:[40,50]}};
  const to=from.editGeometryData({target:'places',values:collection([absent,feature('b','')])}).editProjection({scalePx:4});
  const p=plan(from,to),frame=sampleTransition(p,50),proof=animationFrameProvenance(frame);
  assert.equal(proof.geotexts.groups[0].presentation.entries.length,2);
  assert.deepEqual(proof.geotexts.groups[0].presentation.expressions[1].properties,[null,null]);
  assert.ok(geoTexts(frame).every(node=>node.type==='text'&&node.properties.opacity===.5));
  const hit=prepareAnimationHitFrame(frame);assert.ok(hit.entries.some(entry=>entry.metadata.ownerId==='labels'));
  proof.native.nodes.forEach((native,index)=>{if(frame.decisions[index]?.kernel==='native-geo-text')assert.equal(native.metrics.length,1);});
  assert.deepEqual(sampleTransition(p,100).graphicSpec,to.graphicSpec);
  const reversed=sampleTransition(plan(to,from),50);assert.equal(geoTexts(reversed).length,2);
  const entireEmpty=sampleTransition(plan(to,to.editProjection({scalePx:2})),50);
  assert.equal(geoTexts(entireEmpty).length,0);
  assert.equal(animationFrameProvenance(entireEmpty).geotexts.groups[0].presentation.entries.length,2);
  const explicit=change(base(),'');const actual=sampleTransition(plan(explicit,explicit),50);
  assert.deepEqual(actual.scene,canvasSceneSnapshot(explicit).scene);
  const payload=copy(exportTransitionPlan(plan(to,to)));payload.from.geotexts.groups[0].presentation.expressions[0].textMetrics={};
  assert.throws(()=>restoreTransitionPlan(payload));
  const snapshot=serializeProgram(from);assert.throws(()=>from.encodeText({target:'labels',field:'missing'}),/Unknown text field/);assert.equal(serializeProgram(from),snapshot);
});

test('explicit timeline style applies to every expression and rejects ambiguous current opacity',()=>{
  const from=base().editTextMark({target:'labels',fill:'black'}),to=change(from,'New').editTextMark({target:'labels',fill:'white'}).editProjection({scalePx:4});
  const item=sampleTransition(plan(from,to),50).decisions.find(d=>d.kernel==='native-geo-text');
  const tracks=[{target:{ownerKey:item.ownerKey},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:0},{timeMs:50,value:.25},{timeMs:100,value:1}]},
    {target:{itemKey:item.itemKey},property:'fill',kernel:'color',keyframes:[{timeMs:0,value:'black'},{timeMs:50,value:'red'},{timeMs:100,value:'white'}]}];
  const p=plan(from,to,{tracks}),current=sampleTransition(p,50),node=geoTexts(current)[0];
  assert.deepEqual(node.properties.sources.map(s=>s.weight),[.75,.25]);
  assert.ok(node.properties.sources.every(s=>s.properties.fill==='rgba(255,0,0,1)'&&Math.abs(s.properties.x-(40*Math.sqrt(2)+4))<1e-9));
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(p)).plan,50).scene,current.scene);
  const mixed=sampleTransition(plan(from,change(from,'New').editTextMark({target:'labels',opacity:.2})),50);
  assert.throws(()=>plan(mixed,to,{tracks:[{target:{itemKey:item.itemKey},property:'opacity',kernel:'number',keyframes:[{timeMs:0,value:1},{timeMs:100,value:1}]}]}),/explicit finite native endpoint/);
});
