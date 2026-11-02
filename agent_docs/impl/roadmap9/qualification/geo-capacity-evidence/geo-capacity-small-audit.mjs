import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeWorkloadInput,prepareNativeWorkload} from '../../../../../scripts/benchmarks/workloads.browser.js';
import {projectGeometry} from '../../../../../src/grammar/geo/stream.js';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const input=nativeWorkloadInput('geo',1000), before=hash(input);
const raw=input.features[0].geometry;
const outputs=[];
for(const scale of [100,Math.sqrt(20000),200]){
 const out=projectGeometry(raw,{type:'equirectangular',scalePx:scale,translatePx:[200,200],precisionPx:0.5},{coordinateKind:'geographic'});
 const cs=out.parts[0].commands;
 assert.equal(out.parts.length,1); assert.equal(cs.length,1999);
 let maxError=0;
 for(let j=0;j<cs.length;j++){
  const i=Math.floor(j/2), a=raw.coordinates[i], b=raw.coordinates[Math.min(i+1,raw.coordinates.length-1)];
  const p=j%2?[(a[0]+b[0])/2,0]:a;
  const expected=[200+scale*p[0]*Math.PI/180,200-scale*p[1]*Math.PI/180];
  const e=Math.max(Math.abs(cs[j].x-expected[0]),Math.abs(cs[j].y-expected[1])); maxError=Math.max(maxError,e);
  assert.ok(e<1e-7); assert.equal(cs[j].op,j?'L':'M');
 }
 outputs.push({scale,...out.diagnostics,parts:out.parts.length,maxError,hash:hash(out)});
}
const fixture=prepareNativeWorkload('geo',1000,input), stages=[];
for(const stage of fixture.stages){let prepared;const start=performance.now();try{prepared=stage.prepare();const result=prepared.run();const witness=prepared.validate(result);stages.push({name:stage.name,status:'pass',elapsedMs:performance.now()-start,witness,outputHash:hash(result.frame?.scene??result.hit),metrics:result.metrics});}catch(e){stages.push({name:stage.name,status:'failed',elapsedMs:performance.now()-start,error:{name:e.name,message:e.message,stack:e.stack}})}finally{prepared?.dispose?.();}}
fixture.assertImmutable();assert.equal(hash(input),before);
console.log(JSON.stringify({source:'ac96edb076fc9a299fa82e6ef18b63a2eb001845',mode:'small source functional diagnostic, not production Chromium or P95',size:1000,inputHash:before,outputs,witness:fixture.witness,stages},null,2));
