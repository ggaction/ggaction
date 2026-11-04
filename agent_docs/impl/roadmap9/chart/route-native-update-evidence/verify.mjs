import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {parseCoverageTable,CRITICAL_COVERAGE_FLOORS} from '../../../../../scripts/coverage-policy.js';
import {PACKAGE_LIMITS} from '../../../../../scripts/package-artifact.js';
import {BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
const directory='agent_docs/impl/roadmap9/chart/route-native-update-evidence',sha=v=>createHash('sha256').update(v).digest('hex');
const q=JSON.parse(await readFile(`${directory}/qualification.json`,'utf8'));
for(const item of q.sources)assert.equal(sha(await readFile(item.path)),item.sha256,item.path);
for(const item of q.files){const bytes=await readFile(item.path);assert.equal(sha(bytes),item.sha256);assert.equal(sha(gunzipSync(bytes)),item.uncompressedSha256);}
const receipt=async name=>gunzipSync(await readFile(`${directory}/receipts/${name}.gz`)).toString(),json=async name=>JSON.parse(await receipt(name));
for(const key of ['entries','packedBytes','unpackedBytes'])assert.ok(q.archive[key]<=PACKAGE_LIMITS[key]);
assert.equal(q.claims.publicBLayoutUpdate,true);for(const key of ['fullBUnion','latency100ms','largeCapacity','publication'])assert.equal(q.claims[key],false);
const owners=['actions/data/resourcePlan.js','actions/graphs/routeClosure.js','materialization/graph/routeResource.js','actions/graphs/layouts.js','actions/graphs/nativeUpdate.js','actions/theme/nativeRouteUpdate.js','actions/hierarchy/resources.js','actions/primitives/preparedResourceContext.js'];
let count;
for(const major of [20,22,24]){
 const log=await receipt(`owning-node${major}.log`);assert.match(log,/(?:#|ℹ) fail 0\n/);assert.match(log,/(?:#|ℹ) cancelled 0\n/);const tests=Number(log.match(/(?:#|ℹ) tests (\d+)\n/)[1]);assert.ok(tests>=330);count??=tests;assert.equal(tests,count);
 const coverage=new Map([...parseCoverageTable(log)].map(([key,value])=>[key.replace(/^src\//,''),value]));
 for(const file of ['core/action.js','core/encodedValueCursor.js','core/jsonText.js','core/valueEncoding.js'])assert.deepEqual(coverage.get(file),{lines:100,branches:100,functions:100},`${major} ${file}`);
 for(const [file,floor]of Object.entries(CRITICAL_COVERAGE_FLOORS).filter(([file])=>owners.includes(file)||file.startsWith('grammar/graph/routes/')||file.startsWith('resources/graphRoute')||file==='resources/routeStages.js')){const row=coverage.get(file);assert.ok(row,file);for(const key of ['lines','branches','functions'])assert.ok(row[key]>=floor[key],`${major} ${file} ${key}: ${row[key]} < ${floor[key]}`);}
 const installed=await json(`installed-${major}.json`);assert.equal(installed.sha256,q.archive.sha256);assert.equal(installed.status,'passed');assert.equal(installed.types,'passed');assert.equal(installed.runtime.records.length,8);
 for(const row of installed.runtime.records){assert.equal(row.geometryHash,row.nativeGeometryHash);assert.equal(row.nativeUpdate,true);}
 assert.equal(installed.runtime.workers,installed.runtime.terminated);assert.equal(installed.runtime.listeners,0);
 for(const bundle of installed.bundles)assert.ok(bundle.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier],bundle.specifier);assert.equal(installed.bundles.length,6);assert.equal(installed.worker.modules,38);assert.equal(installed.worker.sourceFree,true);assert.equal(installed.graphBoundary.fullAssembly,0);assert.equal(installed.graphBoundary.renderers,0);
}
const browser=await json('browser.json');assert.equal(browser.sha256,q.archive.sha256);assert.equal(browser.sourceFree,true);assert.equal(browser.productionMinified,true);assert.equal(browser.latencyQualification,false);assert.equal(browser.records.length,3);for(const row of browser.records)assert.equal(row.revision,2);assert.equal(browser.workers,browser.terminated);assert.equal(browser.listeners,0);assert.equal(browser.modules.worker,38);
assert.equal(browser.cancelled.length,4);assert.equal(browser.documentation.length,3);
for(const row of browser.cancelled){assert.equal(row.publications,0);assert.equal(row.terminals,1);}for(const row of browser.documentation)assert.equal(row.status,'passed');
const docs=await receipt('docs-final.log');assert.match(docs,/# fail 0\n/);assert.match(docs,/# cancelled 0\n/);
console.log(`Verified public native layout update: ${count} owning tests per Node, strict core100/100/100, common installed archive, real workers and browser; full B union remains open.`);
