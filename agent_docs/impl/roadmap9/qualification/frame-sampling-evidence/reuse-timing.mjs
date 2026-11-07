import {registerHooks} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('./source/',import.meta.url),concrete=new URL('src/animation/concrete.js',root).href;
registerHooks({load(url,context,next){const result=next(url,context);if(url!==concrete)return result;
 let source=String(result.source).replace('import { cloneAndFreeze }','import { cloneAndFreeze, isOwned }');
 source=source.replace('export function interpolateNodeFrame(from,to,progress) {',`export function interpolateNodeFrame(from,to,progress) {
  if(globalThis.__frameReuse){
   const ordinary=(a,b)=>a.map((value,i)=>interpolateNumber(value,b[i],progress));
   const shape=value=>isOwned(value)&&Object.getOwnPropertyNames(value).length===value.length+1;
   const vector=(a,b)=>{if(Number.isFinite(progress)&&progress>=0&&progress<=1&&shape(a)&&shape(b)&&a.length===b.length){let same=true;for(let i=0;i<a.length;i++){if(!Object.hasOwn(a,i)||!Object.hasOwn(b,i)||!Number.isFinite(a[i])||!Object.is(a[i],b[i])){same=false;break;}}if(same)return b;}return ordinary(a,b);};
   return{offset:vector(from.offset,to.offset),clip:vector(from.clip,to.clip),clips:from.clips.length===0&&to.clips.length===0&&shape(from.clips)&&shape(to.clips)?to.clips:from.clips.map((clip,i)=>Array.isArray(clip)?vector(clip,to.clips[i]):clip)};
  }`);return{...result,source};}});
const{prepareNativeWorkload,nativeWorkloadInput}=await import(new URL('scripts/benchmarks/workloads.browser.js',root));
const rows=nativeWorkloadInput('points',1000),stage=prepareNativeWorkload('points',1000,rows).stages.find(s=>s.name==='full-frame').prepare();
const phases={baseline:[],reuse:[]};let expected;
for(let i=0;i<10;i++)for(const phase of['baseline','reuse']){globalThis.__frameReuse=phase==='reuse';const result=stage.run();stage.validate(result);expected??=result.frame;assert.deepEqual(result.frame,expected);}
// Alternating ABBA blocks give each mode the same position distribution. No counters/profiler.
for(let i=0;i<15;i++)for(const phase of['baseline','reuse','reuse','baseline']){globalThis.__frameReuse=phase==='reuse';const result=stage.run();phases[phase].push(result.metrics.fullFrameSampleMs);stage.validate(result);assert.deepEqual(result.frame,expected);}
const stats=values=>{const s=[...values].sort((a,b)=>a-b);return{n:s.length,median:s[Math.floor(s.length/2)],p95:s[Math.ceil(s.length*.95)-1],min:s[0],max:s.at(-1),mean:s.reduce((a,b)=>a+b,0)/s.length};};
const hash=s=>createHash('sha256').update(s).digest('hex');
const report={kind:'temporary conservative owned-vector reuse loader; timings diagnostic only, not browser/P95 acceptance',node:process.version,rows:1000,inputSHA256:hash(JSON.stringify(rows)),sourceAggregate:JSON.parse(await readFile(new URL('./source-inputs.json',import.meta.url))).aggregateSha256,warmupsEach:10,order:'15 ABBA blocks baseline/reuse/reuse/baseline',exactFullFrameEverySample:true,fullCoordinateOracleEverySample:true,frameSHA256:hash(JSON.stringify(expected)),phases,statistics:Object.fromEntries(Object.entries(phases).map(([k,v])=>[k,stats(v)])),prototypeOnly:true};
await writeFile(new URL('./reuse-timing.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.statistics));
