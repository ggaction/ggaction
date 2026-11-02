// Research only. Do not import this generator or its output from product code.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='.artifacts/route-cursor-callsites';
await mkdir(directory,{recursive:true});
const owner='src/core/jsonText.js',input=await readFile(owner,'utf8');
const declaration='export function countJSONStringBytes(text, encodedOffset, maxBytes, label) {';
assert.equal(input.split(declaration).length,2);
let body=input.slice(input.indexOf(declaration)+declaration.length).trim();
assert.ok(body.endsWith('}'));body=body.slice(0,-1);
const exact=body;
const loop='  for (let index = 0; index < text.length; index++) {';
assert.equal(body.split(loop).length,2);
body=body.replace(loop,loop+'\n    const start = index, before = length;');
const final='  }\n  validateGeneratedItemLimit(encodedOffset + length, label, maxBytes);';
assert.equal(body.split(final).length,2);
body=body.replace(final,'    yield { start, end: index + 1, bytes: length - before };\n'+final);
await writeFile(directory+'/scalar.generated.mjs',`// Research: current count owner with one yield observation per scalar unit.\nimport {validateGeneratedItemLimit} from '../../src/core/validation.js';\nexport function* scanJSONString(text, encodedOffset, maxBytes) {\n const label='Prototype encoded bytes';\n${body}\n}\n`);
const prototype='agent_docs/impl/roadmap9/chart/tagged-cursor-evidence/prototype.mjs';
const template=await readFile(prototype,'utf8');
await writeFile(directory+'/prototype.mjs',template.replaceAll('__CORE__','../../src/core'));
const files=[owner,prototype,'src/core/sha256.js','src/core/contentDigest.js','src/core/valueEncoding.js',
  'src/core/ownData.js','src/core/immutable.js','src/grammar/graph/model.js','src/grammar/graph/inferenceBudget.js',
  'src/grammar/graph/routes/job.js','src/grammar/graph/routes/result.js','src/grammar/graph/routes/common.js',
  'src/grammar/graph/routes/edgePath.js','src/grammar/graph/routes/density.js','src/grammar/graph/routes/forceDirected.js','src/grammar/graph/routes/hierarchical.js',
  'src/grammar/graph/routes/budget.js','src/materialization/graph/routeInput.js',
  'src/materialization/graph/routeResource.js','src/materialization/graph/routeRequest.js','src/materialization/graph/routeState.js',
  'src/resources/graphRoutes.js','src/resources/graphRouteExecutor.js','src/actions/graphs/edgeRoutes.js',
  'src/actions/graphs/routeClosure.js','src/actions/graphs/screenRoutes.js','agent_docs/contract/current/EDGE_ROUTES.md'];
const sha256=text=>createHash('sha256').update(text).digest('hex');
const sources=[];
for(const path of files){
 const text=await readFile(path,'utf8');
 sources.push({path,sha256:sha256(text),seams:text.split('\n').flatMap((line,index)=>/routeValueHash|validatedJobs|cloneAndFreeze|await |onMessage|prepared\.set|requestToken|signal\)|throwIfAborted/.test(line)?[{line:index+1,text:line.trim()}]:[])});
}
await writeFile(directory+'/source.json',JSON.stringify({basis:'5ec4f4b40402521f902f643c9d49365b9658db52',productChanges:0,
  scalarTransform:'original minimum/final quota and scalar arithmetic retained; add one yield observation per original loop iteration',
  scalarBodySHA256:sha256(exact),prototype:'reuse historical research prototype, not a proposed production tag implementation',sources},null,2)+'\n');
console.log('Built research cursor from the current JSON scalar owner; product source unchanged.');
