import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
const prefix='agent_docs/impl/roadmap9/chart/route-v2-proposal-evidence/';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const q=await json(prefix+'qualification.json');
for(const file of [...q.sources,...q.evidence])assert.equal(createHash('sha256').update(await readFile(file.path)).digest('hex'),file.sha256,file.path);
assert.equal(q.productChanges,0);assert.equal(q.largeRun,false);assert.equal(q.status,'ready-for-review-proposal-only');
let records;
for(const version of [20,22,24]){
 const r=await json(prefix+`audit${version}.json`);
 assert.match(r.node,new RegExp(`^v${version}\\.`));assert.equal(r.source,q.source);
 assert.equal(r.records.length,8);assert.deepEqual(r.counters,{registrations:8,activeHashes:0});assert.equal(r.getters,0);
 assert.equal(r.finalNativeHandlePublished,false);assert.equal(r.largeFixtureRun,false);assert.equal(r.latencyQualified,false);
 for(const row of r.records){assert.ok(row.mutationIsolated&&row.exactSameModuleProof&&row.crossModuleFullValidation);assert.ok(row.turns>1);assert.deepEqual(row.cancelAt,[1,row.turns]);}
 if(records)assert.deepEqual(r.records,records);else records=r.records;
}
const extraction=await json(prefix+'extraction.json');
assert.equal(extraction.productChanges,0);
assert.equal(extraction.sourceSHA256,q.sources.find(x=>x.path===extraction.source).sha256);
const owner=await readFile(extraction.source,'utf8');
const start=owner.indexOf('export function createRouteJob('),end=owner.indexOf('\nexport function validateRouteJob(',start);
assert.equal(createHash('sha256').update(owner.slice(start,end)).digest('hex'),extraction.bodySHA256);
execFileSync(process.execPath,[prefix+'numeric.mjs'],{stdio:'pipe'});
const n=await json(prefix+'numeric.json');assert.deepEqual(await json('.artifacts/route-v2-proposal/numeric.json'),n);
assert.equal(n.status,'proposal-only-static-selection');assert.equal(n.largeRun,false);assert.equal(n.latencyQualified,false);
assert.deepEqual(n.force.map(x=>x.completeForceWorkUpper),[11201850,90988500,7750485000]);
assert.equal(n.bytes.forceCompletion10000Upper,60851065);
for(const name of q.initialFailures){const log=gunzipSync(await readFile(prefix+name)).toString();assert.match(log,/Error:/);}
assert.equal(execFileSync('git',['diff',q.source,'--','src','types','test','docs','package.json','package-lock.json','scripts'],{encoding:'utf8'}),'');
console.log('route-v2-proposal verified: source/evidence hashes, 24 jobs, 48 chunk cancellations, 3 getter/pre-abort probes, numeric ledger; product changes 0; no large run');
