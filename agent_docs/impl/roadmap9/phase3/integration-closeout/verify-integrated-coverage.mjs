import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root=process.cwd(), directory=path.resolve(process.argv[2] ?? '.artifacts/validation/integrated-coverage');
const localDirectory=path.resolve(process.argv[3] ?? '.artifacts/validation/integrated-clean');
const read=name=>fs.readFileSync(path.join(directory,name));
const json=name=>JSON.parse(read(name));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const origin=json('origin.json'),receipt=json('receipt.json');
assert.equal(origin.repository,'ggaction/ggaction');
assert.equal(origin.job.name,'coverage');
assert.equal(origin.job.status,'completed');
assert.equal(origin.job.conclusion,'success');
assert.equal(origin.job.run_id,origin.artifact.workflow_run.id);
assert.equal(origin.artifact.workflow_run.head_sha,commit);
assert.equal(origin.artifact.name,'coverage-coverage-1');
assert.equal(origin.artifact.expired,false);
assert.equal('sha256:'+sha(read('artifact.zip')),origin.artifact.digest);
for(const name of ['receipt.json','metrics.json','report.log']) {
  assert.equal(Buffer.compare(read(name),execFileSync('unzip',['-p',path.join(directory,'artifact.zip'),name],{maxBuffer:20*1024*1024})),0);
}
assert.equal(receipt.sourceCommit,commit);
assert.equal(receipt.status,0);
assert.equal(receipt.workingTree,'');
assert.deepEqual(receipt.untrackedSha256,{});
assert.equal(receipt.trackedDiffSha256,sha(''));
const {collectTestFiles}=await import(pathToFileURL(path.join(root,'scripts/run-tests.js')));
assert.deepEqual([...receipt.files].sort(),collectTestFiles('coverage').map(file=>path.relative(root,file).split(path.sep).join('/')).sort());
const {assertSourceCoverage,assertCriticalCoverage,parseCoverageTable}=await import(pathToFileURL(path.join(root,'scripts/coverage-policy.js')));
const report=read('report.log').toString('utf8');
assertSourceCoverage(report);
assertCriticalCoverage(report);
assert.deepEqual(Object.fromEntries(parseCoverageTable(report)),json('metrics.json'));
for(const key of ['fail','cancelled','todo']) assert.ok(new RegExp('^# '+key+' 0$','m').test(report),key+' must be zero');
const skipped=Number(report.match(/^# skipped (\d+)$/m)?.[1]);
assert.equal(skipped,1);
assert.deepEqual(report.split('\n').filter(line=>/^ok \d+ .*# SKIP/.test(line)).map(line=>line.replace(/^ok \d+ - /,'')),[
  'native PNG resolves Hangul through an installed fallback and PDF remains vector text # SKIP No Hangul fallback font is installed on this host.'
]);
const supplemental=JSON.parse(fs.readFileSync(path.join(localDirectory,'suite-unit.json')));
assert.equal(supplemental.code,0);
assert.ok(!supplemental.termination);
for(const source of [supplemental.source,supplemental.sourceAfter]) {assert.equal(source.commit,commit);assert.equal(source.clean,true);}
assert.ok(supplemental.discovery.files.includes('test/unit/renderers/native-font-fallback.test.js'));
assert.deepEqual([...supplemental.discovery.files].sort(),collectTestFiles('unit').map(file=>path.relative(root,file).split(path.sep).join('/')).sort());
const supplementalLog=fs.readFileSync(path.join(localDirectory,'suite-unit.log'),'utf8');
assert.ok(/^# skipped 0$/m.test(supplementalLog),'Every local unit test including Hangul must run');
for(const key of ['fail','cancelled','todo']) assert.ok(new RegExp('^# '+key+' 0$','m').test(supplementalLog),key+' must be zero locally');
assert.ok(/^ok \d+ - native PNG resolves Hangul through an installed fallback and PDF remains vector text$/m.test(supplementalLog));
assert.equal(sha(supplementalLog),supplemental.logSha256);
const tests=Number(report.match(/^# tests (\d+)$/m)?.[1]);
assert.ok(tests>=receipt.files.length);
process.stdout.write(JSON.stringify({verification:'authenticated CI artifact and unchanged coverage policy',commit,runId:origin.artifact.workflow_run.id,jobId:origin.job.id,artifactId:origin.artifact.id,tests,sourceFiles:receipt.files.length,coverage:json('metrics.json')['all files'],node:receipt.node,platform:receipt.platform,ciSkipped:skipped,localHangulFallback:'passed'})+'\n');
process.stdout.write(report);
