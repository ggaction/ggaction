import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../src/index.js';
import { chart as basic } from '../../../src/basic.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames } from '../../../src/animation.js';
import { decodeAnimationEnvelope, encodeAnimationEnvelope } from '../../../src/animation/envelopeCodec.js';

const points = (make = chart) => make().createCanvas({width:200,height:160,margin:20})
  .createData({id:'rows',keyField:'id',values:[{id:1,x:1,y:20},{id:'1',x:100,y:60}]})
  .createPointMark({id:'points',data:'rows'})
  .encodeX({field:'x',scale:{id:'x',type:'log',domain:[1,1000],nice:false}})
  .encodeY({field:'y',scale:{id:'y',domain:[0,100],nice:false}});
const prepare = (from, to = from, durationMs = 100) => planTransition({from,to,options:{durationMs,easing:'linear'}});

test('public offline plans preserve keyed meaning, canonical frames and playback defaults', () => {
  const from=points(),before=JSON.stringify(from);
  const to=from.reviseData({source:'rows',id:'next',values:[{id:'1',x:1000,y:40},{id:1,x:100,y:80}]});
  const plan=prepare(from,to),text=serializeAnimation(plan,{rate:-2,repeat:Infinity,reducedMotion:true});
  const restored=deserializeAnimation(text);
  assert.deepEqual(restored.playback,{rate:-2,repeat:Infinity,reducedMotion:true});
  assert.ok(Object.isFrozen(restored));assert.ok(Object.isFrozen(restored.playback));
  assert.match(text,/infinite/);
  assert.equal(serializeAnimation(restored.plan,restored.playback),text);
  for(const time of [0,25,50,75,100])assert.deepEqual(sampleTransition(restored.plan,time),sampleTransition(plan,time));
  assert.deepEqual(deserializeAnimation(serializeAnimation(plan)).playback,{rate:1,repeat:0,reducedMotion:false});
  const basicPlan=prepare(points(basic));
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(basicPlan)).plan,50),sampleTransition(basicPlan,50));
  assert.equal(JSON.stringify(from),before);
});

test('frame export preflights the entire explicit schedule and uses the exact fps grid', () => {
  const from=points(),plan=prepare(from,from,105),times=[0,50,105];
  const frames=exportAnimationFrames(plan,{timesMs:times});
  assert.deepEqual(frames.map(frame=>frame.timeMs),times);
  assert.ok(Object.isFrozen(frames));assert.ok(frames.every(Object.isFrozen));
  frames.forEach(({timeMs,...frame})=>assert.deepEqual(frame,sampleTransition(plan,timeMs)));
  assert.deepEqual(exportAnimationFrames(plan,{fps:20}).map(frame=>frame.timeMs),[0,50,100]);
  assert.deepEqual(exportAnimationFrames(prepare(from,from,0),{fps:60}).map(frame=>frame.timeMs),[0]);
  for(const options of [{timesMs:[0,106]},{timesMs:[]},{timesMs:[50,50]},{fps:60,timesMs:[0]},{}])
    assert.throws(()=>exportAnimationFrames(plan,options));
  assert.throws(()=>exportAnimationFrames({}, {timesMs:[0]}),/authentic/);
  assert.deepEqual(times,[0,50,105]);
});

test('public restore rejects corruption, unknown kernels, missing payloads and executable playback', () => {
  const from=points(),plan=prepare(from),text=serializeAnimation(plan),original=sampleTransition(plan,50);
  const payload=()=>structuredClone(decodeAnimationEnvelope(text));
  for(const mutate of [p=>delete p.playback,p=>delete p.plan,p=>p.extra=true,p=>p.plan.kernels.transition=99,
    p=>p.plan.kernels.position='future',p=>p.plan.from.graphicSpec.objects.points.items[0].properties.x=999,
    p=>p.playback.repeat='forever',p=>p.playback.rate=NaN]){
    const p=payload();mutate(p);assert.throws(()=>deserializeAnimation(encodeAnimationEnvelope(p)));
  }
  const envelope=JSON.parse(text);envelope.digest='0'.repeat(64);
  assert.throws(()=>deserializeAnimation(JSON.stringify(envelope)),/digest/);
  assert.throws(()=>serializeAnimation(plan,{clock(){}}),/Unknown/);
  assert.throws(()=>serializeAnimation(structuredClone(plan)),/authentic/);
  let reads=0;
  assert.throws(()=>serializeAnimation(plan,{get rate(){reads++;return 1;}}),/accessors/);
  assert.equal(reads,0);assert.deepEqual(sampleTransition(plan,50),original);
});

test('exported frames retain authentic meaning across rebasing and offline restoration', () => {
  const from=points(),to=from.reviseData({source:'rows',id:'next',values:[{id:1,x:100,y:80},{id:'1',x:1000,y:40}]});
  const original=prepare(from,to),[middle]=exportAnimationFrames(original,{timesMs:[50]});
  const rebased=prepare(middle,to,200),[start]=exportAnimationFrames(rebased,{timesMs:[0]});
  assert.equal(start.timeMs,0);assert.deepEqual(start.scene,middle.scene);
  assert.equal(sampleTransition(rebased,0),middle);
  const restored=deserializeAnimation(serializeAnimation(rebased)).plan;
  for(const time of [0,50,100,200])assert.deepEqual(sampleTransition(restored,time),sampleTransition(rebased,time));
  const reverse=prepare(from,middle),roundtrip=deserializeAnimation(serializeAnimation(reverse)).plan;
  assert.deepEqual(sampleTransition(roundtrip,100),middle);
  assert.throws(()=>prepare({...middle},to),/authentic|immutable/);
  assert.deepEqual(exportAnimationFrames(prepare(start,to),{timesMs:[0]})[0].scene,start.scene);
});

test('frame export rejects cumulative output work before materializing a first frame', () => {
  const from=chart().createCanvas({width:200,height:160,margin:20})
    .createData({id:'rows',values:Array.from({length:501},(_,i)=>({x:i,y:i}))})
    .createPointMark({id:'points'}).encodeX({field:'x'}).encodeY({field:'y'});
  const plan=prepare(from,from,10000);
  assert.throws(()=>exportAnimationFrames(plan,{fps:999}),/Animation frame export work/);
  assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);
});
