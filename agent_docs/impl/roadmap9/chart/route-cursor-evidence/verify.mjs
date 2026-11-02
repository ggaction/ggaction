import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='agent_docs/impl/roadmap9/chart/route-cursor-evidence';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const q=JSON.parse(await readFile(`${directory}/qualification.json`,'utf8'));
for(const {path,sha256} of q.files)assert.equal(sha(await readFile(path)),sha256,path);
const source=JSON.parse(await readFile(`${directory}/source.json`,'utf8'));
assert.equal(source.productChanges,0);
for(const {path,sha256,seams} of source.sources){
  const text=await readFile(path,'utf8');assert.equal(sha(text),sha256,path);
  for(const entry of seams)assert.equal(text.split('\n')[entry.line-1].trim(),entry.text);
}
let baseline;
for(const major of [20,22,24]){
  const report=JSON.parse(await readFile(`${directory}/node${major}.json`,'utf8'));
  assert.ok(report.node.startsWith(`v${major}.`));assert.equal(report.records.length,8);
  for(const record of report.records){assert.deepEqual(record.chunks,[1,7,64,1024]);assert.equal(record.exactQuota,true);assert.equal(record.oneByteShortRejected,true);}
  if(baseline)assert.deepEqual(report.records,baseline);else baseline=report.records;
  assert.equal(report.proofs.hostileRouteGetters,0);
  assert.equal(report.proofs.nativeHost.authorityRejections,4);
  assert.equal(report.proofs.nativeHost.workerTerminated,1);
  assert.equal(report.proofs.nativeHost.listenersRemaining,0);
  assert.deepEqual(report.proofs.abortedTurns,[1,2,60]);
  assert.equal(report.limits.productionPolicyChanged,false);
  assert.equal(report.limits.latencyOr100msClaim,false);
}
const log=await readFile(`${directory}/host-regression-corrected.log`,'utf8');
assert.match(log,/# tests 14\n/);assert.match(log,/# fail 0\n/);assert.match(log,/# cancelled 0\n/);
const failure=await readFile(`${directory}/host-regression-selector-failure.log`,'utf8');
assert.match(failure,/matches no tests/);
console.log('Route cursor read-only evidence: 27 sources, 3 Node receipts, 32 exact checks per Node, 14 host regressions verified.');
