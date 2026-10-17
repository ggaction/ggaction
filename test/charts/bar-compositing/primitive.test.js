import assert from "node:assert/strict";
import test from "node:test";
import {createPrimitiveProgram} from "./primitive.program.js";
test("the compositing primitive owns one literal bar in the plot",()=>{
  const program=createPrimitiveProgram();
  assert.deepEqual(program.semanticSpec.layers,[]);
  assert.deepEqual(program.graphicSpec.order,["canvas"]);
  assert.deepEqual(program.graphicSpec.objects["plot-main"].children,["barPlot"]);
  assert.deepEqual(program.graphicSpec.objects.barPlot.items,[{id:"barPlot:0",properties:{
    x:60,y:40,width:80,height:120,fill:"#f00000",stroke:"#ffff00",strokeWidth:8,
    opacity:1,blend:"difference"
  }}]);
});
