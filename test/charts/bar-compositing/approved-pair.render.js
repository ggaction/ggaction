import assert from "node:assert/strict";
import test from "node:test";
import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {createCanvas} from "@napi-rs/canvas";
import {render} from "../../../src/index.js";
import {variants,createPublicProgram,createPrimitiveProgram} from "./manifest.js";

function output(program) {
  const canvas=createCanvas(1,1);render(program,canvas.getContext("2d"));
  return {png:canvas.toBuffer("image/png"),rgba:canvas.getContext("2d").getImageData(0,0,200,200).data};
}

test("approved difference source has stable literal/public PNG pairs",async()=>{
  for(const variant of variants) {
    const publicProgram=createPublicProgram(variant),primitiveProgram=createPrimitiveProgram(variant);
    const publicOutput=output(publicProgram),primitiveOutput=output(primitiveProgram);
    assert.deepEqual(publicOutput.rgba,primitiveOutput.rgba,variant.variant);
    assert.deepEqual(publicProgram.trace.children.map(node=>node.op),[
      "createCanvas","createData","createBarPlot","encodeBarWidth","editBarMark","editBarMark"
    ]);
    assert.deepEqual(publicProgram.trace.children.map(node=>node.args),[
      {width:200,height:200,margin:40,background:variant.background},{valuesCount:1},
      {x:"category",y:{field:"value",aggregate:"sum"},guides:false},{pixels:80},
      {fill:"#f00000",stroke:"#ffff00",strokeWidth:8},{blend:"difference",opacity:variant.opacity}
    ]);
    assert.ok(publicOutput.rgba[(100*200+100)*4]!==publicOutput.rgba[0],"plot-region ink");
    const directory=path.join(".artifacts/test/png/charts",variant.capability,variant.chart,variant.variant);
    await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,"public.png"),publicOutput.png);
    await writeFile(path.join(directory,"primitive.png"),primitiveOutput.png);
    await writeFile(path.join(directory,"variant.json"),JSON.stringify({
      ...variant,publicCallChain:variant.calls.join("\n"),decodedPixels:"exact",plotRegionInk:true,
      publicSha256:createHash("sha256").update(publicOutput.png).digest("hex"),
      primitiveSha256:createHash("sha256").update(primitiveOutput.png).digest("hex")
    },null,2)+"\n");
  }
});
