import { compileTypeScript } from "../support/typescript.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('legend spacing declarations preserve Full/Basic creation and edit-only resets',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'legend-spacing-types-'));
  try{
    const file=path.join(directory,'spacing.mts');await writeFile(file,`
import type {ChartProgram,LegendOptions,EditLegendOptions,EditLegendLayoutOptions} from ${JSON.stringify(path.join(root,'types/index.js'))};
import type {BasicChartProgram} from ${JSON.stringify(path.join(root,'types/basic.js'))};
declare const p:ChartProgram;declare const basic:BasicChartProgram;
const creation:LegendOptions={rowPadding:0,titlePadding:20,alongOffset:-12.5};
const edit:EditLegendOptions={rowPadding:'auto',titlePadding:0,alongOffset:0};
const layout:EditLegendLayoutOptions={channel:'size',rowPadding:7,titlePadding:'auto',alongOffset:15};
p.createLegend(creation);basic.createLegend(creation);p.createGuides({legend:creation});
p.editLegend(edit);p.editLegendLayout(layout);
p.createScatterPlot({x:'x',y:'y',guides:{legend:{rowPadding:0,titlePadding:20}}});
// @ts-expect-error tangential distance is numeric
p.editLegend({alongOffset:'12'});
// @ts-expect-error creation does not accept reset strings
p.createLegend({rowPadding:'auto'});
// @ts-expect-error creation does not accept reset strings
basic.createLegend({titlePadding:'auto'});
// @ts-expect-error spacing edits accept only numbers or auto
p.editLegend({rowPadding:'7'});
// @ts-expect-error false is not a reset token
p.editLegendLayout({titlePadding:false});
// @ts-expect-error Basic retains creation-only lifecycle
basic.editLegendLayout({rowPadding:7});
// @ts-expect-error title text style does not own layout spacing
p.editLegendTitle({titlePadding:20});
// @ts-expect-error block gap and row padding are different contracts
p.editLegendBlock({target:'points',channel:'size',rowPadding:7});
`);
    const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck',
      '--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr);
  }finally{await rm(directory,{recursive:true,force:true});}
});
