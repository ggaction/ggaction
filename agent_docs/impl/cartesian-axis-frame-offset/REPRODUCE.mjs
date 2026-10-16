import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";

const base=chart().createCanvas({width:900,height:800,margin:{left:100,top:100,right:200,bottom:200}})
  .createData({values:[{x:0,y:0},{x:20,y:50}]})
  .createScatterPlot({x:"x",y:"y",guides:false});
const original=serializeProgram(base),rejections=[];
for(const [operation,run] of [
  ["complete creation",()=>base.createAxes({x:{offset:20},y:{offset:20}})],
  ["whole X edit",()=>base.createAxes({x:{},y:{}}).editXAxis({offset:20})],
  ["whole Y edit",()=>base.createAxes({x:{},y:{}}).editYAxis({offset:20})]
]){
  let rejection;try{run();}catch(error){rejection={name:error.name,message:error.message};}
  assert.match(rejection?.message??"",/offset/);rejections.push({operation,...rejection});
}
assert.equal(serializeProgram(base),original);
const surrogate=base.createAxes({x:{ticksAndLabels:{labels:{offset:27}}},y:{ticksAndLabels:{labels:{offset:27}}}});
const x=surrogate.graphicSpec.objects.xAxisLine.properties,y=surrogate.graphicSpec.objects.yAxisLine.properties;
assert.equal(x.y1,600);assert.equal(y.x1,100);
assert.deepEqual(surrogate.graphicSpec.objects.scatterPlot,base.graphicSpec.objects.scatterPlot);
const result={status:"gap-confirmed",rejections,parentImmutable:true,marksUnchanged:true,
  genericPlot:{left:100,top:100,width:600,height:500},requestedOutwardOffset:20,
  labelOnlySurrogate:{xAxisLine:x,yAxisLine:y},expectedCompleteFrame:{bottomAxisY:620,leftAxisX:80},
  sourceModuleBindings:["src/actions/guides/axes/axis.js","src/actions/guides/axes/edit.js","types/program.d.ts"].map(path=>({path,
    sha256:createHash("sha256").update(readFileSync(new URL(`../../../${path}`,import.meta.url))).digest("hex")})),
  newPublicAPIImplemented:false,modelCalls:0,chartPixelsInspected:false};
writeFileSync(new URL("REPRODUCTION.json",import.meta.url),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
