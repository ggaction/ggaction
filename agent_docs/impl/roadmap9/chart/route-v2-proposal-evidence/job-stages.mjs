// Evidence-only source extraction. Product files and their private registry are
// unchanged. The temporary module owns its original validatedJobs WeakSet.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root=process.cwd(),owner='src/grammar/graph/routes/job.js';
const source=await readFile(owner,'utf8');
const start=source.indexOf('export function createRouteJob('),end=source.indexOf('\nexport function validateRouteJob(',start);
assert.ok(start>=0&&end>start);
let stages=source.slice(start,end).replace('export function createRouteJob(payload, viewport = null)',
 'export function* createRouteJobStages(payload, viewport = null, policy)');
const old='  const job = cloneAndFreeze({ ...body, inputHash: routeValueHash(body) });';
assert.equal(stages.split(old).length,2);
stages=stages.replace(old,`  payload = undefined; viewport = undefined;
  const hashing = hashStages(body, policy); policy = undefined;
  const inputHash = yield* hashing;
  const job = cloneAndFreeze({ ...body, inputHash });`);
stages=stages.replace('  validatedJobs.add(job);','  validatedJobs.add(job); stageRegistrations++;');
const code=`${source}
${stages}
import {createEncodedValueCursor,advanceEncodedValueCursor,clearEncodedValueCursor} from '../../../core/encodedValueCursor.js';
import {createSha256State,updateSha256,finishSha256,clearSha256} from '../../../core/sha256.js';
let stageRegistrations=0, activeHashes=0;
export const stageCounters=()=>({registrations:stageRegistrations,activeHashes});
function* hashStages(snapshot, policy){
 const cursor=createEncodedValueCursor(snapshot,policy),sha=createSha256State();policy=undefined;activeHashes++;
 try{
  let part;
  do{part=advanceEncodedValueCursor(cursor,{maxBytes:64,maxSteps:256});updateSha256(sha,part.bytes);
   yield Object.freeze({stage:'hash',bytes:part.bytes.length,last:part.done});
  }while(!part.done);
  return finishSha256(sha);
 }finally{clearEncodedValueCursor(cursor);clearSha256(sha);activeHashes--;}
}
`;
const output=code.replace(/from "(\.[^"]+)"/g,(_,p)=>`from ${JSON.stringify(pathToFileURL(path.resolve(path.dirname(owner),p)).href)}`)
 .replace(/from '(\.[^']+)'/g,(_,p)=>`from ${JSON.stringify(pathToFileURL(path.resolve(path.dirname(owner),p)).href)}`);
await writeFile('.artifacts/route-v2-proposal/job.generated.mjs',output);
await writeFile('.artifacts/route-v2-proposal/extraction.json',JSON.stringify({source:owner,sourceSHA256:createHash('sha256').update(source).digest('hex'),bodySHA256:createHash('sha256').update(source.slice(start,end)).digest('hex'),generatedSHA256:createHash('sha256').update(output).digest('hex'),productChanges:0,seams:['append original createRouteJob as generator','detach raw payload and viewport after original snapshot','replace only body hash with private cursor stages','existing same-module validatedJobs.add after full hash','count registration without exposing registry']},null,2)+'\n');
