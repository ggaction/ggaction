import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {candidate,paths} from './candidate.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../../..'),out=resolve(process.argv[2]??resolve(root,'.artifacts/partition-cell-proof')),temp=mkdtempSync(resolve(tmpdir(),'partition-cell-proof-'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(readFileSync(resolve(here,'source-hashes.json'),'utf8'));mkdirSync(out,{recursive:true});let patch='';
try{
 for(const path of paths){const source=readFileSync(resolve(root,path),'utf8');assert.equal(sha(source),manifest[path],`Proof source changed: ${path}`);const next=candidate(path,source),a=resolve(temp,'before.js'),b=resolve(temp,'after.js');writeFileSync(a,source);writeFileSync(b,next);const d=spawnSync('git',['diff','--no-index','--',a,b],{encoding:'utf8'});assert.equal(d.status,1);patch+=`diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n`+d.stdout.slice(d.stdout.indexOf('@@'));}
 writeFileSync(resolve(out,'proposal.patch'),patch);
 const values=[];for(const mode of ['baseline','candidate']){const file=resolve(out,mode+'.json'),p=spawnSync(process.execPath,[resolve(here,'proof.mjs'),file],{cwd:root,env:{...process.env,PARTITION_PROOF_MODE:mode},encoding:'utf8'});assert.equal(p.status,0,p.stderr);process.stdout.write(p.stdout);values.push(JSON.parse(readFileSync(file)));writeFileSync(file+'.gz',gzipSync(readFileSync(file)));}
 const [a,b]=values;assert.equal(a.rows.length,b.rows.length);assert.equal(a.inputSHA256,b.inputSHA256);
 for(let i=0;i<a.rows.length;i++){const x={...a.rows[i]},y={...b.rows[i]};if(!x.generic){delete x.owned;delete x.ownData;delete y.owned;delete y.ownData;}assert.deepEqual(x,y,`Output/error/actual work mismatch at ${x.name}`);}
 const before=a.rows.find(r=>r.name==='public-1k'),after=b.rows.find(r=>r.name==='public-1k');assert.ok(after.ownData<before.ownData);assert.ok(after.owned<before.owned);assert.equal(before.math,11003);assert.equal(before.inverseIterations,1000);assert.equal(before.workCount,8096);
 const receipt={kind:'read-only source-loader comparison; no product change or P95 claim',source:'c8bac0e77',runtime:process.version,scope:'per-cell synchronous preparation only; no cross-cell or retained cache',cases:a.rows.length,errors:a.rows.filter(r=>r.error).length,allOutputsErrorsMathIterationWorkExact:true,genericWrapperAllCountersExact:a.rows.filter(r=>r.generic).length,original1k:{inputSHA256:a.inputSHA256,verifiedCells:a.verifiedCells,before,after},sourceHashes:manifest,patchSha256:sha(patch)};
 writeFileSync(resolve(out,'summary.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{rmSync(temp,{recursive:true,force:true});}
