import assert from "node:assert/strict";
import test from "node:test";
import {createCanvas} from "@napi-rs/canvas";
import {drawRectGraphic} from "../../src/renderers/canvas/rect.js";

test("a concrete rect closes all four stroke joins like an independent native rectangle",()=>{
  for(const lineJoin of ["miter","bevel","round"])for(const lineCap of ["butt","round","square"]){
    const actual=createCanvas(80,80).getContext("2d"),expected=createCanvas(80,80).getContext("2d");
    drawRectGraphic(actual,"frame",{type:"rect",properties:{x:20,y:20,width:40,height:40,fill:"#f00000",stroke:"#ffff00",strokeWidth:8,lineJoin,lineCap}});
    expected.fillStyle="#f00000";expected.fillRect(20,20,40,40);
    expected.strokeStyle="#ffff00";expected.lineWidth=8;expected.lineJoin=lineJoin;expected.lineCap=lineCap;
    expected.strokeRect(20,20,40,40);
    assert.deepEqual(actual.getImageData(0,0,80,80).data,expected.getImageData(0,0,80,80).data,`${lineJoin}/${lineCap}`);
  }
});
