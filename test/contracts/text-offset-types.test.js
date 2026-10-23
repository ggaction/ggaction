import assert from 'node:assert/strict';import test from 'node:test';import{spawnSync}from'node:child_process';import{mkdtemp,rm,writeFile}from'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('numeric Text offset types retain exact unions and Basic exclusion',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'ggaction-text-offset-types-'));try{const file=path.join(dir,'consumer.mts');await writeFile(file,`
import type {ChartProgram,TextOffsetEncodingOptions} from ${JSON.stringify(path.join(root,'types/program.js'))};
import {chart as basic} from ${JSON.stringify(path.join(root,'types/basic.js'))};
declare const p:ChartProgram;
const field:TextOffsetEncodingOptions={field:'shift'};
const literal:TextOffsetEncodingOptions={target:'text',value:-6};
p.encodeDx(field).encodeDy(literal).encodeChannels({target:'text',channels:{dx:{field:'shift'},dy:{value:0}}}).removeEncoding({channel:'dx'});
// @ts-expect-error exactly one source is required
p.encodeDx({});
// @ts-expect-error field and value are mutually exclusive
p.encodeDx({field:'shift',value:2});
// @ts-expect-error direct pixel offsets have no scale
p.encodeDy({field:'shift',scale:{}});
// @ts-expect-error numeric fields infer their fixed field type
p.encodeDx({field:'shift',fieldType:'quantitative'});
// @ts-expect-error values are numeric
p.encodeDy({value:'2'});
// @ts-expect-error Basic retains its Text family exclusion
basic().encodeDx({value:1});
// @ts-expect-error Basic retains its Text family exclusion
basic().encodeDy({field:'shift'});
`);const r=spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),'--noEmit','--strict','--exactOptionalPropertyTypes','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);}finally{await rm(dir,{recursive:true,force:true});}});
