import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {BROWSER_BUNDLE_GZIP_LIMITS} from '../../../../../scripts/browser-bundle-size.js';
const archive=JSON.parse(await readFile(process.argv[2]));
const reports=await Promise.all(process.argv.slice(3,6).map(file=>readFile(file,'utf8').then(JSON.parse)));
const measurements=[];
for(const [index,report] of reports.entries()){
 assert.ok(report.node.startsWith(`v${[20,22,24][index]}.`));
 assert.equal(report.archive,archive.sha256);assert.equal(report.cases.length,33);assert.equal(new Set(report.cases).size,33);
 assert.equal(report.types,'passed');assert.equal(report.doc,'passed');assert.ok(report.peers);
 assert.deepEqual(Object.keys(report.bundles),Object.keys(BROWSER_BUNDLE_GZIP_LIMITS));
 assert.ok(report.errors.every(error=>error.message==='bundle limit exceeded'));
 for(const [specifier,limit] of Object.entries(BROWSER_BUNDLE_GZIP_LIMITS)){
  const actual=report.bundles[specifier].gzipBytes;assert.ok(actual<=limit,`${report.node} ${specifier}: ${actual}>${limit}`);
  measurements.push({node:report.node,specifier,gzipBytes:actual,limit});
 }
}
assert.equal(measurements.length,18);
const result={archive:archive.sha256,status:'same18 original installed measurements pass current measured caps; original failures retained',runtimeCasesEach:33,measurements};
await writeFile(process.argv[6],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
