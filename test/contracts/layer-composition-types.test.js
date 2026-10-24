import {compileTypeScript} from '../support/typescript.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('native layering and read-only composition inspection have discriminated public types',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ggaction-layer-types-'));
 try{
 const file=path.join(dir,'test.mts');await writeFile(file,`
import {chart} from ${JSON.stringify(path.join(root,'types/index.js'))};
import {getPlotComposition} from ${JSON.stringify(path.join(root,'types/inspection.js'))};
const p=chart().createLayerPlot({id:'summary',source:'points',plot:{action:'createBoxPlot',options:{width:{band:.4},outliers:false}},placement:'back'});
p.createLayerPlot({plot:{action:'createParallelCoordinates',options:{dimensions:[{field:'a',fieldType:'quantitative',scale:{id:'a-scale'}},'b']}}});
p.createAdjacentPlot({plot:{action:'createAreaPlot'}});
getPlotComposition(p,{target:{childPath:['left'],id:'summary'}}).channels.y.measurement.unit;
// @ts-expect-error outer id owns the chart identity
p.createLayerPlot({plot:{action:'createBoxPlot',options:{id:'ignored'}}});
// @ts-expect-error closed native constructor vocabulary
p.createLayerPlot({plot:{action:'arbitraryPlot'}});
// @ts-expect-error placement is semantic, not graphic z index
p.createLayerPlot({plot:{action:'createScatterPlot'},placement:20});
// @ts-expect-error Box width uses the native width object
p.createLayerPlot({plot:{action:'createBoxPlot',options:{width:40}}});
`);
 const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file]);assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
 }finally{await rm(dir,{recursive:true,force:true});}
});
