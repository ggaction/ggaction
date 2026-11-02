import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {chart} from '../src/index.js';
import {planTransition,exportTransitionPlan} from '../src/animation/planner.js';
import {sampleTransition} from '../src/animation/sample.js';
const ref='d6dece68e', root='/Users/hyeonjeon/.codex/worktrees/roadmap9-integration/ggactionnewbrand';
const sha=b=>createHash('sha256').update(b).digest('hex');
const old=JSON.parse(execFileSync('git',['show',ref+':agent_docs/impl/roadmap9/qualification/animation-v4-evidence/product-100000-phased.json'],{encoding:'utf8'})).sourceSHA256;
const sources={};for(const file of Object.keys(old)){const blob=execFileSync('git',['show',ref+':'+file]);sources[file]={expected:sha(blob),pointReceipt:old[file],actual:sha(await readFile(root+'/'+file))};}
for(const file of ['src/animation/columnCodec.js','src/animation/resources.js','src/animation/envelopeCodec.js'])assert.equal(sources[file].actual,sources[file].expected);
const {prepareAnimationColumns,restoreAnimationColumns}=await import(pathToFileURL(root+'/src/animation/columnCodec.js'));
const {createOfflineResourceScope}=await import(pathToFileURL(root+'/src/animation/resources.js'));
const output={kind:'read-only small actual v3 endpoint -> proposed capacity fields -> exact current v4 column owner; not public A2 support',ref,sources,cases:[]};
for(const n of [1000,1500,2000]){
 const coordinates=Array.from({length:n},(_,i)=>[-30+60*i/(n-1),(i%2?1:-1)*5]);
 const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates}}]}}).createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'}).createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2});
 const to=from.editProjection({scalePx:200}),plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),frame=sampleTransition(plan,50),rebase=planTransition({from:frame,to,options:{durationMs:100,easing:'linear'}});
 assert.equal(from.graphicSpec.objects.coast.items[0].properties.commands.length,2*n-1);
 for(const [kind,value]of [['native',plan],['sampled',rebase]]){
  const raw=structuredClone(exportTransitionPlan(value));
  // Candidate data only. No product validator accepts this new manifest yet.
  raw.version=4;raw.kernels.transition=4;raw.kernels.geo='native-geo-camera@2';
  for(const side of ['from','to']){
   for(const group of raw[side].geos.groups)group.presentation.geometry.binding.capacity={maxProjectedPoints:200000,maxPathCommands:200000};
   const graphics=raw[side].graphicSpec?Object.values(raw[side].graphicSpec.objects).flatMap(o=>o.items??[o]):raw[side].scene.nodes;
   for(const g of graphics)if(g.type==='path'&&g.properties.commands)g.properties.maxCommands=200000;
  }
  const scope=createOfflineResourceScope({maxEndpointNodes:4,maxOutputNodes:2});
  const prepared=prepareAnimationColumns(raw,scope);assert.deepEqual(restoreAnimationColumns(prepared.compact,scope),raw);
  output.cases.push({n,kind,metrics:prepared.metrics,vectors:prepared.compact.vectors.map(v=>({length:v.length,first:v[0],last:v.at(-1),unique:new Set(v).size}))});
 }
}
await writeFile('.artifacts/geo-a2-columns-small.json',JSON.stringify(output,null,2));
console.log(JSON.stringify(output.cases.map(({n,kind,metrics:m,vectors})=>({n,kind,physical:m.physicalValues,encoded:m.encodedValues,logical:m.logicalValues,descriptor:m.descriptorVisits,cells:m.cellVisits,intern:m.interningWork,vectors:vectors.map(v=>[v.length,v.unique])})),null,2));
