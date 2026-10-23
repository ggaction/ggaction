import { compileTypeScript } from "../support/typescript.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('axis and border underlay types keep Boolean placement on complete Cartesian resources',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'plot-underlay-types-'));
  try{
    const file=path.join(directory,'spacing.mts');await writeFile(file,`
import type {ChartProgram} from ${JSON.stringify(path.join(root,'types/index.js'))};
import type {BasicChartProgram} from ${JSON.stringify(path.join(root,'types/basic.js'))};
declare const p:ChartProgram;declare const basic:BasicChartProgram;
p.createCanvas({plotBorder:{underlay:true}});basic.createCanvas({plotBorder:{color:'gray',lineWidth:1,underlay:true}});
p.editCanvas({plotBorder:{underlay:false}});
p.createXAxis({underlay:true}).editXAxis({underlay:false}).editXAxis({underlay:undefined});
p.createYAxis({id:'right',position:'right',underlay:true}).editYAxis({target:'right',underlay:false,offset:4});
p.createAxes({x:{underlay:true},y:[{id:'right',position:'right',underlay:true}]});
p.createGuides({axes:{x:{underlay:true},y:false}});
p.createScatterPlot({x:'x',y:'y',guides:{axes:{x:{underlay:true}}}});
basic.createXAxis({underlay:true});basic.createAxes({x:{underlay:true},y:false});
p.editGraphics({target:'container',property:'children',value:['back','front'] as const});
// @ts-expect-error underlay is Boolean
p.editXAxis({underlay:'before'});
// @ts-expect-error border underlay is Boolean
basic.createCanvas({plotBorder:{underlay:0}});
// @ts-expect-error focused component is not a complete-axis policy owner
p.editXAxisLine({underlay:true});
// @ts-expect-error nested line appearance is not a complete-axis policy owner
p.createXAxis({line:{underlay:true}});
// @ts-expect-error Polar axis creation does not accept Cartesian underlay
p.createThetaAxis({underlay:true});
// @ts-expect-error Parallel axis creation does not accept Cartesian underlay
p.createParallelAxis({field:'x',underlay:true});
// @ts-expect-error Basic retains creation-only chart authoring
basic.editXAxis({underlay:true});
`);
    const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck',
      '--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr);
  }finally{await rm(directory,{recursive:true,force:true});}
});
