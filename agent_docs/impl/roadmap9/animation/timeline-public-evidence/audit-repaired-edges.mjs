import assert from 'node:assert/strict';
import { chart } from '../../../../../src/index.js';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames, createAnimationPlayer } from '../../../../../src/animation.js';
import { animationFrameProvenance } from '../../../../../src/animation/frameProvenance.js';
const from=chart().createCanvas({width:300,height:200,margin:0}).createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:2}]}).createPointMark({id:'points',fill:'black'}).encodeX({field:'x',scale:{domain:[0,10],nice:false}}).encodeY({field:'y',scale:{domain:[0,10],nice:false}});
const to=from.reviseData({source:'rows',id:'next',values:[{id:'a',x:9,y:8}]}).editPointMark({fill:'white'});
const prep=(a,b,options)=>planTransition({from:a,to:b,options});
const itemKey=sampleTransition(prep(from,to,{durationMs:100}),50).decisions.find(d=>d.itemKey).itemKey;
const results=[];
for(const [name,durationMs,timeMs] of [['late',100,99.9999],['early',1e200,1e-200]]){
 const plan=prep(from,to,{durationMs,tracks:[{target:{itemKey},property:'fill',kernel:'color',keyframes:[{timeMs:0,value:'black'},{timeMs,value:'red'},{timeMs:durationMs,value:'white'}]}]});
 const frame=sampleTransition(plan,timeMs);assert.ok(frame.progress>0&&frame.progress<1);assert.ok(frame.decisions.length>0);assert.equal(frame.scene.nodes.find(n=>n.type==='circle').properties.fill,'rgba(255,0,0,1)');
 assert.notEqual(frame.graphicSpec,from.graphicSpec);assert.notEqual(frame.graphicSpec,to.graphicSpec);
 const exported=exportAnimationFrames(plan,{timesMs:[0,timeMs,durationMs]});assert.deepEqual(exported[1].scene,frame.scene);assert.equal(exported[1].timeMs,timeMs);assert.equal(animationFrameProvenance(exported[1]).timeMs,timeMs);
 for(const [a,b] of [[frame,to],[from,frame],[exported[1],to],[from,exported[1]]]){
  const next=prep(a,b,{durationMs:100});const restored=deserializeAnimation(serializeAnimation(next)).plan;
  for(const t of [0,25,50,75,100])assert.deepEqual(sampleTransition(restored,t),sampleTransition(next,t));
 }
 assert.equal(sampleTransition(plan,-1).graphicSpec,from.graphicSpec);assert.equal(sampleTransition(plan,durationMs).graphicSpec,to.graphicSpec);
 results.push({name,progress:frame.progress,transportAndRebase:'passed'});
}
function clock(){let t=0,id=0;const pending=new Map();return {now:()=>t,requestFrame:f=>(pending.set(++id,f),id),cancelFrame:i=>pending.delete(i),tick(v){t=v;const callbacks=[...pending.values()];pending.clear();for(const f of callbacks)f()},pending:()=>pending.size};}
const markerPlan=prep(from,to,{durationMs:100,easing:'linear',markers:[{id:'zero',timeMs:0},{id:'fifty',timeMs:50},{id:'eighty',timeMs:80},{id:'end',timeMs:100}]});
for(const terminal of ['completed','cancelled']){
 const c=clock(),events=[],p=createAnimationPlayer({plan:markerPlan,clock:c,repeat:terminal==='completed'?2:0,render(){},onMarker:e=>events.push([e.id,e.iteration])});
 p.play();c.tick(terminal==='completed'?300:75);if(terminal==='cancelled')p.cancel();const before=events.length;p.seek(60,{emit:true});assert.equal(events.length,before);p.seek(90,{emit:true});assert.deepEqual(events.at(-1),['eighty',0]);const after=events.length;p.seek(90,{emit:true});assert.equal(events.length,after);p.seek(0).play().pause().play();assert.deepEqual(events.slice(after),[['zero',0]]);p.dispose();results.push({terminal,backwardAndEqualSeek:'silent',forwardAndZeroDedup:'passed'});
}
console.log(JSON.stringify(results,null,2));
