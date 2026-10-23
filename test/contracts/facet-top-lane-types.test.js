import { compileTypeScript } from "../support/typescript.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('facet top lane declarations keep closed values, canonical state and Full-only composition',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'facet-top-lane-types-'));
  try{
    const file=path.join(directory,'spacing.mts');await writeFile(file,`
import type {ChartProgram,FacetTopLaneMode,FacetOptions,FacetGridOptions,RepeatChartsOptions,FacetCompositionSpec} from ${JSON.stringify(path.join(root,'types/index.js'))};
import type {BasicChartProgram} from ${JSON.stringify(path.join(root,'types/basic.js'))};
declare const p:ChartProgram;declare const basic:BasicChartProgram;
const mode:FacetTopLaneMode='shared';
const facet:FacetOptions={field:'panel',spacing:'plot',topLane:mode};
const grid:FacetGridOptions={rows:{field:'r'},columns:{field:'c'},spacing:'plot',topLane:mode};
const repeat:RepeatChartsOptions={channel:'y',fields:['a','b'],spacing:'plot',topLane:'stacked'};
p.facet(facet);p.facetGrid(grid);p.repeatCharts(repeat);
p.editCompositionLayout({topLane:'shared'});p.editCompositionLayout({spacing:'canvas',topLane:'stacked'});
p.editCompositionLayout({topLane:undefined});
declare const state:FacetCompositionSpec;
const canonical:'shared'|undefined=state.topLane;
// @ts-expect-error only stacked and shared are accepted
p.facet({field:'panel',topLane:'auto'});
// @ts-expect-error top lane is not numeric
p.editCompositionLayout({topLane:0});
// @ts-expect-error basic has no composition action
basic.facet(facet);
// @ts-expect-error canonical state does not persist default stacked
const invalid:FacetCompositionSpec={...state,topLane:'stacked'};

`);
    const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck',
      '--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr);
  }finally{await rm(directory,{recursive:true,force:true});}
});
