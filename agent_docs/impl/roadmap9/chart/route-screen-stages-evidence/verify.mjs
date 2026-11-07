import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseCoverageTable,CRITICAL_COVERAGE_FLOORS} from '../../../../../scripts/coverage-policy.js';
import {PACKAGE_LIMITS} from '../../../../../scripts/package-artifact.js';
import {BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
const directory='agent_docs/impl/roadmap9/chart/route-screen-stages-evidence';
const sha=data=>createHash('sha256').update(data).digest('hex');
const q=JSON.parse(await readFile(`${directory}/qualification.json`,'utf8'));
for(const item of q.sources)assert.equal(sha(await readFile(item.path)),item.sha256,item.path);
for(const item of q.files){const bytes=await readFile(item.path);assert.equal(sha(bytes),item.sha256);assert.equal(sha(gunzipSync(bytes)),item.uncompressedSha256);}
const receipt=async name=>gunzipSync(await readFile(`${directory}/receipts/${name}.gz`)).toString();
const json=async name=>JSON.parse(await receipt(name));
for(const key of ['entries','packedBytes','unpackedBytes'])assert.ok(q.archive[key]<=PACKAGE_LIMITS[key]);
for(const key of ['publicBUpdate','fullBUnion','latency100ms','largeCapacity','publication'])assert.equal(q.claims[key],false);
const owners=['actions/data/resourcePlan.js','actions/graphs/routeClosure.js','materialization/graph/routeResource.js','actions/graphs/screenRoutes.js','actions/primitives/preparedResourceContext.js','materialization/canvasResourceRevision.js','materialization/guides/layout.js','materialization/responsiveLayout.js'];
for(const major of [20,22,24]){
 const log=await receipt(`screen-stages-node${major}.log`);assert.match(log,/(?:#|ℹ) tests 1422\n/);assert.match(log,/(?:#|ℹ) fail 0\n/);assert.match(log,/(?:#|ℹ) cancelled 0\n/);
 const coverage=new Map([...parseCoverageTable(log)].map(([key,value])=>[key.replace(/^src\//,''),value]));
 for(const key of ['core/encodedValueCursor.js','core/jsonText.js','core/valueEncoding.js'])assert.deepEqual(coverage.get(key),{lines:100,branches:100,functions:100},`${major} ${key}`);
 for(const [file,floor]of Object.entries(CRITICAL_COVERAGE_FLOORS).filter(([key])=>owners.includes(key)||key.startsWith('grammar/graph/routes/'))){const row=coverage.get(file);assert.ok(row,file);for(const key of ['lines','branches','functions'])assert.ok(row[key]>=floor[key],`${major} ${file} ${key}`);}
 const stages=await json(`installed-stages-${major}.json`);assert.equal(stages.sha256,q.archive.sha256);assert.equal(stages.sourceFree,true);assert.equal(stages.publicAPI,false);assert.equal(stages.tests,9);assert.equal(stages.status,'passed');
 const installed=await json(`installed-${major}.json`);assert.equal(installed.sha256,q.archive.sha256);assert.equal(installed.status,'passed');assert.equal(installed.runtime.records.length,8);assert.equal(installed.types,'passed');
 for(const row of installed.runtime.records)assert.equal(row.geometryHash,row.nativeGeometryHash);
 assert.equal(installed.runtime.workers,installed.runtime.terminated);assert.equal(installed.runtime.listeners,0);assert.equal(installed.bundles.length,6);
 for(const bundle of installed.bundles)assert.ok(bundle.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier]);assert.equal(installed.worker.modules,38);assert.equal(installed.worker.sourceFree,true);
}
const browser=await json('browser.json');assert.equal(browser.sha256,q.archive.sha256);assert.equal(browser.sourceFree,true);assert.equal(browser.productionMinified,true);assert.equal(browser.latencyQualification,false);assert.equal(browser.records.length,3);assert.equal(browser.workers,browser.terminated);assert.equal(browser.listeners,0);assert.equal(browser.modules.worker,38);
for(const r of browser.cancelled){assert.equal(r.publications,0);assert.equal(r.terminals,1);}for(const r of browser.documentation)assert.equal(r.status,'passed');
const docs=await receipt('docs-contracts.log');assert.match(docs,/# fail 0\n/);assert.match(docs,/# cancelled 0\n/);
console.log('Verified private screen/Canvas continuation checkpoint: 1422 tests per Node, unchanged critical floors, source-pinned common installed archive and browser. Public B union remains open.');
