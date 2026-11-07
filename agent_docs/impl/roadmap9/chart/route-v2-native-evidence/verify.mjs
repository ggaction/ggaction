import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {parseCoverageTable,CRITICAL_COVERAGE_FLOORS} from '../../../../../scripts/coverage-policy.js';
import {BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
import {PACKAGE_LIMITS} from '../../../../../scripts/package-artifact.js';
const directory='agent_docs/impl/roadmap9/chart/route-v2-native-evidence';
const sha=data=>createHash('sha256').update(data).digest('hex');
const q=JSON.parse(await readFile(`${directory}/qualification.json`,'utf8'));
for(const file of q.sources)assert.equal(sha(await readFile(file.path)),file.sha256,file.path);
for(const file of q.files){const data=await readFile(file.path);assert.equal(sha(data),file.sha256,file.path);assert.equal(sha(gunzipSync(data)),file.uncompressedSha256,file.path);}
const receipt=async name=>gunzipSync(await readFile(`${directory}/receipts/${name}.gz`)).toString();
const json=async name=>JSON.parse(await receipt(name));
assert.equal(q.claims.nativeCreateEdit,true);
for(const key of ['fullBUpdateUnion','wholePipeline100ms','density1k10kCapacity','publicationOrDeployment'])assert.equal(q.claims[key],false);
for(const key of ['entries','packedBytes','unpackedBytes'])assert.ok(q.archive[key]<=PACKAGE_LIMITS[key],key);
const cores=['core/encodedValueCursor.js','core/jsonText.js','core/valueEncoding.js'];
const relevant=file=>file.startsWith('grammar/graph/routes/')||file.startsWith('resources/graphRoute')||file==='resources/routeStages.js'||file==='actions/graphs/routePlan.js';
let baseline;
for(const major of [20,22,24]){
 const report=await json(`installed-${major}.json`);
 assert.equal(report.sha256,q.archive.sha256);assert.equal(report.status,'passed');assert.ok(report.node.startsWith(`v${major}.`));
 assert.equal(report.types,'passed');assert.equal(report.runtime.records.length,8);assert.equal(report.runtime.sourceFreePublicEntries,true);
 assert.equal(report.runtime.workers,16);assert.equal(report.runtime.terminated,16);assert.equal(report.runtime.listeners,0);
 for(const record of report.runtime.records)assert.equal(record.geometryHash,record.nativeGeometryHash);
 const portable=report.runtime.records.map(({resultHash,completionBytes,geometryHash,nativeGeometryHash,...record})=>record);
 if(baseline)assert.deepEqual(portable,baseline);else baseline=portable;
 assert.equal(report.bundles.length,6);
 for(const bundle of report.bundles)assert.ok(bundle.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier],`${major} ${bundle.specifier}`);
 assert.equal(report.worker.modules,38);assert.equal(report.worker.sourceFree,true);
 const log=await receipt(q.coverageLogs[major]);assert.match(log,/(?:#|ℹ) tests 155\n/);assert.match(log,/(?:#|ℹ) fail 0\n/);assert.match(log,/(?:#|ℹ) cancelled 0\n/);
 const coverage=new Map([...parseCoverageTable(log)].map(([key,value])=>[key.replace(/^src\//,''),value]));
 for(const file of cores)assert.deepEqual(coverage.get(file),{lines:100,branches:100,functions:100},`${major} ${file}`);
 for(const [file,floor]of Object.entries(CRITICAL_COVERAGE_FLOORS).filter(([file])=>relevant(file))){const row=coverage.get(file);assert.ok(row,`${major} ${file}`);for(const key of ['lines','branches','functions'])assert.ok(row[key]>=floor[key],`${major} ${file} ${key}`);}
}
const browser=await json('browser.json');assert.equal(browser.sha256,q.archive.sha256);assert.equal(browser.sourceFree,true);assert.equal(browser.productionMinified,true);assert.equal(browser.latencyQualification,false);assert.equal(browser.records.length,3);assert.equal(browser.workers,browser.terminated);assert.equal(browser.listeners,0);assert.equal(browser.modules.worker,38);
assert.equal(browser.documentation.length,2);for(const item of browser.documentation)assert.equal(item.status,'passed');
for(const item of browser.cancelled){assert.equal(item.publications,0);assert.equal(item.terminals,1);}
const numeric=await json('numeric-comparison.json');assert.equal(numeric.sha256,q.archive.sha256);assert.deepEqual(numeric.nativeExact,{'20':true,'22':true,'24':true});
for(const c of numeric.comparisons){
 assert.equal(c.groups.provenance.count,0);
 if(c.to===22)for(const group of Object.values(c.groups))assert.equal(group.count,0);
 else {assert.equal(c.groups.schedule.count,1);assert.equal(c.groups.schedule.first.path,'/diagnostics/schedule/4/bandwidth');assert.ok(c.groups.coordinates.count>0);assert.ok(c.groups.controls.count>0);}
}
const diff24=numeric.comparisons.filter(c=>c.to===24);for(const group of ['coordinates','controls','provenance','schedule'])assert.deepEqual(diff24[0].groups[group],diff24[1].groups[group]);
const docs=await receipt('docs-contracts-final.log');assert.match(docs,/# tests 65\n/);assert.match(docs,/# fail 0\n/);
console.log('Verified exact source hashes, common archive, 3 Node runtimes, 155 tests each, core 100/100/100, route critical floors, six bundle caps, real browser workers and exact documentation snippets. B union and latency remain open.');
