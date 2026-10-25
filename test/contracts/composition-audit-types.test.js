import { compileTypeScript } from '../support/typescript.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('declares explicit facet-source routing, color inheritance and horizontal line roles',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ggaction-composition-audit-'));
 try {
  const file=path.join(directory,'composition.mts');
  await writeFile(file,`
import type { ChartProgram } from ${JSON.stringify(path.join(root,'types/program.js'))};
declare const p:ChartProgram;
p.createAdjacentPlot({plot:{action:'createScatterPlot',inherit:{color:false},options:{x:'x',y:'y'}}});
p.createLayerPlot({plot:{action:'createLinePlot',inherit:{color:true}}});
p.encodeOpacity({target:[{childPath:['facets'],id:'plot',facetSource:true},{childPath:['other'],id:'plot'}],value:.3});
p.createLinePlot({x:{field:'value',aggregate:'sum'},y:{field:'category',fieldType:'nominal'},guides:{grid:{horizontal:{bandPosition:'boundary'}}}});
p.createLinePlot({x:{field:'year',fieldType:'quantitative'},y:{field:'value',aggregate:'mean'}});
p.createLinePlot({x:{field:'value',aggregate:'mean'},y:{field:'year',fieldType:'quantitative'}});
p.createLinePlot({x:{field:'value',aggregate:'mean'},y:{field:'date',fieldType:'temporal'}});
// @ts-expect-error A Line retains one independent position; both axes cannot aggregate.
p.createLinePlot({x:{field:'year',aggregate:'sum'},y:{field:'value',aggregate:'mean'}});
// @ts-expect-error Inheritance flags are booleans.
p.createAdjacentPlot({plot:{action:'createScatterPlot',inherit:{color:'false'}}});
// @ts-expect-error Only the persistent facet source routing flag is accepted.
p.encodeOpacity({target:{childPath:['facets'],id:'plot',facetSource:false},value:.3});
// @ts-expect-error Quantitative horizontal X is not a categorical grid.
p.createLinePlot({x:{field:'value',aggregate:'sum'},y:{field:'category',fieldType:'nominal'},guides:{grid:{vertical:{bandPosition:'boundary'}}}});
`);
  const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
 } finally {await rm(directory,{recursive:true,force:true});}
});
