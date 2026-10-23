import assert from 'node:assert/strict';import test from 'node:test';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';const root=fileURLToPath(new URL('../../',import.meta.url));
test('computed temporal parsing declares a closed format union and recursive operand',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'ggaction-parse-time-types-'));try{const file=path.join(dir,'parse.mts');await writeFile(file,`
import type {ChartProgram,ComputedExpression,ParseTimeFormat} from ${JSON.stringify(path.join(root,'types/program.js'))};declare const p:ChartProgram;
const format:ParseTimeFormat='%d/%m/%Y';const expression:ComputedExpression={op:'parseTime',operand:{field:'date'},format};p.createComputedData({id:'dates',as:'t',expression});p.editComputedData({target:'dates',expression:{op:'parseTime',operand:{field:'date'}}});
const year:ComputedExpression={op:'datePart',part:'year',operand:expression,timeZone:'America/New_York'};
const floor:ComputedExpression={op:'floor',operand:{field:'measurement'}};
p.createComputedData({id:'year',as:'year',expression:year});p.editComputedData({target:'year',expression:floor});
// @ts-expect-error only the approved calendar year part is supported
const month:ComputedExpression={op:'datePart',part:'month',operand:{constant:0}};
// @ts-expect-error floor is unary and has no options
const invalidFloor:ComputedExpression={op:'floor',operand:{constant:1},digits:2};
// @ts-expect-error unknown format
p.createComputedData({id:'bad',as:'t',expression:{op:'parseTime',operand:{field:'date'},format:'%Q'}});
// @ts-expect-error callbacks are never expressions
p.createComputedData({id:'bad',as:'t',expression:{op:'parseTime',operand:()=>new Date()}});
`);const r=spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),'--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);}finally{await rm(dir,{recursive:true,force:true});}});
