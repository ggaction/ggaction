import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url)),root=fileURLToPath(new URL('../../../../../',import.meta.url));
const json=async name=>JSON.parse(await readFile(path.join(here,name),'utf8'));
const q=await json('qualification.json'),report=JSON.parse(gunzipSync(await readFile(path.join(here,'small-22.json.gz'))));
assert.equal(report.status,'small-exact');assert.equal(q.productSourceChanged,false);assert.equal(q.original100Executed,false);
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
console.log(JSON.stringify({status:'passed',smallCases:report.result.cases.length,iterations:40,sourceOwners:Object.keys(report.result.sourceHashes).length,arithmeticRows:6,candidateNames:inventory.count,links,productChanges:0,original100Executed:false}));
