import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {assertCriticalCoverage,CRITICAL_COVERAGE_FLOORS} from '../../../../../scripts/coverage-policy.js';
import {BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
const q=JSON.parse(await readFile(new URL('qualification.json',import.meta.url)));
for(const [file,sha] of Object.entries(q.sourceSHA256)) assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),sha,file);
const coverage=gunzipSync(await readFile(new URL('coverage.log.gz',import.meta.url))).toString();
assertCriticalCoverage(coverage,{'core/sha256.js':CRITICAL_COVERAGE_FLOORS['core/sha256.js']});
for(const node of [20,22,24]){
 const r=JSON.parse(await readFile(new URL(`installed-${node}.json`,import.meta.url)));
 assert.equal(r.sha256,q.archive.sha256);assert.equal(r.status,'passed');assert.equal(r.checks.length,12);
 assert.ok(r.checks.every(value=>value.status==='passed'));assert.equal(r.types,'passed');assert.equal(r.snippet.status,'passed');
 assert.equal(r.bundles.length,6);for(const b of r.bundles)assert.ok(b.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[b.specifier]);
}
console.log('source pin, SHA critical, same archive 3Node12 cases and 18 bundle limits passed');
