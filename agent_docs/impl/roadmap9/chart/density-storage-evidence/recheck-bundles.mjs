import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
const results=[];
let sha256;
for(const major of [20,22,24]) {
 const receipt=JSON.parse(await readFile(`.artifacts/density-storage/installed-${major}.json`,'utf8'));
 sha256??=receipt.sha256;assert.equal(receipt.sha256,sha256);
 assert.equal(receipt.checks.length,5);assert.ok(receipt.checks.every(value=>value.status==='passed'));
 assert.equal(receipt.types,'passed');assert.equal(receipt.snippet.status,'passed');assert.equal(receipt.bundles.length,6);
 for(const bundle of receipt.bundles) {
  const limit=BROWSER_BUNDLE_GZIP_LIMITS[bundle.specifier];assert.ok(bundle.gzipBytes<=limit);
  results.push({node:receipt.node,specifier:bundle.specifier,gzipBytes:bundle.gzipBytes,limit,status:'passed'});
 }
}
await writeFile('.artifacts/density-storage/bundle-recheck.json',JSON.stringify({sha256,status:'passed',measurements:results,scope:'same18 measurements; original receipts retained; no runtime or packed input changed'},null,2)+'\n');
console.log('Same archive: 18 bundle measurements passed.');
