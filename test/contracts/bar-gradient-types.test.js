import assert from 'node:assert/strict';import test from 'node:test';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('bar creation, editing and facade declarations share structured fill paint',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'ggaction-bar-gradient-types-'));try{const file=path.join(dir,'fill.mts');await writeFile(file,`
import type {ChartProgram,FillPaint} from ${JSON.stringify(path.join(root,'types/program.js'))};
declare const p:ChartProgram;
const fill:FillPaint={type:'linear-gradient',from:{x:0,y:1},to:{x:0,y:0},stops:[{offset:0,color:'red'},{offset:1,color:'blue'}]};
p.createBarMark({fill});p.editBarMark({fill});p.createBarPlot({x:{field:'c',fieldType:'nominal'},y:{field:'v'},bar:{fill}});p.createHistogram({field:'v',bar:{fill}});
// @ts-expect-error closed paint vocabulary
p.editBarMark({fill:{type:'radial-gradient',from:{x:0,y:1},to:{x:0,y:0},stops:[{offset:0,color:'red'},{offset:1,color:'blue'}]}});
// @ts-expect-error at least two stops
p.createBarMark({fill:{type:'linear-gradient',from:{x:0,y:1},to:{x:0,y:0},stops:[{offset:0,color:'red'}]}});
`);const r=spawnSync(path.join(root,'node_modules/.bin/tsc'),['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);}finally{await rm(dir,{recursive:true,force:true});}});
