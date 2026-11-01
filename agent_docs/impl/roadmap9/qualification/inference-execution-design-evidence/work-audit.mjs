import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolveInferredGraphInput as product} from '../../../../../src/grammar/graph/input.js';
import {encodeValue} from '../../../../../src/core/valueEncoding.js';
import {canonicalJSON} from '../../../../../src/core/contentDigest.js';
await mkdir('.artifacts/inference-execution',{recursive:true});
const oracleSource=execFileSync('git',['show','06d497cf0096e057c414fcda57a185562055d2f6:test/oracles/inference-grid.js'],{encoding:'utf8'});
const {expectedGridNeighbors}=await import('data:text/javascript;base64,'+Buffer.from(oracleSource).toString('base64'));
const validation=await readFile('src/core/validation.js','utf8');
const original='return validateGeneratedItemLimit(value, label, MAX_WORK_ITEMS);';assert.equal(validation.split(original).length,2);
const observed=validation.replace(original,`const record=globalThis.__inferenceWorkAudit[label] ??= {calls:0,maximum:0};record.calls++;record.maximum=Math.max(record.maximum,value);if(['Graph exact search work','Graph model work'].includes(label)){if(!Number.isSafeInteger(value)||value<0||value>200000000)throw Error('Diagnostic safety ceiling');return value;}return validateGeneratedItemLimit(value,label,MAX_WORK_ITEMS);`);
await build({stdin:{contents:"export {resolveInferredGraphInput} from './src/grammar/graph/input.js';export {indexGraphModel} from './src/grammar/graph/model.js';",resolveDir:process.cwd(),sourcefile:'work-audit-entry.mjs'},bundle:true,format:'esm',platform:'node',outfile:'.artifacts/inference-execution/instrumented.mjs',plugins:[{name:'diagnostic-work-observer',setup(b){b.onLoad({filter:/\/core\/validation\.js$/},()=>({contents:observed,loader:'js'}));}}]});
const audited=await import(pathToFileURL(path.resolve('.artifacts/inference-execution/instrumented.mjs'))),cases=[];
for(const n of [100,1000,10000]){
 const side=Math.ceil(Math.sqrt(n)),rows=Array.from({length:n},(_,i)=>{const id=n-1-i;return{id,x:id%side,y:Math.floor(id/side)};});
 const input={nodeKey:'id',ruleId:'nearest',rule:'knn',features:['x','y'],metric:'manhattan',maxNodes:n,maxEdges:n*10,options:{k:10,symmetrize:'directed',search:{mode:'exact',algorithm:'kd-tree'}}};
 const expected=expectedGridNeighbors(rows);globalThis.__inferenceWorkAudit={};
 const start=performance.now(),result=audited.resolveInferredGraphInput(rows,input),elapsed=performance.now()-start;
 assert.equal(result.model.nodes.length,n);assert.equal(result.model.edges.length,n*10);
 result.model.edges.forEach((edge,i)=>{assert.deepEqual(edge.sourceRows,[expected[i].sourceIndex,expected[i].targetIndex]);assert.equal(edge.weight,expected[i].weight);assert.equal(edge.sourceKey,result.model.nodes[expected[i].sourceIndex].key);assert.equal(edge.targetKey,result.model.nodes[expected[i].targetIndex].key);});
 const beforeIndex=structuredClone(globalThis.__inferenceWorkAudit);const index=audited.indexGraphModel(result.model,{maxNodes:n,maxEdges:n*10});
 const {edges:discardedEdges,preparation,...diagnostics}=result.inference;
 if(preparation!==undefined){const {vectors:discardedVectors,...retained}=preparation;diagnostics.preparation=retained;}
 const inputs=[{kind:'data',id:'nodes',logicalId:'nodes:0',revision:0}];
 const candidateJob={schemaVersion:1,algorithmVersion:'1',definition:result.options,inputs,rows,inputHash:'0'.repeat(64)};
 const candidateCompletion={complete:true,inputHash:'0'.repeat(64),resultHash:'0'.repeat(64),result:{model:result.model,diagnostics}};
 const sizeStart=performance.now();
 const encodedBytes=value=>Buffer.byteLength(canonicalJSON(encodeValue(value)));
 const transport={scope:'Proposed ordinary data-job and normalized model completion; no candidate graph. Hash text has the exact SHA-256 length; no public job schema exists yet.',jobJSONBytes:Buffer.byteLength(JSON.stringify(candidateJob)),completionJSONBytes:Buffer.byteLength(JSON.stringify(candidateCompletion)),jobEncodedBytes:encodedBytes(candidateJob),completionEncodedBytes:encodedBytes(candidateCompletion)};
 transport.diagnosticEncodingMs=performance.now()-sizeStart;
 let productStatus;try{const native=product(rows,input);assert.deepEqual(native,result);productStatus='exact-full-result-equal';}catch(error){if(n!==10000)throw error;productStatus={error:error.message};}
 cases.push({n,k:10,edges:result.model.edges.length,inputHash:createHash('sha256').update(JSON.stringify(rows)).digest('hex'),resultHash:createHash('sha256').update(JSON.stringify(result)).digest('hex'),search:result.inference.search,constructionWork:beforeIndex,indexWork:index.work,afterIndex:globalThis.__inferenceWorkAudit,productStatus,diagnosticElapsedMs:elapsed,modelJSONBytes:Buffer.byteLength(JSON.stringify(result.model)),transport,keyText:{nodeUnits:result.model.nodes.reduce((s,x)=>s+x.key.length,0),edgeUnits:result.model.edges.reduce((s,x)=>s+x.key.length,0),endpointUnits:result.model.edges.reduce((s,x)=>s+x.sourceKey.length+x.targetKey.length,0),adjacencyUnits:result.model.adjacency.reduce((s,x)=>s+x.key.length+[...x.incoming,...x.outgoing,...x.neighbors].reduce((t,k)=>t+k.length,0),0)}});
 console.log(JSON.stringify(cases.at(-1)));
}
await writeFile('.artifacts/inference-execution/work-audit.json',JSON.stringify({scope:'Diagnostic only: two work rejection sites observed through 200M temporary safety ceiling, production guard unchanged. Not a supported-size or timing qualification.',source:'c48f89e9d',node:process.version,oracleRevision:'06d497cf0096e057c414fcda57a185562055d2f6',oracleSHA256:createHash('sha256').update(oracleSource).digest('hex'),cases},null,2)+'\n');
