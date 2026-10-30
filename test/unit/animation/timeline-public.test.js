import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from '../../../src/animation.js';
import { exportTransitionPlan, restoreTransitionPlan } from '../../../src/animation/planner.js';
import { animationFrameProvenance } from '../../../src/animation/frameProvenance.js';
import { parsePaintColor } from '../../../src/grammar/color.js';
import { animationGraphFrame } from '../../support/animation-graph-frame.js';
import { partitionFrameEndpoints } from '../../support/partition-frames.js';

const options = { durationMs: 100, easing: 'linear' };
const prepare = (from, to, extra = {}) => planTransition({ from, to, options: { ...options, ...extra } });
const restore = plan => deserializeAnimation(serializeAnimation(plan)).plan;
const circle = frame => frame.scene.nodes.find(value => value.type === 'circle');
const close = (a, b) => assert.ok(Math.abs(a-b) < 1e-9, `${a} vs ${b}`);
const geometry = ownerKey => ({ target: { ownerKey }, property: 'geometry', kernel: 'native-progress',
  keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value: .25 }, { timeMs: 100, value: 1 }] });
const color = (target, first = 'black', last = 'white') => ({ target, property: 'fill', kernel: 'color',
  keyframes: [{ timeMs: 0, value: first }, { timeMs: 50, value: 'red' }, { timeMs: 100, value: last }] });
function points() {
  return chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 1, y: 2 }] }).createPointMark({ id: 'points', fill: 'black' })
    .encodeX({ field: 'x', scale: { id: 'x', domain: [0, 10], nice: false } })
    .encodeY({ field: 'y', scale: { id: 'y', domain: [0, 10], nice: false } });
}

test('public keyframes retime native semantic geometry independently from current paint', () => {
  const from = points(), to = from.reviseData({ source: 'rows', id: 'updated', values: [{ id: 'a', x: 9, y: 8 }] }).editPointMark({ fill: 'white' });
  const ordinary = prepare(from,to), decision = sampleTransition(ordinary,50).decisions.find(value => value.itemKey !== undefined);
  const plan = prepare(from,to,{ tracks: [geometry(decision.ownerKey), color({ itemKey: decision.itemKey })] });
  assert.equal(plan.version,3);
  const middle = sampleTransition(plan,50), expected = circle(sampleTransition(ordinary,25));
  close(circle(middle).properties.x,expected.properties.x); close(circle(middle).properties.y,expected.properties.y);
  assert.equal(parsePaintColor(circle(middle).properties.fill).r,1); assert.equal(parsePaintColor(circle(middle).properties.fill).g,0);
  assert.equal(middle.decisions.find(value=>value.itemKey===decision.itemKey).ownerKey,decision.ownerKey);
  assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec); assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
  assert.deepEqual(sampleTransition(restore(plan),50),middle);
  const current = animationFrameProvenance(middle).positions.find(Boolean);
  close(current.x.value,3); close(current.y.value,3.5);
});

test('one owner clock preserves native graph anchors and partition cells across offline restoration', () => {
  const graph = animationGraphFrame(false,true), partition = partitionFrameEndpoints({padding:[2,4]});
  for (const [from,to,kernel] of [[graph.from,graph.to,'completed-graph'],[partition.before,partition.after,'partition']]) {
    const ordinary = prepare(from,to), native = sampleTransition(ordinary,50);
    const ownerKey = native.decisions.find(value=>value.kernel===kernel).ownerKey;
    const plan = prepare(from,to,{tracks:[geometry(ownerKey)]}), middle = sampleTransition(plan,50), expected = sampleTransition(ordinary,25);
    assert.deepEqual(middle.scene.nodes.filter((_,index)=>middle.decisions[index].kernel===kernel),expected.scene.nodes.filter((_,index)=>expected.decisions[index].kernel===kernel));
    assert.deepEqual(sampleTransition(restore(plan),50),middle);
    const proof = animationFrameProvenance(middle); assert.equal(Object.hasOwn(proof,'plan'),false);
  }
});

test('native guide and repeated composition owners retain exact scoped clocks', () => {
  const unit=points().editCanvas({margin:60}).createXAxis({title:false,ticksAndLabels:{values:[0,5,10]}});
  const compose=p=>hconcat({id:'pair',programs:[{id:'left',program:p},{id:'right',program:unit}]});
  const from=compose(unit),to=compose(unit.editScale({id:'x',domain:[0,20]})),ordinary=prepare(from,to);
  const guide=sampleTransition(ordinary,50).decisions.find(value=>value.guideKey!==undefined);
  const plan=prepare(from,to,{tracks:[geometry(guide.ownerKey)]}),actual=sampleTransition(plan,50),expected=sampleTransition(ordinary,25);
  const lookup=(frame,key)=>frame.scene.nodes[frame.decisions.findIndex(value=>value.guideKey===key)];
  for(const decision of actual.decisions.filter(value=>value.ownerKey===guide.ownerKey))assert.deepEqual(lookup(actual,decision.guideKey),lookup(expected,decision.guideKey));
  assert.deepEqual(sampleTransition(restore(plan),50),actual);
});

test('geographic feature and label paint update retained current meaning before native rebase and offline export', () => {
  const from=chart().createCanvas({width:400,height:300,margin:0})
    .createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{name:'Alpha'},geometry:{type:'Point',coordinates:[40,50]}}]}})
    .createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places-mark',fill:'black'})
    .createMarkLabels({field:'name'}).editTextMark({target:'places-mark-labels',fill:'black'});
  const to=from.editProjection({scalePx:4}).editGeoPointMark({target:'places-mark',fill:'white'}).editTextMark({target:'places-mark-labels',fill:'white'}),ordinary=prepare(from,to);
  const decisions=sampleTransition(ordinary,50).decisions,body=decisions.find(value=>value.kernel==='native-geo'),label=decisions.find(value=>value.kernel==='native-geo-text');
  const plan=prepare(from,to,{tracks:[geometry(body.ownerKey),geometry(label.ownerKey),color({itemKey:body.itemKey}),color({itemKey:label.itemKey})]});
  const middle=sampleTransition(plan,50),proof=animationFrameProvenance(middle);
  close(circle(middle).properties.x,40*Math.sqrt(2));
  assert.equal(parsePaintColor(proof.geos.groups[0].presentation.styles[0].fill).r,1);
  assert.equal(parsePaintColor(proof.geotexts.groups[0].presentation.entries[0].properties.fill).r,1);
  assert.deepEqual(sampleTransition(restore(plan),50),middle);
  const next=prepare(middle,from);assert.equal(sampleTransition(next,0),middle);
  assert.deepEqual(sampleTransition(restore(next),50),sampleTransition(next,50));
  const exported=exportAnimationFrames(plan,{timesMs:[0,50,100]});assert.equal(sampleTransition(prepare(exported[1],from),0),exported[1]);
});

test('closed timeline transport preserves raw authored colors and rejects stale versions, selectors and boundary corruption', () => {
  const from=points(),to=from.editPointMark({fill:'white'}),ordinary=prepare(from,to),decision=sampleTransition(ordinary,50).decisions.find(value=>value.itemKey);
  const plan=prepare(from,to,{tracks:[color({itemKey:decision.itemKey})],markers:[{id:'start',timeMs:0},{id:'end',timeMs:100}]}),original=exportTransitionPlan(plan);
  assert.equal(original.timeline.version,'keyframe-schedule@1');assert.equal(original.kernels.timeline,'keyframe-schedule@1');assert.equal(original.timeline.tracks[0].keyframes[1].value,'red');
  for(const mutate of [p=>p.version=2,p=>p.kernels.transition=2,p=>delete p.kernels.timeline,p=>p.kernels.timeline='future',p=>p.timeline.version='future',
    p=>p.timeline.extra=true,p=>p.timeline.tracks[0].target.itemKey='missing',p=>p.timeline.tracks[0].keyframes[0].value='blue',p=>p.timeline.markers.push(p.timeline.markers[0])]){
    const input=structuredClone(original);mutate(input);assert.throws(()=>restoreTransitionPlan(input));
  }
  const current=sampleTransition(plan,50),saved=exportTransitionPlan(prepare(current,from)),bad=structuredClone(saved);
  bad.from.view.decisions.find(value=>value.itemKey).ownerKey='[[],"other"]';assert.throws(()=>restoreTransitionPlan(bad),/owner/);
  let reads=0;const target={get itemKey(){reads++;return decision.itemKey;}};
  assert.throws(()=>prepare(from,to,{tracks:[color(target)]}),/accessor/);assert.equal(reads,0);
  let frame=current;
  for(let index=0;index<20;index++){const next=prepare(frame,index%2?from:to);assert.equal(sampleTransition(next,0),frame);frame=sampleTransition(next,40);assert.equal(Object.hasOwn(animationFrameProvenance(frame),'plan'),false);}
  assert.deepEqual(sampleTransition(restore(prepare(frame,from)),50),sampleTransition(prepare(frame,from),50));
});

test('late keyframes remain current samples when cubic easing rounds to an endpoint',()=>{
  const from=points(),to=from.editPointMark({fill:'white'}),ordinary=prepare(from,to),decision=sampleTransition(ordinary,50).decisions.find(value=>value.itemKey);
  const paint=color({itemKey:decision.itemKey});paint.keyframes[1].timeMs=99.9999;
  const plan=prepare(from,to,{easing:'cubic-in-out',tracks:[paint]}),frame=sampleTransition(plan,99.9999);
  assert.equal(circle(frame).properties.fill,'rgba(255,0,0,1)');assert.notEqual(frame.graphicSpec,to.graphicSpec);
  assert.ok(frame.progress>0&&frame.progress<1);assert.ok(frame.decisions.length);assert.deepEqual(sampleTransition(restore(plan),99.9999),frame);
  const next=prepare(frame,to);assert.equal(sampleTransition(next,0),frame);assert.deepEqual(sampleTransition(restore(next),50),sampleTransition(next,50));
  const [timed]=exportAnimationFrames(plan,{timesMs:[99.9999]});assert.equal(timed.timeMs,99.9999);assert.equal(circle(timed).properties.fill,'rgba(255,0,0,1)');
  assert.deepEqual(sampleTransition(restore(prepare(timed,from)),25),sampleTransition(prepare(timed,from),25));
  const tiny=prepare(from,to,{durationMs:Number.MAX_VALUE,easing:'linear'}),first=sampleTransition(tiny,Number.MIN_VALUE);
  assert.notEqual(first.graphicSpec,from.graphicSpec);assert.ok(first.progress>0);assert.deepEqual(sampleTransition(restore(tiny),Number.MIN_VALUE),first);
});

test('fallback-only family vectors preserve full-frame Parallel decisions through offline rebasing',()=>{
  const from=chart().createCanvas({width:600,height:400,margin:70}).createData({values:[{a:0,b:10},{a:10,b:20}]})
    .createParallelCoordinates({id:'lines',dimensions:['a','b'],guides:{legend:false}}),to=from.editCanvas({width:800});
  const current=sampleTransition(prepare(from,to),40),next=prepare(current,to),saved=exportTransitionPlan(next);
  assert.ok(saved.from.cartesian.some(state=>state.reason==='sampled-concrete'));
  assert.ok(saved.from.polars.some(state=>state.reason==='sampled-concrete'));
  assert.ok(saved.kernels.cartesian);assert.ok(saved.kernels.polar);
  for(const time of[0,25,50,75,100])assert.deepEqual(sampleTransition(restore(next),time),sampleTransition(next,time));
  const unchanged=exportTransitionPlan(prepare(points(),points()));
  assert.equal(Object.hasOwn(unchanged.from,'cartesian'),false);assert.equal(Object.hasOwn(unchanged.from,'polars'),false);
});
