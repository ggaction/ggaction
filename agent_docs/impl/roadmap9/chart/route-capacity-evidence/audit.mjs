import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { forceEdgeMetric, forceCompatibility } from '../../../../../src/grammar/graph/routes/compatibility.js';
import { forceRouteSchedule } from '../../../../../src/grammar/graph/routes/forceDirected.js';
import { resampleRoute } from '../../../../../src/grammar/graph/routes/polyline.js';

// Exact original routes.browser.js non-HEB input expressions, followed by the
// existing coordinateFrame long-axis normalization. No solver or guard bypass.
function input(n) {
  const raw = Array.from({length:n},(_,id)=>({x:200+150*Math.cos(2*Math.PI*id/n),y:200+150*Math.sin(2*Math.PI*id/n)}));
  let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
  for (const p of raw) {left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);}
  const scale=Math.max(right-left,bottom-top);
  const p=raw.map(({x,y})=>({x:(x-left)/scale,y:(y-top)/scale}));
  return p.map((a,i)=>[a,p[(i+Math.floor(n/3))%n]]);
}
// Independent scalar translation of the documented factors; does not import
// the production metric/compatibility helpers or use a cached factor result.
function oracle([a,b],[c,d]) {
  const ax=b.x-a.x,ay=b.y-a.y,bx=d.x-c.x,by=d.y-c.y;
  const al=Math.hypot(ax,ay),bl=Math.hypot(bx,by),ux=ax/al,uy=ay/al,vx=bx/bl,vy=by/bl;
  const am={x:a.x+ax/2,y:a.y+ay/2},bm={x:c.x+bx/2,y:c.y+by/2};
  const visibility=(s,t,u,v,l,x,y)=>{
    const start=(u.x-s.x)*x+(u.y-s.y)*y,end=(v.x-s.x)*x+(v.y-s.y)*y,span=Math.abs(end-start);
    return span<=1e-9?0:Math.max(0,1-2*Math.abs(l/2-(start+end)/2)/span);
  };
  const mean=(al+bl)/2;
  return Math.min(1,Math.abs(ux*vx+uy*vy)) * (2/(mean/Math.min(al,bl)+Math.max(al,bl)/mean)) *
    (mean/(mean+Math.hypot(am.x-bm.x,am.y-bm.y))) * Math.min(visibility(a,b,c,d,al,ux,uy),visibility(c,d,a,b,bl,vx,vy));
}
const force=[];
for (const n of [100,1000,10000]) {
  const start=performance.now(),edges=input(n),metrics=edges.map(forceEdgeMetric);
  let zero=0,positive=0,compatible=0,oracleChecks=0;
  const hash=createHash('sha256'), bytes=Buffer.allocUnsafe(8);
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++) {
    const value=forceCompatibility(metrics[i],metrics[j],false).compatibility;
    assert.equal(Object.is(value,oracle(edges[i],edges[j])),true);oracleChecks++;
    bytes.writeDoubleLE(value);hash.update(bytes);
    if(value===0)zero++;else positive++;if(value>0&&value>=.6)compatible++;
  }
  const scheduleWork=forceRouteSchedule().reduce((sum,c)=>sum+n*(c.internalSamples+2)+c.iterations*(2*n+5*n*c.internalSamples+compatible*c.internalSamples),0);
  force.push({n,pairs:n*(n-1)/2,zero,positive,compatible,oracleChecks,compatibilityHash:hash.digest('hex'),scheduleWork,peakPointSlots:70*n,elapsedMs:performance.now()-start});
}
const density=[];
for(const n of [100,1000,10000]) {
  const edges=input(n),counts=edges.map(([a,b])=>Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(1/256))+1));
  const S=counts.reduce((a,b)=>a+b,0), C=65536;
  // Only small fixture materializes actual resampling; 10k uses exact count
  // formula, not an unguarded solver, field construction or completion claim.
  if(n===100)assert.equal(edges.reduce((sum,e,i)=>sum+resampleRoute(e,counts[i]).length,0),S);
  density.push({n,firstSamples:S,minCount:Math.min(...counts),maxCount:Math.max(...counts),existingInitialLiveSlots:6*S+2*n,
    coordinatePayloadBytes:16*S,firstSameSizeDoubleCoordinatesBytes:32*S,
    streamedSameSizeLiveSlots:2*S+C+5*4096+2*n,
    streamedSameSizeTypedBytes:32*S+9*C+8*(n+1)+64*4096+32*n,
    note:'Streamed counts assume next S equals old S and are allocation model only, not a later-iteration bound or measured heap.'});
}
const sources=['compatibility.js','forceDirected.js','density.js','densityField.js','budget.js','resultProvenance.js'];
const out={schemaVersion:1,status:'design audit; no solver completion or performance qualification',source:'fa943e864982783ae8ae10bc18a4257ea8f0b2bb',
 node:process.version,fixtureReference:'0bd402486:scripts/benchmarks/routes.browser.js',force,density,
 sourceSHA256:Object.fromEntries(sources.map(name=>[name,createHash('sha256').update(readFileSync(new URL('../../../../../src/grammar/graph/routes/'+name,import.meta.url))).digest('hex')]))};
writeFileSync(new URL('./audit.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
