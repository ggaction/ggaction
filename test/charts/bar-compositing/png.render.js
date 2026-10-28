import assert from "node:assert/strict";
import test from "node:test";
import {writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {createCanvas} from "@napi-rs/canvas";
import {render} from "../../../src/index.js";
import {ensureVariantMetadata} from "../../support/artifact-metadata.js";
import {resolvePngArtifactPath} from "../../support/artifact-paths.js";
import {assertDisplayedProgram} from "../../support/visual-variants.js";
import {variants,createPublicProgram,createPrimitiveProgram} from "./manifest.js";

function output(program) {
  const canvas=createCanvas(1,1);render(program,canvas.getContext("2d"));
  return {png:canvas.toBuffer("image/png"),rgba:canvas.getContext("2d").getImageData(0,0,200,200).data};
}

test("approved blend sources has stable literal/public PNG pairs",async()=>{
  for(const variant of variants) {
    const publicProgram=createPublicProgram(variant),primitiveProgram=createPrimitiveProgram(variant);
    const publicOutput=output(publicProgram),primitiveOutput=output(primitiveProgram);
    assert.deepEqual(publicOutput.rgba,primitiveOutput.rgba,variant.variant);
    assert.ok([[100,100],[100,42]].some(([x,y])=>[0,1,2].some(channel=>publicOutput.rgba[(y*200+x)*4+channel]!==publicOutput.rgba[channel])),"plot-region ink");
    const artifact={scope:"charts",capability:variant.capability,chart:variant.chart,
      variant:variant.variant,title:variant.title,userFacingCallChain:variant.calls.join("\n")+";",kind:"user-facing"};
    assertDisplayedProgram({...variant,callChain:artifact.userFacingCallChain},publicProgram);
    await ensureVariantMetadata(artifact);
    const publicPath=resolvePngArtifactPath({artifact});
    const primitivePath=resolvePngArtifactPath({artifact:{...artifact,kind:"primitive"}});
    await writeFile(publicPath,publicOutput.png);
    await writeFile(primitivePath,primitiveOutput.png);
    await writeFile(path.join(path.dirname(publicPath),"evidence.json"),JSON.stringify({
      decodedPixels:"exact",plotRegionInk:true,
      publicSha256:createHash("sha256").update(publicOutput.png).digest("hex"),
      primitiveSha256:createHash("sha256").update(primitiveOutput.png).digest("hex")
    },null,2)+"\n");
  }
});
