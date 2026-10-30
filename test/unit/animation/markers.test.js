import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../src/index.js';
import { planTransition, createAnimationPlayer, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';

function virtualClock() {
  let time=0, sequence=0; const callbacks=new Map();
  return { now:()=>time, requestFrame(callback){callbacks.set(++sequence,callback);return sequence;},cancelFrame(id){callbacks.delete(id);},
    set(next){time=next;},tick(next){time=next;const pending=[...callbacks.values()];callbacks.clear();for(const callback of pending)callback();},pending:()=>callbacks.size };
}
function programs() {
  const from=chart().createCanvas({width:300,height:200,margin:0}).createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:2}]}).createPointMark({id:'points'})
    .encodeX({field:'x',scale:{domain:[0,10]}}).encodeY({field:'y',scale:{domain:[0,10]}});
  return {from,to:from.reviseData({source:'rows',id:'next',values:[{id:'a',x:9,y:8}]})};
}
const standard=[{id:'start',timeMs:0},{id:'middle',timeMs:50},{id:'end',timeMs:100}];
const plan=(markers=standard,durationMs=100)=>planTransition({...programs(),options:{durationMs,easing:'linear',markers}});

test('markers cross once after rendering the actual current frame and survive offline preparation', async()=>{
  const prepared=deserializeAnimation(serializeAnimation(plan())).plan,clock=virtualClock(),events=[],renders=[];let player;
  player=createAnimationPlayer({plan:prepared,clock,render:frame=>renders.push(frame),onMarker(event){assert.equal(event.frame,renders.at(-1));assert.equal(event.frame,player.getFrame());assert.ok(Object.isFrozen(event));events.push([event.id,event.iteration]);}});
  player.play();clock.tick(50);clock.tick(50);player.pause();player.play();clock.tick(100);
  assert.deepEqual(events,[['start',0],['middle',0],['end',0]]);assert.equal((await player.finished).reason,'completed');player.dispose();
});

test('seek is silent by default and explicit forward crossings retain iteration deduplication',()=>{
  const clock=virtualClock(),events=[],player=createAnimationPlayer({plan:plan(),clock,render(){},onMarker:event=>events.push(event.id)});
  player.seek(75);assert.deepEqual(events,[]);player.seek(0,{emit:true});assert.deepEqual(events,[]);
  player.seek(75,{emit:true});assert.deepEqual(events,['middle']);player.seek(0);player.seek(100,{emit:true});assert.deepEqual(events,['middle','end']);
  player.seek(0);player.play();assert.deepEqual(events,['middle','end','start']);clock.tick(100);assert.deepEqual(events,['middle','end','start']);
  const before=player.getState();for(const options of [{emit:undefined},{emit:1},{extra:true},null])assert.throws(()=>player.seek(20,options));
  let reads=0;assert.throws(()=>player.seek(20,{get emit(){reads++;return true;}}),/accessor/);assert.equal(reads,0);assert.deepEqual(player.getState(),before);player.dispose();
});

test('skipped repetitions deliver chronological crossings and retain exact boundary iterations',async()=>{
  const clock=virtualClock(),events=[],player=createAnimationPlayer({plan:plan(),clock,repeat:2,render(){},onMarker:event=>events.push([event.id,event.iteration])});
  player.play();clock.tick(250);assert.deepEqual(events,[['start',0],['middle',0],['end',0],['start',1],['middle',1],['end',1],['start',2],['middle',2]]);
  clock.tick(300);assert.deepEqual(events.at(-1),['end',2]);assert.equal(events.length,9);assert.equal((await player.finished).iteration,2);player.dispose();
});

test('reverse playback emits no reverse crossings while an explicit forward seek may emit',()=>{
  const clock=virtualClock(),events=[],player=createAnimationPlayer({plan:plan(),clock,rate:-1,render(){},onMarker:event=>events.push(event.id)});
  player.play();clock.tick(25);assert.deepEqual(events,[]);player.pause();player.seek(100,{emit:true});assert.deepEqual(events,['end']);
  player.seek(0);player.setRate(1).play();assert.deepEqual(events,['end','start']);clock.tick(125);assert.deepEqual(events,['end','start','middle']);player.dispose();
});

test('reduced motion, rate zero and zero duration keep bounded marker and commit lifetimes',async()=>{
  const clock=virtualClock(),events=[],commits=[],player=createAnimationPlayer({plan:plan(),clock,repeat:2,reducedMotion:true,render(){},commit:frame=>commits.push(frame),onMarker:event=>events.push([event.id,event.iteration])});
  player.play();assert.equal(events.length,9);assert.equal(commits.length,1);assert.equal(clock.pending(),0);assert.equal((await player.finished).reason,'completed');player.dispose();
  const pausedEvents=[],paused=createAnimationPlayer({plan:plan(),clock,rate:0,render(){},onMarker:event=>pausedEvents.push(event.id)});
  paused.play();assert.deepEqual(pausedEvents,[]);paused.setRate(1).play();assert.deepEqual(pausedEvents,['start']);paused.dispose();
  const instantEvents=[],instant=createAnimationPlayer({plan:plan([{id:'instant',timeMs:0}],0),clock,render(){},onMarker:event=>instantEvents.push(event.id)});
  instant.play();assert.deepEqual(instantEvents,['instant']);assert.equal((await instant.finished).reason,'completed');instant.dispose();
});

test('interruption flushes the captured old crossing then activates only the replacement schedule',async()=>{
  const clock=virtualClock(),events=[],prepared=plan([{id:'old-start',timeMs:0},{id:'old-quarter',timeMs:25},{id:'old-late',timeMs:75}]);let player;
  player=createAnimationPlayer({plan:prepared,clock,render(){},onMarker(event){assert.equal(event.frame,player.getFrame());events.push(event.id);}});
  player.play();const old=player.finished;clock.set(50);
  player.interrupt({to:programs().from,options:{durationMs:100,easing:'linear',markers:[{id:'new-start',timeMs:0},{id:'new-middle',timeMs:50}]}});
  assert.deepEqual(events,['old-start','old-quarter','new-start']);assert.equal((await old).reason,'interrupted');clock.tick(100);assert.deepEqual(events,['old-start','old-quarter','new-start','new-middle']);
  player.pause();player.interrupt({to:programs().to,options:{durationMs:100,easing:'linear'}});player.play();clock.tick(200);assert.equal(events.length,4);player.dispose();
});

test('a rejected replacement preserves active marker state and pending clock ownership',()=>{
  const clock=virtualClock(),events=[],prepared=plan(),player=createAnimationPlayer({plan:prepared,clock,render(){},onMarker:event=>events.push(event.id)});
  player.play();clock.set(25);const before=player.getFrame(),settlement=player.finished;
  assert.throws(()=>player.interrupt({to:programs().to,options:{durationMs:100,markers:[{id:'duplicate',timeMs:0},{id:'duplicate',timeMs:1}]}}),/unique/);
  assert.equal(player.getFrame(),before);assert.equal(player.finished,settlement);assert.equal(clock.pending(),1);clock.tick(100);assert.deepEqual(events,['start','middle','end']);player.dispose();
});

test('marker reentry queues controls and disposal cancels remaining callbacks before commit',async()=>{
  const clock=virtualClock(),events=[];let player,commits=0;
  player=createAnimationPlayer({plan:plan(),clock,render(){},commit(){commits++;},onMarker(event){events.push(event.id);if(event.id==='middle'){player.seek(75);player.dispose();}}});
  player.play();const terminal=player.finished;clock.tick(100);assert.deepEqual(events,['start','middle']);assert.equal(commits,0);assert.equal(clock.pending(),0);assert.equal((await terminal).reason,'disposed');assert.equal(player.getFrame(),undefined);
  player.dispose();assert.throws(()=>player.play(),/disposed/);
});

test('callback failure and excessive skipped markers settle cancellation without partial bulk delivery',async()=>{
  const clock=virtualClock();let fail=true;
  const player=createAnimationPlayer({plan:plan(),clock,render(){},onMarker(event){if(event.id==='middle'&&fail){fail=false;throw new Error('marker failure');}}});
  player.play();const terminal=player.finished;assert.throws(()=>clock.tick(50),/marker failure/);assert.equal((await terminal).reason,'cancelled');assert.equal(clock.pending(),0);player.play();clock.tick(150);assert.equal((await player.finished).reason,'completed');player.dispose();
  const events=[],overflow=createAnimationPlayer({plan:plan(),clock,repeat:Infinity,render(){},onMarker:event=>events.push(event.id)});
  overflow.play();const pending=overflow.finished;assert.throws(()=>clock.tick(100000150),/10000/);assert.deepEqual(events,['start']);assert.equal((await pending).reason,'cancelled');assert.equal(clock.pending(),0);overflow.dispose();
  assert.throws(()=>createAnimationPlayer({plan:plan(),clock,render(){},onMarker:undefined}),/function/);
});

test('an ordinary plan and an explicitly empty marker schedule do not create marker events',async()=>{
  for(const prepared of [planTransition({...programs(),options:{durationMs:100}}),plan([])]){
    const clock=virtualClock(),events=[],player=createAnimationPlayer({plan:prepared,clock,render(){},onMarker:event=>events.push(event)});
    player.play();clock.tick(100);assert.deepEqual(events,[]);assert.equal((await player.finished).reason,'completed');player.dispose();
  }
});

test('a reversed repetition resets iteration ownership before forward playback resumes',()=>{
  const clock=virtualClock(),events=[],player=createAnimationPlayer({plan:plan(),clock,rate:-1,repeat:1,render(){},onMarker:event=>events.push([event.id,event.iteration])});
  player.play();clock.tick(150);assert.equal(player.getState().iteration,1);assert.deepEqual(events,[]);
  player.setRate(1);clock.tick(200);assert.deepEqual(events,[['end',1]]);player.dispose();
});

test('terminal backward or stationary seeks preserve direction when they create a new run',async()=>{
  const clock=virtualClock(),events=[],player=createAnimationPlayer({plan:plan(),clock,render(){},onMarker:event=>events.push(event.id)});
  player.play();clock.tick(100);assert.equal((await player.finished).reason,'completed');const before=[...events];
  player.seek(75,{emit:true});assert.deepEqual(events,before);player.cancel();player.seek(75,{emit:true});assert.deepEqual(events,before);
  player.seek(0);player.play();assert.deepEqual(events,[...before,'start']);player.dispose();
});

test('returning to zero emits a not-yet-emitted zero marker without duplicating it',()=>{
  const clock=virtualClock(),events=[],player=createAnimationPlayer({plan:plan(),clock,render(){},onMarker:event=>events.push(event.id)});
  player.seek(75).play().pause().seek(0).play();assert.deepEqual(events,['start']);player.pause().play();assert.deepEqual(events,['start']);player.dispose();
});
