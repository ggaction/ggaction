import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseCoverageTable} from '../../../../../scripts/coverage-policy.js';
const directory='agent_docs/impl/roadmap9/chart/strict-value-cursor-evidence';
const q=JSON.parse(await readFile(`${directory}/qualification.json`,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const entry of q.sources)assert.equal(hash(await readFile(entry.path)),entry.sha256,entry.path);
for(const [name,entry] of Object.entries(q.evidenceFiles)){
 const raw=gunzipSync(await readFile(`${directory}/${name}.gz`));assert.equal(raw.length,entry.bytes);assert.equal(hash(raw),entry.sha256,name);
}
const log=gunzipSync(await readFile(`${directory}/owning-final.log.gz`)).toString();
const coverage=parseCoverageTable(log);
for(const path of ['core/jsonText.js','core/encodedValueCursor.js','core/valueEncoding.js'])assert.deepEqual(coverage.get(path),{lines:100,branches:100,functions:100});
const load=async name=>JSON.parse(gunzipSync(await readFile(`${directory}/${name}.gz`)));
let records;
for(const version of [20,22,24]){
 const installed=await load(`installed-${version}.json`);
 assert.equal(installed.status,'passed');assert.equal(installed.sha256,q.archive.sha256);
 assert.equal(installed.checks.length,12);assert.ok(installed.checks.every(x=>x.status==='passed'));
 assert.equal(installed.privateCursor.tests,14);assert.equal(installed.privateCursor.status,'passed');
 assert.equal(installed.types,'passed');assert.equal(installed.snippet.status,'passed');assert.equal(installed.bundles.length,6);
 const native=await load(`native${version}-final.json`);
 assert.equal(native.records.length,8);
 if(records)assert.deepEqual(native.records,records);else records=native.records;
 assert.equal(native.proofs.hostileRouteGetters,0);assert.equal(native.proofs.nativeHost.authorityRejections,4);
}
const browser=await load('browser.json');assert.equal(browser.sha256,q.archive.sha256);
assert.equal(browser.bytesEqual,true);assert.equal(browser.hash,browser.oracle);assert.equal(browser.productionMinified,true);
for(const abort of browser.aborts){assert.equal(abort.publications,0);assert.equal(abort.terminals,1);assert.equal(abort.cleared,true);}
assert.equal(q.publicContractChanges,0);assert.equal(q.latencyQualification,false);
console.log('Strict value cursor source, 3 core owners 100/100/100, same-archive 3 Node consumers and Chromium verified.');
