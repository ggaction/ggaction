import assert from 'node:assert/strict';
import { chart } from '../../../../../src/index.js';
import { planTransition, createAnimationPlayer, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../../../src/animation.js';
const p=chart().createCanvas({width:300,height:200}).createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:2}]}).createPointMark({id:'points',fill:'black'}).encodeX({field:'x',scale:{domain:[0,10],nice:false}}).encodeY({field:'y',scale:{domain:[0,10],nice:false}});
const q=p.reviseData({source:'rows',id:'next',values:[{id:'a',x:9,y:8}]}).editPointMark({fill:'white'});
const markers=[{id:'start',timeMs:0},{id:'middle',timeMs:50},{id:'end',timeMs:100}];
const plan=planTransition({from:p,to:q,options:{durationMs:100,easing:'linear',markers}});
function clock(){let t=0,id=0;const pending=new Map();return {now:()=>t,requestFrame:f=>(pending.set(++id,f),id),cancelFrame:i=>pending.delete(i),tick(v){t=v;const callbacks=[...pending.values()];pending.clear();for(const f of callbacks)f()},set(v){t=v},pending:()=>pending.size};}
const results=[];
function check(name,fn){try{fn();results.push({name,status:'passed'});}catch(e){results.push({name,status:'failed',message:e.message,stack:e.stack});}}
check('queued failed interrupt keeps active sampler and marker receipts',()=>{
 const c=clock(),events=[];let player,queued=false;
 player=createAnimationPlayer({plan,clock:c,render(){},onMarker(e){events.push(e.id);if(e.id==='middle'&&!queued){queued=true;player.interrupt({to:q,options:{durationMs:100,markers:[{id:'x',timeMs:0},{id:'x',timeMs:1}]}});}}});
 player.play();const promise=player.finished;assert.throws(()=>c.tick(50),/unique/);assert.equal(player.getState().status,'playing');assert.equal(player.finished,promise);assert.equal(c.pending(),1);c.tick(100);assert.deepEqual(events,['start','middle','end']);player.dispose();
});
check('queued controls during bulk callback respect FIFO without duplicate receipts',()=>{
 const c=clock(),events=[];let player,once=false;
 player=createAnimationPlayer({plan,clock:c,repeat:2,render(){},onMarker(e){events.push([e.id,e.iteration]);if(e.id==='middle'&&!once){once=true;player.pause();player.seek(25);}}});
 player.play();c.tick(250);assert.equal(player.getState().status,'paused');assert.equal(player.getState().timeMs,25);assert.equal(c.pending(),0);assert.equal(new Set(events.map(JSON.stringify)).size,events.length);assert.equal(events.length,8);player.dispose();
});
check('reverse within repeated run does not replay emitted IDs in the same iteration',()=>{
 const c=clock(),events=[],player=createAnimationPlayer({plan,clock:c,repeat:2,render(){},onMarker:e=>events.push([e.id,e.iteration])});
 player.play();c.tick(75);player.reverse();c.tick(125);player.reverse();c.tick(200);assert.deepEqual(events,[['start',0],['middle',0],['end',0]]);c.tick(201);assert.deepEqual(events.at(-1),['start',1]);player.dispose();
});
check('reentry queue overflow cancels exactly once and suppresses later markers',()=>{
 const c=clock(),events=[];let player;
 player=createAnimationPlayer({plan,clock:c,render(){},onMarker(e){events.push(e.id);if(e.id==='middle')for(let i=0;i<257;i++)player.seek(25);}});
 player.play();assert.throws(()=>c.tick(100),/queue/);assert.equal(player.getState().status,'cancelled');assert.equal(c.pending(),0);assert.deepEqual(events,['start','middle']);player.dispose();
});
check('owner geometry and opacity remain independent after current-frame rebase',()=>{
 const first=sampleTransition(plan,50).decisions.find(d=>d.itemKey);
 const custom=planTransition({from:p,to:q,options:{durationMs:100,easing:'linear',tracks:[{target:{ownerKey:first.ownerKey},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:0},{timeMs:50,value:.125},{timeMs:100,value:1}]},{target:{itemKey:first.itemKey},property:'opacity',kernel:'number',keyframes:[{timeMs:0,value:1},{timeMs:50,value:0},{timeMs:100,value:1}]}]}});
 const frame=sampleTransition(custom,50);assert.equal(frame.scene.nodes.find(n=>n.type==='circle').properties.opacity,0);
 const next=planTransition({from:frame,to:q,options:{durationMs:100,easing:'linear'}});assert.equal(sampleTransition(next,0),frame);
 const restored=deserializeAnimation(serializeAnimation(next)).plan;assert.deepEqual(sampleTransition(next,25),sampleTransition(restored,25));
});
console.log(JSON.stringify(results,null,2));if(results.some(r=>r.status==='failed'))process.exitCode=1;
