import {findRepository} from './environment.mjs';
import fs from 'node:fs';import path from 'node:path';import{createRequire}from'node:module';import{fileURLToPath}from'node:url';import{createHash}from'node:crypto';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(findRepository(),'package.json')),Ajv=require('ajv');
const ajv=new Ajv({strict:false,validateFormats:false,allErrors:false});ajv.addMetaSchema(require('ajv/dist/refs/json-schema-draft-06.json'));const validators=new Map();
for(const s of JSON.parse(fs.readFileSync(path.join(base,'evidence/corpus-schema-sources.json'))))if(s.status==='fetched')validators.set(s.url,ajv.compile(JSON.parse(fs.readFileSync(path.join(base,'evidence',s.file)))));
const files=JSON.parse(fs.readFileSync(path.join(base,'evidence/corpus-files.json'))),results=[];
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
const looks=o=>o&&typeof o==='object'&&!Array.isArray(o)&&(o.$schema?.includes?.('vega')||(('mark'in o)&&('encoding'in o))||['layer','hconcat','vconcat','concat'].some(k=>Array.isArray(o[k]))||(o.spec&&(o.facet||o.repeat)));
for(const f of files.filter(x=>x.classification!=='chart-spec-candidate')){
 function walk(o,pointer,serialized=false){
  if(looks(o)){const v=validators.get(o.$schema);const valid=v?v(o):null;results.push({path:f.path,pointer,serializedJsonString:serialized,schema:o.$schema||null,schemaStatus:v?(valid?'valid-against-declared-schema':'invalid-against-declared-schema'):o.$schema?'unknown-unavailable-schema':'unknown-no-declared-schema',canonicalJsonSha256:createHash('sha256').update(canonical(o)).digest('hex'),spec:o});return;}
  if(Array.isArray(o))o.forEach((x,i)=>walk(x,pointer+'/'+i,serialized));else if(o&&typeof o==='object')for(const[k,v]of Object.entries(o))walk(v,pointer+'/'+k.replaceAll('~','~0').replaceAll('/','~1'),serialized);
  else if(typeof o==='string'&&/^\s*[\[{]/.test(o)){try{const parsed=JSON.parse(o);if(parsed!==o)walk(parsed,pointer,true);}catch{}}
 }
 walk(JSON.parse(fs.readFileSync(path.join(base,'sources/chart-llm',f.path))), '');
}
const byFile={},status={};for(const r of results){byFile[r.path]=(byFile[r.path]||0)+1;status[r.schemaStatus]=(status[r.schemaStatus]||0)+1;}
const summary={method:'Recursively inspect all 67 non-root-candidate JSON files, including JSON-encoded strings; maximal chart candidate nodes are counted once, composition children are not independent originals. Structure screening can identify data-shaped false positives; source interpretation remains necessary.',embeddedCandidates:results.length,uniqueEmbeddedJson:new Set(results.map(x=>x.canonicalJsonSha256)).size,byFile,schemaStatus:status};
fs.writeFileSync(path.join(base,'evidence/corpus-embedded-specs.json'),JSON.stringify(results,null,2));fs.writeFileSync(path.join(base,'evidence/corpus-embedded-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
