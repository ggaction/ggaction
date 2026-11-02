import {readFileSync,writeFileSync,mkdirSync,copyFileSync,symlinkSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const evidence=resolve('agent_docs/impl/roadmap9/qualification/frame-sampling-evidence');
const destination=resolve(process.env.FRAME_AUDIT_OUT??'.artifacts/frame-sampling'),source=resolve(destination,'source');
const manifest=JSON.parse(readFileSync(resolve(evidence,'source-inputs.json')));
const ref='f2b28364b7555b9af823d9270dea1c2c09e8d9e9',names=Object.keys(manifest.files);
assert.ok(!existsSync(source),'Use a new/empty .artifacts/frame-sampling/source; preserve earlier receipts.');
const result=spawnSync('git',['cat-file','--batch'],{input:names.map(file=>`${ref}:${file}\n`).join(''),maxBuffer:64*1024*1024});assert.equal(result.status,0,result.stderr?.toString());
let cursor=0;for(const file of names){const end=result.stdout.indexOf(10,cursor),header=result.stdout.subarray(cursor,end).toString();assert.ok(!header.endsWith(' missing'),header);cursor=end+1;const length=Number(header.split(' ').at(-1)),bytes=result.stdout.subarray(cursor,cursor+length);cursor+=length+1;assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.files[file],file);const target=resolve(source,file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}
symlinkSync(resolve('node_modules'),resolve(source,'node_modules'));
copyFileSync(resolve(evidence,'source-inputs.json'),resolve(destination,'source-inputs.json'));
for(const file of['profile.mjs','allocations.mjs','reuse-timing.mjs','scale-prototype.mjs','prepared-scale-prototype.mjs'])copyFileSync(resolve(evidence,file),resolve(destination,file));
console.log(JSON.stringify({sourceRef:ref,verifiedFiles:names.length,aggregate:manifest.aggregateSha256,output:destination}));
