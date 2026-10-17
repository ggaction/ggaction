import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createCanvas} from '@napi-rs/canvas';
import {chart,render} from '../../../src/index.js';
import {serializeProgram,deserializeProgram,serializeGraphic,deserializeGraphic} from '../../../src/persistence.js';
import {exportAccessibleData} from '../../../src/accessibility.js';
import {renderToSVG} from '../../../src/renderers/svg.js';
const expected=new Map([
 ['d723a41982591a80b0c84434b5efe88efe16a757c3b92f3b15ebedf5a8de18ef',44992],
 ['d63c96f99e459e7f61a3721cb1476c05aa3b5c6365131f7d067e67126333ceb7',20707]
]);
if(process.argv.length!==4)throw new Error('Provide two preserved raw JSON paths.');
const evidence=[];
for(const path of process.argv.slice(2)){
 const started=performance.now(),bytes=fs.readFileSync(path),raw=JSON.parse(bytes);
 const sha=createHash('sha256').update(bytes).digest('hex');
 assert.equal(raw.length,expected.get(sha));
 const proofs=[];
 for(const [entry,factory] of [['Full',chart]]){
  const p=factory().createCanvas({width:290,height:290,margin:20})
   .createData({id:'raw',values:raw})
   .createComputedData({id:'horizontal',as:'horizontal',expression:{op:'toNumber',operand:{field:'Height'}}})
   .createComputedData({id:'vertical',as:'vertical',expression:{op:'toNumber',operand:{field:'Weight'}}})
   .createScatterPlot({x:{field:'horizontal',scale:{domain:[0,250]}},y:{field:'vertical',scale:{domain:[0,250]}},guides:false});
  assert.deepEqual(p.semanticSpec.datasets[0].values,raw);
  const items=p.graphicSpec.objects.scatterPlot.items;assert.equal(items.length,raw.length);
  let maximumCoordinateError=0;
  items.forEach((item,i)=>{
   assert.equal(item.id,`scatterPlot:${i}`);
   assert.equal(typeof raw[i].Height,'string');assert.equal(typeof raw[i].Weight,'string');
   const delta=Math.max(Math.abs(item.properties.x-(20+Number(raw[i].Height))),Math.abs(item.properties.y-(270-Number(raw[i].Weight))));
   maximumCoordinateError=Math.max(maximumCoordinateError,delta);assert.ok(delta<1e-12);
  });
  const restored=deserializeProgram(serializeProgram(p));assert.deepEqual(restored.graphicSpec,p.graphicSpec);
  const graphic=deserializeGraphic(serializeGraphic(p));
  const svg=renderToSVG(graphic);assert.equal((svg.match(/<circle\b/g)??[]).length,raw.length);
  const ctx=createCanvas(290,290).getContext('2d');render(graphic,ctx);
  assert.ok(ctx.getImageData(0,0,290,290).data.some((v,i)=>i%4!==3&&v<200));
  assert.equal(exportAccessibleData(p,{target:'scatterPlot'}).views[0].rows.length,raw.length);
  proofs.push({entry,pointItems:items.length,maximumCoordinateError,wholeRawRowsAndStringTypesPreserved:true,editableRoundTrip:true,graphicOnlyCanvasAndSvg:true,accessibleRows:raw.length});
 }
 evidence.push({rawSha256:sha,rows:raw.length,elapsedMilliseconds:Math.round(performance.now()-started),proofs});
}
console.log(JSON.stringify({sources:evidence,generatedItemLimit:10000,pointItemLimit:50000,workLimit:10000000,chartPixelsInspected:false},null,2));
