import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createGeometryBudget,snapshotGeometryJSON} from '../src/grammar/geo/input.js';
import {normalizeGeometry} from '../src/grammar/geo/geometry.js';
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
const {inspectAnimationEnvelopeValue,encodeAnimationEnvelope,decodeAnimationEnvelope}=await import(pathToFileURL(root+'/src/animation/envelopeCodec.js'));
const {encodeValue}=await import(pathToFileURL(root+'/src/persistence/codec.js'));
let prototype=execFileSync('git',['show',ref+':src/animation/columnCodec.js'],{encoding:'utf8'});
function replaceOnce(from,to){assert.equal(prototype.split(from).length,2);prototype=prototype.replace(from,to);}
// Design-only alternative: retain all existing quota calls, descend singleton
// compound arrays instead of hiding the original numeric arrays in literal.
replaceOnce('if (values.every(value=>equal(value,values[0]))) return {constant:values[0]};',
'if (values.every(value=>equal(value,values[0]))) return scalar(values[0]) ? {constant:values[0]} : {node:{array:values.map(lower)}};');
replaceOnce('} else result={literal:value};','} else result=value.length===1 && Object.hasOwn(value,0) && !scalar(value[0]) ? {array:[lower(value[0])]} : {literal:value};');
prototype=prototype.replace(/from "([.][^\"]+)"/g,(_,path)=>'from '+JSON.stringify(new URL(path,pathToFileURL(root+'/src/animation/columnCodec.js')).href));
const candidate=await import('data:text/javascript;base64,'+Buffer.from(prototype).toString('base64'));
function count(value){if(value===null||typeof value!=='object')return 1;return 1+Object.values(value).reduce((n,v)=>n+count(v),0);}
function work(value){if(value===null||typeof value!=='object')return 1+(typeof value==='string'?value.length:0);return 1+Object.entries(value).reduce((n,[k,v])=>n+k.length+work(v),0);}
function pack(vector){const bytes=Buffer.alloc(8*vector.length);vector.forEach((v,i)=>{assert(Number.isFinite(v));bytes.writeDoubleLE(v,i*8);});return {kind:'float64-le',length:vector.length,base64:bytes.toString('base64')};}
function unpack(value){const b=Buffer.from(value.base64,'base64');assert.equal(b.length,8*value.length);assert.equal(b.toString('base64'),value.base64);return Array.from({length:value.length},(_,i)=>{const v=b.readDoubleLE(i*8);assert(Number.isFinite(v));return v;});}
// Independent literal bit witnesses include -0 and subnormal/near-one values.
const literal=[0,-0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,-Number.MAX_VALUE,1,1+Number.EPSILON,1-Number.EPSILON/2,Math.PI];
unpack(pack(literal)).forEach((v,i)=>assert(Object.is(v,literal[i])));
const output={kind:'design-only candidate descent and binary-vector accounting; not product/public support',ref,sources,cases:[]};
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
  const deeper=candidate.prepareAnimationColumns(raw,scope),proof=candidate.validateAnimationColumns(deeper.compact,scope);
  assert.deepEqual(candidate.restoreAnimationColumns(deeper.compact,scope),raw);
  assert.equal(count(raw),deeper.metrics.logicalValues);
  assert.equal(count(deeper.compact),deeper.metrics.physicalValues);
  assert.equal(count(encodeValue(deeper.compact)),deeper.metrics.encodedValues);
  const packed={...deeper.compact,version:2,vectors:deeper.compact.vectors.map(v=>v.every(x=>typeof x==='number'&&Number.isFinite(x))?pack(v):v)};
  const binary=inspectAnimationEnvelopeValue(packed,false,true),binaryEnvelope=encodeAnimationEnvelope(packed);
  assert.deepEqual(decodeAnimationEnvelope(binaryEnvelope),packed);
  const restored={...packed,version:1,vectors:packed.vectors.map(v=>Array.isArray(v)?v:unpack(v))};
  const nodes=new Map(packed.root.object),candidateWire={kind:raw.kind,version:5,limits:{maxEndpointNodes:4,maxOutputNodes:2},kernels:{...raw.kernels,transition:5,columns:'animation-columns@2'},durationMs:raw.durationMs,easing:raw.easing,from:nodes.get('from'),to:nodes.get('to'),vectors:packed.vectors};
  const wireEnvelope=encodeAnimationEnvelope({plan:candidateWire,playback:{rate:1,repeat:0,reducedMotion:false}}),wireRoundtrip=decodeAnimationEnvelope(wireEnvelope);
  assert.deepEqual(wireRoundtrip.plan,candidateWire);
  const wireMetrics=inspectAnimationEnvelopeValue({plan:candidateWire,playback:{rate:1,repeat:0,reducedMotion:false}},false,true);
  const rawGroupStateBudget=createGeometryBudget();snapshotGeometryJSON(raw.to.geos,rawGroupStateBudget);
  const rawPresentationBudget=createGeometryBudget();snapshotGeometryJSON(raw.to.geos.groups[0].presentation,rawPresentationBudget);
  assert.deepEqual(candidate.restoreAnimationColumns(restored,scope),raw);
  const group=raw.to.geos.groups[0].presentation.geometry,budget=createGeometryBudget(),snapshot=snapshotGeometryJSON(group,budget);
  budget.count('features',snapshot.features.length);for(const f of snapshot.features)normalizeGeometry(f.geometry,snapshot.coordinateKind,budget);
  output.cases.push({n,kind,current:prepared.metrics,candidate:deeper.metrics,reader:{logicalValues:proof.logicalValues,descriptorVisits:proof.descriptorVisits,cellVisits:proof.cellVisits},originalPreparationWork:work(raw),groupBudget:budget.diagnostics(),groupStateBudget:rawGroupStateBudget.diagnostics(),presentationBudget:rawPresentationBudget.diagnostics(),wire:{...wireMetrics,envelopeBytes:Buffer.byteLength(wireEnvelope)},binary:{...binary,envelopeBytes:Buffer.byteLength(binaryEnvelope)},vectors:deeper.compact.vectors.map(v=>({length:v.length,first:v[0],last:v.at(-1),unique:new Set(v).size})),roundtrip:true});
 }
}
await writeFile('.artifacts/geo-a2-columns-candidates.json',JSON.stringify(output,null,2));
console.log(JSON.stringify(output.cases.map(({n,kind,candidate,reader,binary,wire,originalPreparationWork,groupBudget,groupStateBudget,presentationBudget})=>({n,kind,candidate,reader,binary,wire,originalPreparationWork,groupBudget,groupStateBudget,presentationBudget})),null,2));
