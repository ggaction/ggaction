import {findRepository} from './environment.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(findRepository(),'package.json'));
const Ajv=require('ajv'),formats=require('ajv-formats');
const sources=JSON.parse(fs.readFileSync(path.join(base,'evidence/corpus-schema-sources.json'))),validators=new Map(),errors=[];
for(const s of sources){try{if(s.status!=='fetched'){errors.push({url:s.url,error:s.error});continue;}const ajv=new Ajv({strict:false,validateFormats:false,allErrors:false,allowUnionTypes:true});ajv.addMetaSchema(require('ajv/dist/refs/json-schema-draft-06.json'));formats(ajv);validators.set(s.url,ajv.compile(JSON.parse(fs.readFileSync(path.join(base,'evidence',s.file)))));}catch(e){errors.push({url:s.url,error:e.message});}}
const files=JSON.parse(fs.readFileSync(path.join(base,'evidence/corpus-files.json'))),results=[],groups={};
for(const f of files){
 if(f.classification!=='chart-spec-candidate')continue;
 let status='unknown-no-declared-schema',failure=[];
 if(f.schema){const v=validators.get(f.schema);if(v){const ok=v(JSON.parse(fs.readFileSync(path.join(base,'sources/chart-llm',f.path))));status=ok?'valid-against-declared-schema':'invalid-against-declared-schema';if(!ok)failure=v.errors.slice(0,12);}else status='unknown-unavailable-schema';}
 const r={path:f.path,group:f.group,schema:f.schema||null,status,errors:failure};results.push(r);groups[f.group]??={};groups[f.group][status]=(groups[f.group][status]||0)+1;
}
const counts={};for(const r of results)counts[r.status]=(counts[r.status]||0)+1;
const summary={method:'Ajv against fetched declared official schemas only, with validateFormats:false: format keyword semantic validation is excluded. Unknown schema-free specs are not assumed v5. Valid means structural/type JSON Schema validity only, not compilability, data availability, behavior, visual fidelity, or source-correctness. A schema failure may reflect legitimate old grammar under an upgraded $schema or annotations; retain source and classify repair explicitly.',schemaSourceFile:'corpus-schema-sources.json',validationDate:'2026-10-27',schemaCompileErrors:errors,candidates:results.length,counts,groups};
fs.writeFileSync(path.join(base,'evidence/corpus-schema-validation.json'),JSON.stringify(results,null,2));fs.writeFileSync(path.join(base,'evidence/corpus-schema-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
