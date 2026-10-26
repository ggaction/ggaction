import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileTypeScript} from '../support/typescript.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('guide visibility types accept retained partial edits and reject non-boolean flags',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ggaction-guide-visibility-'));
 try {
  const file=path.join(dir,'visibility.mts');
  await writeFile(file,`
import type {ChartProgram} from ${JSON.stringify(path.join(root,'types/index.js'))};
declare const p:ChartProgram;
p.editAxes({x:{visible:false},y:{labels:{visible:false}}});
p.editXAxis({visible:true,line:{visible:false},ticksAndLabels:{ticks:{visible:false},labels:{visible:true,fontSize:13}}});
p.editThetaAxis({visible:false,title:{visible:true}});
p.editRadialAxis({labels:{visible:false}});
p.editParallelAxis({field:'x',visible:false,ticksAndLabels:{labels:{visible:true}}});
p.editGrid({horizontal:{visible:false},radial:{visible:true}});
p.editLegend({target:'plot',visible:false,labels:{visible:false},titleStyle:{visible:true}});
p.editLegend({target:'plot',channel:'color',itemsOffset:{x:-12,y:6}});
p.editLegend({itemsOffset:{y:0}}).editLegend({itemsOffset:'auto'});
// @ts-expect-error body offsets require numeric coordinates
p.editLegend({itemsOffset:{x:'12'}});
// @ts-expect-error body offsets reject unknown coordinates
p.editLegend({itemsOffset:{z:12}});
// @ts-expect-error new placement is an edit, not a creation option
p.createLegend({itemsOffset:{x:12}});
// @ts-expect-error requires boolean
p.editXAxis({visible:'false'});
// @ts-expect-error nested visibility requires boolean
p.editLegend({labels:{visible:0}});
// @ts-expect-error grouped and separate parallel tick selectors remain exclusive
p.editParallelAxis({field:'x',ticksAndLabels:{labels:{visible:false}},ticks:{visible:true}});
// @ts-expect-error creation retains its existing contract
p.createXAxis({visible:false});
`);
  const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 } finally {await rm(dir,{recursive:true,force:true});}
});
