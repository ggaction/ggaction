import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {chart} from '../../src/index.js';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from '../../src/animation.js';
import {exportTransitionPlan} from '../../src/animation/planner.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
const results=[];let index=0;
for(const capacity of [undefined,{maxProjectedPoints:1000,maxPathCommands:1000},{maxProjectedPoints:200000,maxPathCommands:200000}]){
 const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates:[[-30,-5],[0,5],[30,-5]]}}]}}).createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'}).createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,...(capacity===undefined?{}:{capacity})});
 const to=from.editProjection({scalePx:200});
 for(const nodes of [false,true]){
  const options={durationMs:100,easing:'linear',...(nodes?{maxEndpointNodes:4,maxOutputNodes:2}:{})};
  try{const plan=planTransition({from,to,options}),text=serializeAnimation(plan),restored=deserializeAnimation(text).plan;
   await writeFile(`.artifacts/geo-animation-capacity/legacy-${index++}.json`,text); assert.equal(serializeAnimation(restored),text);for(const t of [0,25,50,100])assert.deepEqual(sampleTransition(restored,t),sampleTransition(plan,t));
   results.push({capacity:capacity??null,nodes,version:plan.version,bytes:Buffer.byteLength(text),sha256:sha(text),wireSHA256:sha(JSON.stringify(exportTransitionPlan(plan))),frames:[0,25,50,100].map(t=>({timeMs:t,sha256:sha(JSON.stringify(sampleTransition(plan,t)))})),tracks:plan.tracks,decisions:sampleTransition(plan,50).decisions});
  }catch(error){results.push({capacity:capacity??null,nodes,error:{name:error.name,message:error.message,stack:error.stack}});}
 }
}
await writeFile('.artifacts/geo-animation-capacity/legacy.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({tracks,...r})=>r),null,2));
