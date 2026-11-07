import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { forceEdgeMetric, forceCompatibility } from '../../../../../src/grammar/graph/routes/compatibility.js';
import { advanceForceRoutes, forceRouteSchedule } from '../../../../../src/grammar/graph/routes/forceDirected.js';
import { resampleRoute } from '../../../../../src/grammar/graph/routes/polyline.js';

// Original fixed fixture, deliberately only the already-supported 100-edge
// cell. No product guard is removed and the 10k solver is not executed.
const n=100;
const raw=Array.from({length:n},(_,i)=>({x:200+150*Math.cos(2*Math.PI*i/n),y:200+150*Math.sin(2*Math.PI*i/n)}));
const left=Math.min(...raw.map(p=>p.x)),top=Math.min(...raw.map(p=>p.y));
const scale=Math.max(Math.max(...raw.map(p=>p.x))-left,Math.max(...raw.map(p=>p.y))-top);
const points=raw.map(p=>({x:(p.x-left)/scale,y:(p.y-top)/scale}));
const edges=points.map((a,i)=>[a,points[(i+Math.floor(n/3))%n]]),metrics=edges.map(forceEdgeMetric),lengths=metrics.map(m=>m.length);
const neighbors=edges.map(()=>[]);let compatible=0;
for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
 const pair=forceCompatibility(metrics[i],metrics[j],false);
 if(pair.compatibility>0&&pair.compatibility>=.6){compatible++;neighbors[i].push({edge:j,...pair});neighbors[j].push({edge:i,...pair});}
}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const bits=values=>{const b=Buffer.allocUnsafe(values.length*8);values.forEach((v,i)=>b.writeDoubleLE(v,i*8));return b;};
const seen=new Map(),cycles=[];let calls=0,repeated=0,previousFrameRepeats=0,heldBytes=0,checks=0;
let pairCalls=0,pairWithinIterationRepeats=0,pairPreviousIterationMatches=0;
let routes=edges;
const start=performance.now();
for(const cycle of forceRouteSchedule()){
 routes=routes.map(p=>resampleRoute(p,cycle.internalSamples+2));
 let lastFrame=new Map(),lastPairs=new Set(),cycleCalls=0,cycleRepeats=0;
 for(let iteration=0;iteration<cycle.iterations;iteration++){
  const current=new Map();
  for(let e=0;e<n;e++)for(let i=1;i<routes[e].length-1;i++){
   const p=routes[e][i],a=routes[e][i-1],b=routes[e][i+1];
   // Complete raw operands of the spring, neighbor subtractions and attraction,
   // in original neighbor order. Binary64 bytes distinguish signed zero.
   const operands=[lengths[e],routes[e].length-1,cycle.step,a.x,a.y,p.x,p.y,b.x,b.y];
   for(const neighbor of neighbors[e]){const other=routes[neighbor.edge],q=other[neighbor.reverse?other.length-1-i:i];operands.push(neighbor.compatibility,q.x,q.y);}
   const encoded=bits(operands),key=digest(encoded),previous=seen.get(key);
   calls++;cycleCalls++;
   if(previous!==undefined){assert.equal(encoded.equals(previous),true);checks++;repeated++;cycleRepeats++;}
   else{seen.set(key,encoded);heldBytes+=encoded.length;}
   const location=e+':'+i;if(lastFrame.get(location)===key)previousFrameRepeats++;current.set(location,key);
  }
  const pairs=new Set();
  for(let e=0;e<n;e++)for(const neighbor of neighbors[e])if(neighbor.edge>e){
   const other=routes[neighbor.edge];
   for(let i=1;i<routes[e].length-1;i++){
    const p=routes[e][i],q=other[neighbor.reverse?other.length-1-i:i];
    // Narrow potential reuse of the pure hypot/attraction operands, without
    // claiming the full force accumulator or reverse signed-zero path is equal.
    const key=bits([q.x-p.x,q.y-p.y,neighbor.compatibility]).toString('hex');
    pairCalls++;if(pairs.has(key))pairWithinIterationRepeats++;if(lastPairs.has(key))pairPreviousIterationMatches++;pairs.add(key);
   }
  }
  lastPairs=pairs;
  const scalar=advanceForceRoutes(routes,lengths,neighbors,cycle.step,false),symmetric=advanceForceRoutes(routes,lengths,neighbors,cycle.step,true);
  assert.deepEqual(symmetric,scalar); // Includes endpoint sign and cap count.
  routes=symmetric.routes;lastFrame=current;
 }
 cycles.push({cycle:cycle.cycle,iterations:cycle.iterations,internalSamples:cycle.internalSamples,calls:cycleCalls,repeatedInputs:cycleRepeats});
}
const out={schemaVersion:1,status:'small numerical duplicate-input audit; not large support or performance qualification',n,compatiblePairs:compatible,
 calls,uniqueInputSequences:seen.size,repeatedInputSequences:repeated,adjacentSameLocationRepeats:previousFrameRepeats,collisionEqualityChecks:checks,
 pairCalls,pairWithinIterationRepeats,pairPreviousIterationMatches,retainedAuditOperandBytes:heldBytes,cycles,elapsedMs:performance.now()-start,finalCoordinateHash:digest(bits(routes.flatMap(p=>p.flatMap(({x,y})=>[x,y])))),
 node:process.version,source:'fa943e864982783ae8ae10bc18a4257ea8f0b2bb',fixtureReference:'0bd402486:scripts/benchmarks/routes.browser.js',
 sourceSHA256:Object.fromEntries(['forceDirected.js','compatibility.js','polyline.js'].map(name=>[name,digest(readFileSync(new URL('../../../../../src/grammar/graph/routes/'+name,import.meta.url)))])),
 limitation:'The exact 100-edge operand audit is not extrapolated to unseen 1k/10k iterations. No runtime cache is added.'};
writeFileSync(new URL('./force-repeat-audit.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));
