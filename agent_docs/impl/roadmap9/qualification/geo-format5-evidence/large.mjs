import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chart} from './extracted/package/src/index.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames} from './extracted/package/src/animation.js';
import {sampleTransitionWithBudget} from './extracted/package/src/animation/sample.js';
import {transitionResources,transitionColumnMetrics} from './extracted/package/src/animation/planner.js';
import {animationResourceAccounting} from './extracted/package/src/animation/resources.js';
const sha=x=>createHash('sha256').update(x).digest('hex'),archive=JSON.parse(await readFile('.artifacts/format5-resume/archive.json','utf8'));
assert.equal(sha(await readFile(archive.file)),archive.sha256);
const out='.artifacts/format5-resume/large.json',record={node:process.version,pid:process.pid,archive,kind:'original functional diagnostic, no P95 claim',cases:[]};
const save=()=>writeFile(out,JSON.stringify(record,null,2));await save();console.log(JSON.stringify({pid:process.pid,start:true}));
function verify(frame,count,scale){const nodes=frame.scene.nodes.filter(n=>n.type==='path');assert.equal(nodes.length,1);const commands=nodes[0].properties.commands;assert.equal(commands.length,2*count-1);assert.equal(nodes[0].properties.maxCommands,200000);let maxError=0;
 for(const[i,c]of commands.entries()){const lon=-30+60*(i/2)/(count-1),lat=i%2?0:((i/2)%2?5:-5);assert.equal(c.op,i?'L':'M');maxError=Math.max(maxError,Math.abs(c.x-(200+scale*lon*Math.PI/180)),Math.abs(c.y-(200-scale*lat*Math.PI/180)));}assert.ok(maxError<1e-9);return{commands:commands.length,maxError,hash:sha(JSON.stringify(commands))};}
for(const count of[1000,10000,100000]){
 const row={count,start:new Date().toISOString(),phases:[]};record.cases.push(row);await save();
 try{
  const coordinates=Array.from({length:count},(_,i)=>[-30+60*i/(count-1),(i%2?1:-1)*5]);
  const values={type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates}}]};row.rawHash=sha(JSON.stringify(values));
  const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values})
   .createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'})
   .createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
  const to=from.editProjection({scalePx:200}),options={durationMs:100,easing:'linear',formatVersion:5};
  const plan=planTransition({from,to,options});row.resources=animationResourceAccounting(transitionResources(plan));row.columns=transitionColumnMetrics(plan);row.phases.push({id:'prepare',version:plan.version});await save();
  assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
  for(const t of[0,50,100])row.phases.push({id:'native-coordinate',t,...verify(sampleTransition(plan,t),count,100*Math.pow(2,t/100))});
  let work=0;sampleTransitionWithBudget(plan,50,amount=>work+=amount);row.singleSampleWork=work;await save();
  let text=serializeAnimation(plan);row.nativeBytes=Buffer.byteLength(text);await save();
  {const offline=deserializeAnimation(text).plan;assert.equal(animationResourceAccounting(transitionResources(offline)).native,false);assert.equal(serializeAnimation(offline),text);for(const t of[0,50,100])assert.deepEqual(sampleTransition(offline,t),sampleTransition(plan,t));row.phases.push({id:'offline-native',wholeFrames:true});}text=undefined;globalThis.gc?.();await save();
  {const current=sampleTransition(plan,50),rebase=planTransition({from:current,to,options});assert.equal(sampleTransition(rebase,0),current);row.phases.push({id:'rebase-coordinates',...verify(sampleTransition(rebase,50),count,100*Math.pow(2,.75))});let wire=serializeAnimation(rebase);row.rebaseBytes=Buffer.byteLength(wire);const offline=deserializeAnimation(wire).plan;assert.equal(serializeAnimation(offline),wire);for(const t of[0,50,100])assert.deepEqual(sampleTransition(offline,t),sampleTransition(rebase,t));row.phases.push({id:'offline-rebase',wholeFrames:true});}globalThis.gc?.();await save();
  {const timesMs=[20,40,60,80],frames=exportAnimationFrames(plan,{timesMs});assert.equal(frames.length,4);for(let i=0;i<4;i++)verify(frames[i],count,100*Math.pow(2,timesMs[i]/100));row.phases.push({id:'batch-four',frames:4});}globalThis.gc?.();
  if(count===100000){assert.throws(()=>exportAnimationFrames(plan,{timesMs:[10,30,50,70,90]}),/Animation sampled frame export work/);row.phases.push({id:'batch-five-original-limit',rejected:true});}
  assert.equal(sha(JSON.stringify(values)),row.rawHash);row.status='passed';
 }catch(error){row.status='failed';row.error=error.stack;process.exitCode=1;}
 await save();console.log(JSON.stringify(row));globalThis.gc?.();if(process.exitCode)break;
}
