import { compileTypeScript } from "../support/typescript.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {chart} from '../../src/index.js';
import {serializeProgram,deserializeProgram,serializeGraphic,deserializeGraphic} from '../../src/persistence.js';
import {decodeValue,encodeValue} from '../../src/persistence/codec.js';
import {clippingControl,clippingFrame} from '../support/plot-clipping.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
test('declares clipping on supported Cartesian marks and their facade styles only',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ggaction-clip-types-'));
 try{
  const file=path.join(dir,'clip.mts');
  await writeFile(file,`
import type {ChartProgram,GraphicClipRect} from ${JSON.stringify(path.join(root,'types/index.js'))};
import type {BasicChartProgram} from ${JSON.stringify(path.join(root,'types/basic.js'))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const rect: GraphicClipRect={x:1,y:2,width:3,height:4};
p.createPointMark({clip:true});p.editPointMark({clip:false});
p.createLineMark({clip:true});p.editLineMark({clip:false});
p.createAreaMark({clip:true});p.editAreaMark({clip:false});
p.createBarMark({clip:true});p.editBarMark({clip:false});
p.createRectMark({clip:true});p.editRectMark({clip:false});
p.createRuleMark({clip:true});p.editRuleMark({clip:false});
p.createTextMark({clip:true});p.editTextMark({clip:false});
p.createTickMark({clip:true});p.editTickMark({clip:false});
basic.createPointMark({clip:true}); basic.createLineMark({clip:true}); basic.createRectMark({clip:true});
p.createScatterPlot({x:'x',y:'y',point:{clip:true}});
p.createLinePlot({x:'x',y:'y',line:{clip:true}});
p.createAreaPlot({x:'x',y:'y',area:{clip:true}});
p.createDensityPlot({field:'x',area:{clip:true}});
p.createHistogram({field:'x',bar:{clip:true}});
p.createBarPlot({x:'cat',y:'y',bar:{clip:true}});
p.createHeatmap({x:'cat',y:'cat',rect:{clip:true}});
p.createTextPlot({x:'x',y:'y',text:'label',style:{clip:true}});
p.createECDFPlot({field:'x',line:{clip:true}});
p.createLollipopPlot({category:'cat',value:'y',stem:{clip:true},point:{clip:true}});
// @ts-expect-error bool vocabulary
p.editPointMark({clip:'true'});
// @ts-expect-error Arc is not a Cartesian clipping family
p.createArcMark({clip:true});
// @ts-expect-error Polar facade does not advertise Cartesian clip
p.createPolarScatterPlot({theta:'x',radius:'y',point:{clip:true}});
// @ts-expect-error Parallel facade does not advertise Cartesian clip
p.createParallelCoordinates({dimensions:['x','y'],line:{clip:true}});
// @ts-expect-error Radar facade does not advertise Cartesian clip
p.createRadarPlot({category:'cat',value:'y',line:{clip:true}});
void rect;
`);
  const r=compileTypeScript(['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{encoding:'utf8',cwd:root});
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('editable and graphic-only snapshots validate owner rectangles and item boundaries',()=>{
 const p=clippingControl(chart).editPointMark({target:'scatterPlot',clip:true});
 for(const [serialize,deserialize]of [[serializeProgram,deserializeProgram],[serializeGraphic,deserializeGraphic]]){
  for(const mutate of [s=>{s.objects.scatterPlot.clip={...clippingFrame,width:-1};},
   s=>{s.objects.scatterPlot.clip=false;},s=>{s.objects.canvas.clip=clippingFrame;},
   s=>{s.objects.scatterPlot.items[0].clip=clippingFrame;}]){
    const envelope=JSON.parse(serialize(p)),decoded=decodeValue(envelope.payload),graphics=decoded.graphicSpec??decoded;
    mutate(graphics);envelope.payload=encodeValue(decoded);assert.throws(()=>deserialize(JSON.stringify(envelope)),/clip|member|property|Unknown|must contain exactly/);
  }
 }
 const envelope=JSON.parse(serializeProgram(p)),decoded=decodeValue(envelope.payload);
 decoded.materializationConfigs.marks.scatterPlot.clip='yes';envelope.payload=encodeValue(decoded);
 assert.throws(()=>deserializeProgram(JSON.stringify(envelope)),/boolean/);
});
