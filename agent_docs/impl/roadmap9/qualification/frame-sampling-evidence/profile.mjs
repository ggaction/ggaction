import assert from 'node:assert/strict';
import {Session} from 'node:inspector/promises';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {prepareNativeWorkload,nativeWorkloadInput,workloadThresholds} from './source/scripts/benchmarks/workloads.browser.js';
const n=1000,rows=nativeWorkloadInput('points',n),stage=prepareNativeWorkload('points',n,rows).stages.find(stage=>stage.name==='full-frame').prepare();
let witness,first;for(let i=0;i<5;i++){const r=stage.run();witness=stage.validate(r);first=r.frame;}
const session=new Session();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:250});await session.post('Profiler.start');
const timings=[];let last;for(let i=0;i<30;i++){last=stage.run();timings.push(last.metrics.fullFrameSampleMs);}
const{profile}=await session.post('Profiler.stop');session.disconnect();
assert.deepEqual(last.frame,first);stage.validate(last);
const nodes=new Map(profile.nodes.map(node=>[node.id,node])),parents=new Map();for(const node of profile.nodes)for(const id of node.children??[])parents.set(id,node.id);
const buckets={leaf:new Map(),nearestOwner:new Map(),coreCaller:new Map()};
const increment=(map,key,dt)=>map.set(key,(map.get(key)??0)+dt);
for(let i=0;i<profile.samples.length;i++){
 let node=nodes.get(profile.samples[i]);const delta=profile.timeDeltas[i];
 increment(buckets.leaf,JSON.stringify(node.callFrame),delta);
 let owner=node;while(owner&&!owner.callFrame.url.includes('/src/'))owner=nodes.get(parents.get(owner.id));
 if(owner)increment(buckets.nearestOwner,JSON.stringify(owner.callFrame),delta);
 if(owner?.callFrame.url.includes('/src/core/')){let caller=owner;while(caller&&(!caller.callFrame.url.includes('/src/')||caller.callFrame.url.includes('/src/core/')))caller=nodes.get(parents.get(caller.id));if(caller)increment(buckets.coreCaller,JSON.stringify(caller.callFrame),delta);}
}
const sorted=map=>[...map].sort((a,b)=>b[1]-a[1]).map(([key,microseconds])=>({frame:JSON.parse(key),microseconds}));
const hash=v=>createHash('sha256').update(v).digest('hex');
const report={kind:'unmodified-1k-same-plan-full-frame CPU attribution; timings are not browser/P95/SLO',node:process.version,inputRows:n,inputSHA256:hash(JSON.stringify(rows)),sourceAggregate:JSON.parse(await readFile(new URL('./source-inputs.json',import.meta.url))).aggregateSha256,warmups:5,measured:30,thresholds:workloadThresholds.points,timings,profileMicroseconds:profile.timeDeltas.reduce((a,b)=>a+b,0),witness,fullFrameDeepEqual:true,frameSHA256:hash(JSON.stringify(first)),...Object.fromEntries(Object.entries(buckets).map(([key,map])=>[key,sorted(map)]))};
await writeFile(new URL('./baseline.cpuprofile',import.meta.url),JSON.stringify(profile));await writeFile(new URL('./baseline.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({node:report.node,timings,frameSHA256:report.frameSHA256,topCoreCallers:report.coreCaller.slice(0,12),topOwners:report.nearestOwner.slice(0,10)}));
