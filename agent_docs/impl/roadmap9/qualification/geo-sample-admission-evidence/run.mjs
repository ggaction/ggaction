import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {candidate,paths} from './candidate.mjs';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../../..'),out=resolve(process.argv[2]??here),temp=mkdtempSync(resolve(tmpdir(),'geo-c1-proof-'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(readFileSync(resolve(here,'source-hashes.json'),'utf8'));mkdirSync(out,{recursive:true});let patch='';
try{
 for(const path of paths){const source=readFileSync(resolve(root,path),'utf8');assert.equal(sha(source),manifest[path],`Proof source changed: ${path}`);const next=candidate(path,source),a=resolve(temp,'before.js'),b=resolve(temp,'after.js');writeFileSync(a,source);writeFileSync(b,next);const d=spawnSync('git',['diff','--no-index','--',a,b],{encoding:'utf8'});assert.equal(d.status,1);patch+=`diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n`+d.stdout.slice(d.stdout.indexOf('@@'));}
 writeFileSync(resolve(out,'proposal.patch'),patch);
 const values=[];for(const mode of ['baseline','candidate']){const file=resolve(out,mode+'.json'),p=spawnSync(process.execPath,[resolve(here,'proof.mjs'),file],{cwd:root,env:{...process.env,GEO_C1_MODE:mode},encoding:'utf8'});assert.equal(p.status,0,p.stderr);process.stdout.write(p.stdout);values.push(JSON.parse(readFileSync(file)));}
 const [a,b]=values;assert.equal(a.rows.length,b.rows.length);
 for(let i=0;i<a.rows.length;i++){const {counts:before,...x}=a.rows[i],{counts:after,...y}=b.rows[i];assert.deepEqual(x,y,`Complete output/error/work mismatch at ${x.name}`);if(x.name.startsWith('generic-'))assert.deepEqual(before,after);}
 const baseline=a.rows.find(r=>r.name==='canonical-1k-0.37'),optimized=b.rows.find(r=>r.name==='canonical-1k-0.37');assert.deepEqual(baseline.counts,{presentation:2,group:3,stream:1});assert.deepEqual(optimized.counts,{presentation:1,group:1,stream:1});assert.equal(baseline.account[0],18916);assert.ok(baseline.eventCount>30000);
 const receipt={kind:'read-only source-loader A/B; no product change or SLO claim',source:'db1fd0890',runtime:process.version,cases:a.rows.length,errors:a.rows.filter(r=>r.error).length,allOutputsErrorsAndActualWorkExact:true,genericFullAdmissionExact:a.rows.filter(r=>r.name.startsWith('generic-')).length,canonical1k:{before:baseline,after:optimized},sourceHashes:manifest,patchSha256:sha(patch)};
 writeFileSync(resolve(out,'summary.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{rmSync(temp,{recursive:true,force:true});}
