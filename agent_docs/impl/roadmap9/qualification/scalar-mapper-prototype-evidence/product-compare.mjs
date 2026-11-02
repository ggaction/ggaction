import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync,execFileSync} from 'node:child_process';
import {registerHooks} from 'node:module';
import {createHash} from 'node:crypto';
import {serialize,deserialize} from 'node:v8';
const variant=process.env.POSITION_RECORD_FREEZE==='1'?'scalar-record':'scalar';
const scaleType=process.env.SCALAR_TYPE??'linear';
const targetDomain=scaleType==='log'?[1,3]:[0,2];
const hash=v=>createHash('sha256').update(v).digest('hex');
if(process.argv[2]==='child'){
 await import('./loader.mjs');
 const has=WeakSet.prototype.has;WeakSet.prototype.has=function(value){if(globalThis.__counts)globalThis.__counts.weakHas++;return Reflect.apply(has,this,[value]);};
 const add=WeakSet.prototype.add;
 WeakSet.prototype.add=function(value){if(globalThis.__counts){globalThis.__counts.weakAdds++;const stack=new Error().stack.split('\n').find(line=>line.includes('/src/')&&!line.includes('/core/immutable.js'));const owner=(stack??'other').replace(/:\d+:\d+\)?$/,'');globalThis.__counts.weakSources[owner]=(globalThis.__counts.weakSources[owner]??0)+1;}return Reflect.apply(add,this,[value]);};
 const{deserializeProgram}=await import('../../../../../src/persistence.js'),{planTransition,sampleTransition,serializeAnimation,deserializeAnimation,exportAnimationFrames}=await import('../../../../../src/animation.js');
 const{animationFrameProvenance}=await import('../../../../../src/animation/frameProvenance.js');
 let saved='';for await(const chunk of process.stdin)saved+=chunk;const payload=JSON.parse(saved),from=deserializeProgram(payload.point),to=from.editScale({id:'x',domain:targetDomain,nice:false}),results={};
 const options={durationMs:100,easing:'linear'},times=[0,25,37,50,75,100];
 const meaning=frame=>({frame,positions:animationFrameProvenance(frame).positions});
 for(const version of[3,4]){
  const opts={...options,...(version===4?{maxEndpointNodes:3000,maxOutputNodes:2000}:{})};
  globalThis.__work={};const plan=planTransition({from,to,options:opts}),work=globalThis.__work;delete globalThis.__work;
  const native=times.map(t=>meaning(sampleTransition(plan,t))),text=serializeAnimation(plan),offline=deserializeAnimation(text).plan;
  const replay=times.map(t=>meaning(sampleTransition(offline,t)));assert.deepEqual(replay,native);assert.equal(serializeAnimation(offline),text);
  const batch=exportAnimationFrames(plan,{timesMs:[0,25,50,75,100]});
  const sampled=sampleTransition(plan,37);globalThis.__work={};const rebase=planTransition({from:sampled,to,options:opts}),rebaseWork=globalThis.__work;delete globalThis.__work;
  const rebased=meaning(sampleTransition(rebase,50)),rebaseText=serializeAnimation(rebase),restoredRebase=deserializeAnimation(rebaseText).plan;
  assert.equal(serializeAnimation(restoredRebase),rebaseText);assert.deepEqual(meaning(sampleTransition(restoredRebase,50)),rebased);
  globalThis.__counts={clones:0,ownedAdds:0,weakAdds:0,weakHas:0,weakSources:{}};sampleTransition(plan,50);const counts=globalThis.__counts;delete globalThis.__counts;
  const decision=sampled.decisions.find(d=>d.kernel==='cartesian-point'),fill=sampled.scene.nodes[decision.targetIndex].properties.fill;
  const timelinePlan=planTransition({from,to,options:{...opts,tracks:[{target:{ownerKey:decision.ownerKey},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:0},{timeMs:50,value:.25},{timeMs:100,value:1}]},{target:{itemKey:decision.itemKey},property:'fill',kernel:'color',keyframes:[{timeMs:0,value:fill},{timeMs:50,value:'red'},{timeMs:100,value:fill}]}]}});
  const timeline=times.map(t=>meaning(sampleTransition(timelinePlan,t))),timelineText=serializeAnimation(timelinePlan),timelineOffline=deserializeAnimation(timelineText).plan;
  assert.deepEqual(times.map(t=>meaning(sampleTransition(timelineOffline,t))),timeline);
  const timelineRebase=planTransition({from:sampleTransition(timelinePlan,37),to,options:opts}),timelineRebaseText=serializeAnimation(timelineRebase),timelineRebaseFrames=times.map(t=>meaning(sampleTransition(timelineRebase,t)));
  assert.deepEqual(times.map(t=>meaning(sampleTransition(deserializeAnimation(timelineRebaseText).plan,t))),timelineRebaseFrames);
  const fallbackPlan=planTransition({from,to:to.editPointMark({shape:'square'}),options:opts}),fallback=times.map(t=>meaning(sampleTransition(fallbackPlan,t)));
  const mixedPlan=planTransition({from:deserializeProgram(payload.mixedFrom),to:deserializeProgram(payload.mixedTo),options:opts}),mixed=times.map(t=>meaning(sampleTransition(mixedPlan,t))),mixedOffline=deserializeAnimation(serializeAnimation(mixedPlan)).plan;
  assert.deepEqual(times.map(t=>meaning(sampleTransition(mixedOffline,t))),mixed);
  results[version]={mixed,native,batch,rebased,text,rebaseText,work,rebaseWork,counts,timeline,timelineText,timelineRebaseFrames,timelineRebaseText,fallback};
 }
 await writeFile(new URL('../../../../../.artifacts/scalar-mapper-prototype/case-'+process.argv[3]+'.v8',import.meta.url),serialize(results));process.stdout.write('written');
}else{
 await mkdir(new URL('../../../../../.artifacts/scalar-mapper-prototype/',import.meta.url),{recursive:true});
 const{chart,hconcat}=await import('../../../../../src/index.js'),{serializeProgram}=await import('../../../../../src/persistence.js'),{nativeWorkloadInput}=await import('../../../../../scripts/benchmarks/workloads.browser.js');
 const rows=nativeWorkloadInput('points',1000).map(row=>scaleType==='log'?{...row,x:row.x+1}:row);const program=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createData({id:'rows',keyField:'id',values:rows}).createPointMark({id:'points',maxItems:100000}).encodeX({field:'x',...(scaleType==='time'?{fieldType:'temporal'}:{}),scale:{id:'x',type:scaleType,domain:scaleType==='log'?[1,2]:[0,1],nice:false,...(scaleType==='pow'?{exponent:2}:{}),...(scaleType==='symlog'?{constant:.1}:{})}}).encodeY({field:'y',scale:{id:'y',domain:[0,1],nice:false}}),pointSaved=serializeProgram(program);
 const geo=chart().createCanvas({width:300,height:200,margin:0}).createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:'a',properties:{name:'Alpha'},geometry:{type:'Point',coordinates:[40,50]}}]}}).createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places-mark'}).createMarkLabels({field:'name'});
 const compose=(point,g)=>hconcat({id:'mixed',programs:[{id:'point',program:point},{id:'geo',program:g}]}),saved=JSON.stringify({point:pointSaved,mixedFrom:serializeProgram(compose(program,geo)),mixedTo:serializeProgram(compose(program.editScale({id:'x',domain:targetDomain,nice:false}),geo.editProjection({scalePx:2})))});
 const runs=[];for(const phase of['before','after']){const result=spawnSync(process.execPath,[new URL(import.meta.url).pathname,'child',phase],{env:{...process.env,SCALAR_PROTOTYPE:phase==='after'?'1':'0'},input:saved,encoding:'utf8',maxBuffer:64*1024*1024});assert.equal(result.status,0,JSON.stringify({stderr:result.stderr,error:String(result.error),signal:result.signal}));runs.push(deserialize(await readFile(new URL('../../../../../.artifacts/scalar-mapper-prototype/case-'+phase+'.v8',import.meta.url))));}
 const comparisons={};for(const version of[3,4]){const[a,b]=runs.map(r=>r[version]);assert.deepEqual(b.native,a.native);assert.deepEqual(b.mixed,a.mixed);assert.deepEqual(b.batch,a.batch);assert.deepEqual(b.rebased,a.rebased);assert.deepEqual(b.timeline,a.timeline);assert.deepEqual(b.timelineRebaseFrames,a.timelineRebaseFrames);assert.deepEqual(b.fallback,a.fallback);assert.equal(b.timelineText,a.timelineText);assert.equal(b.timelineRebaseText,a.timelineRebaseText);assert.equal(b.text,a.text);assert.deepEqual(b.work,a.work);assert.deepEqual(b.rebaseWork,a.rebaseWork);assert.equal(b.rebaseText,a.rebaseText);
  // Literal independent native coordinate oracle for every row and every time.
  if(scaleType==='linear') for(const [index,time]of[0,25,37,50,75,100].entries()){const circles=b.native[index].frame.scene.nodes.filter(n=>n.type==='circle');assert.equal(circles.length,1000);for(let i=0;i<rows.length;i++){assert.ok(Math.abs(circles[i].properties.x-(20+360*rows[i].x/(1+time/100)))<1e-10);assert.ok(Math.abs(circles[i].properties.y-(380-360*rows[i].y))<1e-10);}}
  comparisons[version]={nativeBytes:[Buffer.byteLength(a.text),Buffer.byteLength(b.text)],nativeSHA256:[hash(a.text),hash(b.text)],rebaseBytes:[Buffer.byteLength(a.rebaseText),Buffer.byteLength(b.rebaseText)],rebaseSHA256:[hash(a.rebaseText),hash(b.rebaseText)],counts:[a.counts,b.counts],work:a.work,rebaseWork:a.rebaseWork,mixedGeoFullFrameAndMeaningEqual:true,fullNativeOfflineMeaningBatchRebaseEqual:true,timelineAndTimelineRebaseFullMeaningEqual:true,fallbackFullMeaningEqual:true,restoreReserializeExact:true};}
 const source=Object.fromEntries(['src/animation/sample.js','src/grammar/animation/positions.js','src/grammar/scales/mapping.js','src/grammar/scales/continuous.js','src/grammar/scales/transformed.js'].map(f=>[f,hash(execFileSync('cat',[f]))]));
 const report={kind:'actual product b3da444d7 versus evidence-only prepared scalar loader; counters are diagnostic, not SLO',node:process.version,variant,scaleType,rows:1000,inputSHA256:hash(JSON.stringify(rows)),savedInputSHA256:hash(saved),source,comparisons};await writeFile(new URL('./product-compare-'+variant+'-'+scaleType+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
