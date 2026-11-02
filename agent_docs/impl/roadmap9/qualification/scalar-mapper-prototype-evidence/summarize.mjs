import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transform} from './loader.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'), root=new URL('../../../../../',import.meta.url);
const inputSources={},candidateSources={};
for(const variant of ['scalar','scalar-record']) {
 process.env.POSITION_RECORD_FREEZE=variant==='scalar-record'?'1':'0';candidateSources[variant]={};
 for(const file of ['grammar/scales/continuous.js','grammar/scales/transformed.js','grammar/scales/mapping.js','grammar/animation/positions.js']){
  const text=await readFile(new URL('src/'+file,root),'utf8');inputSources['src/'+file]=hash(text);candidateSources[variant]['src/'+file]=hash(transform(file,text));
 }
}
const comparisons={};
for(const variant of ['scalar','scalar-record']){
 comparisons[variant]={};
 for(const type of ['linear','time','log','pow','sqrt','symlog']){
  const file=variant==='scalar'&&type==='linear'?'product-compare-linear.json':`product-compare-${variant}-${type}.json`;
  const report=JSON.parse(await readFile(new URL(file,import.meta.url)));
  assert.equal(report.scaleType,type);assert.equal(report.rows,1000);
  for(const source of Object.keys(inputSources))assert.equal(report.source[source],inputSources[source]);
  for(const version of ['3','4']){const result=report.comparisons[version];for(const key of ['nativeBytes','nativeSHA256','rebaseBytes','rebaseSHA256'])assert.equal(result[key][0],result[key][1]);assert.ok(result.fullNativeOfflineMeaningBatchRebaseEqual&&result.timelineAndTimelineRebaseFullMeaningEqual&&result.mixedGeoFullFrameAndMeaningEqual&&result.fallbackFullMeaningEqual&&result.restoreReserializeExact);}
  const counts=report.comparisons['4'].counts.map(({clones,ownedAdds,weakAdds,weakHas})=>({clones,ownedAdds,weakAdds,weakHas}));
  comparisons[variant][type]={file,inputSHA256:report.inputSHA256,counts,versions:[3,4],allFullFrameMeaningWorkWireAssertionsPassed:true};
 }
 const log=await readFile(new URL(`positions-${variant}.log`,import.meta.url),'utf8');assert.match(log,/# tests 14\b/);assert.match(log,/# pass 14\b/);assert.match(log,/# fail 0\b/);
}
const oracle=JSON.parse(await readFile(new URL('oracle.json',import.meta.url))),ownership=JSON.parse(await readFile(new URL('record-ownership.json',import.meta.url)));
assert.equal(oracle.getterCalls,0);assert.equal(ownership.samples,90);
const report={status:'ready-for-review',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),node:process.version,inputSources,candidateSources,productSourceModified:false,productAdoption:false,ownerTests:{scalar:14,scalarAndRecord:14},oracle,ownership,comparisons,failures:[{file:'first-time-fixture-failure.log.gz',classification:'Evidence fixture omitted fieldType temporal; corrected before successful time run'}],limitations:['No original 100k run','No source-free archive/browser or critical coverage','No timing/P95/SLO claim','Callback extracted from current source by loader; product shared-helper extraction remains unimplemented','No retained-heap 100-cycle qualification']};
await writeFile(new URL('summary.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,oracle:oracle.comparisons,fullProducts:12,ownerTests:28,ownedSamples:ownership.samples}));
