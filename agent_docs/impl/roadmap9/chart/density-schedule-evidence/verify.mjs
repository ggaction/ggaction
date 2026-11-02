import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url)),root=fileURLToPath(new URL('../../../../../',import.meta.url));
const json=async name=>JSON.parse(await readFile(path.join(here,name),'utf8'));
const q=await json('qualification.json'),report=JSON.parse(gunzipSync(await readFile(path.join(here,'small-22.json.gz'))));
assert.equal(report.status,'small-exact');assert.equal(q.productSourceChanged,false);assert.equal(q.original100Executed,true);
await access(path.resolve(here,q.authorization));
for(const [name,hash] of Object.entries(report.result.sourceHashes))assert.equal(createHash('sha256').update(await readFile(path.join(root,`src/grammar/graph/routes/${name}.js`))).digest('hex'),hash);
for(const c of report.result.cases){
 assert.equal(c.iterations.length,20);assert.equal(c.diagnostics.iterations,20);
 assert.equal(c.inputWork+Object.values(c.charges).reduce((a,b)=>a+b,0),c.diagnostics.work);
 assert.equal(c.finalCommands,c.finalControls);
 assert.equal(c.diagnostics.candidatePairs,0);
 for(const entry of c.iterations){
  assert.ok(entry.T>=2*c.edges);assert.ok(entry.maxEdge<=4096);
  assert.equal(entry.field.charge,entry.S+entry.field.rows+entry.field.candidates);
  assert.equal(entry.fieldCells,entry.field.cells);
  assert.equal(entry.field.packedLiveBytes,16*entry.S+4*(c.edges+1));
  assert.ok(entry.cumulativeDiagnostics.peakSamples<=10_000_000);
 }
}
const inventory=await json('native-union.json');assert.equal(inventory.count,332);assert.equal(inventory.excluded.length,47);
assert.equal(createHash('sha256').update(await readFile(path.join(root,'agent_docs/contract/ACTION_INDEX.json'))).digest('hex'),inventory.actionIndexSHA256);
assert.equal((await json('bounds.json')).rows.length,6);
let links=0;
for(const filename of ['route-bounded-policy-ledger.md','route-bounded-worker-design.md','route-native-update-boundary.md']){
 const file=path.join(here,'..',filename),source=await readFile(file,'utf8');
 for(const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)){
  const target=match[1];if(/^(https?:|#)/.test(target))continue;
  await access(path.resolve(path.dirname(file),target.split('#')[0]));links++;
 }
}
const original=JSON.parse(gunzipSync(await readFile(path.join(here,'original100-22.json.gz'))));
assert.equal(original.status,'diagnostic-complete');assert.equal(original.result.cases.length,1);
assert.ok(original.durationMs<30_000);assert.equal(original.policy.diagnosticWorkLimit,1_000_000_000);
assert.equal(original.policy.productMaxSamples,10_000_000);assert.equal(original.policy.productEdgeSamples,4096);
assert.deepEqual(original.result.sourceHashes,report.result.sourceHashes);
const c=original.result.cases[0];assert.equal(c.edges,100);assert.equal(c.iterations.length,20);
assert.equal(c.diagnostics.work,87_128_940);assert.equal(c.diagnostics.peakSamples,434107);
assert.equal(c.inputWork+Object.values(c.charges).reduce((a,b)=>a+b,0),c.diagnostics.work);
let previous=22200,peak=0;
for(const i of c.iterations){
 assert.equal(i.S,previous);previous=i.T;
 assert.equal(i.field.charge,i.S+i.field.rows+i.field.candidates);
 assert.equal(i.field.packedLiveBytes,16*i.S+4*(c.edges+1));
 peak=Math.max(peak,6*i.S+i.fieldCells+2*c.edges,i.fieldCells+4*i.S+i.T+2*c.edges);
 assert.equal(i.cumulativeDiagnostics.peakSamples,peak);
}
assert.equal(previous,72355);assert.equal(c.finalCommands,previous);assert.equal(c.finalControls,previous);
assert.equal(c.charges.weights,c.iterations.reduce((sum,i)=>sum+24*i.S,0));
assert.equal(c.charges.field,c.iterations.reduce((sum,i)=>sum+i.field.charge,0));
assert.equal(c.charges['advection-resampling'],c.iterations.reduce((sum,i)=>sum+i.T,0));
assert.equal(c.charges.finalization,previous*8);
assert.equal(c.resultHash,'0a988991ea0252b1cb7bf65f4592bf4c252956cf745b399b5e50238e387802b3');
assert.equal(c.jobBytes,80439);assert.equal(c.completionBytes,9821768);
console.log(JSON.stringify({status:'passed',smallCases:report.result.cases.length,iterations:40,sourceOwners:Object.keys(report.result.sourceHashes).length,arithmeticRows:6,candidateNames:inventory.count,links,productChanges:0,original100Executed:true,original100Iterations:20,original100Work:c.diagnostics.work}));
