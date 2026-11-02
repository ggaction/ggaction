import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {chart} from './geo-a2-legacy-d6/src/index.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from './geo-a2-legacy-d6/src/animation.js';
import {exportTransitionPlan,restoreTransitionPlan} from './geo-a2-legacy-d6/src/animation/planner.js';
const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const rows=Array.from({length:5},(_,i)=>({id:`p${i}`,x:i+1,y:i*10}));
const from=chart().createCanvas({width:300,height:200,margin:20}).createData({id:'rows',keyField:'id',values:rows}).createPointMark({id:'points',data:'rows'}).encodeX({field:'x',fieldType:'quantitative',scale:{id:'x',type:'log',domain:[1,100],nice:false}}).encodeY({field:'y',fieldType:'quantitative',scale:{id:'y',domain:[0,100],nice:false,zero:false}});
const to=from.reviseData({source:'rows',id:'revised',values:rows.map(row=>({...row,x:row.x*2,y:row.y+10}))});
const receipt={kind:'immutable d6dece68e old reader golden; future A2 reader compatibility remains to be implemented/tested',cases:[],errors:[]};
for(const limits of [{},{maxEndpointNodes:12,maxOutputNodes:6}]){
 const plan=planTransition({from,to,options:{durationMs:100,easing:'linear',...limits}}),text=serializeAnimation(plan),restored=deserializeAnimation(text),wire=exportTransitionPlan(plan);
 assert.equal(plan.version,Object.keys(limits).length?4:3);assert.equal(serializeAnimation(restored.plan,restored.playback),text);
 const hashes=[];for(const t of [0,25,50,100]){assert.deepEqual(sampleTransition(restored.plan,t),sampleTransition(plan,t));hashes.push({timeMs:t,frame:sha(sampleTransition(plan,t))});}
 await writeFile(`.artifacts/geo-a2-legacy-v${plan.version}.json`,text);
 const forged={...wire,version:5,kernels:{...wire.kernels,transition:5,columns:'animation-columns@2'}};let error;
 try{restoreTransitionPlan(forged);}catch(e){error={name:e.name,message:e.message};}assert(error);receipt.cases.push({version:plan.version,bytes:Buffer.byteLength(text),sha256:sha(text),frames:hashes,oldReaderRejectsVersion5:error});
}
for(const [name,input]of [['no-options',{from,to}],['own-undefined-duration',{from,to,options:{durationMs:undefined}}],['unknown-option',{from,to,options:{durationMs:100,numericEncoding:'float64'}}]]){
 let failure;try{planTransition(input);}catch(e){failure={name:e.name,message:e.message};}assert(failure);receipt.errors.push({case:name,...failure});
}
await writeFile('.artifacts/geo-a2-legacy-goldens.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
