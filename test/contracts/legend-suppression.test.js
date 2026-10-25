import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTypeScript } from '../support/typescript.js';
import { describeAction } from '../../src/inspection.js';
import { chart } from '../../src/index.js';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('removeLegend exposes the optional boolean suppression contract in declarations and inspection',async()=>{
  const descriptor=describeAction(chart(),{action:'removeLegend'});
  assert.ok(JSON.stringify(descriptor).includes('suppress'));
  const directory=await mkdtemp(path.join(tmpdir(),'legend-suppression-types-'));
  try {
    const file=path.join(directory,'suppression.mts');
    await writeFile(file,`
import type {ChartProgram, RemoveLegendOptions} from ${JSON.stringify(path.join(root,'types/index.js'))};
declare const p:ChartProgram;
const options:RemoveLegendOptions={target:'plot',channels:['color'],suppress:true};
p.removeLegend(options).createGuides().createLegend({target:'plot',channels:['color']});
p.removeLegend({target:[{childPath:['plot'],id:'points'}],suppress:false});
// @ts-expect-error suppression must be boolean
p.removeLegend({suppress:'true'});
// @ts-expect-error closed legend channels
p.removeLegend({channels:['x'],suppress:true});
`);
    const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr);
  } finally { await rm(directory,{recursive:true,force:true}); }
});
