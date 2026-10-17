import assert from "node:assert/strict";
import test from "node:test";
import {writeFile,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {createCanvas} from "@napi-rs/canvas";
import {render} from "../../../src/index.js";
import {ensureVariantMetadata} from "../../support/artifact-metadata.js";
import {resolvePngArtifactPath} from "../../support/artifact-paths.js";
import {assertDisplayedProgram} from "../../support/visual-variants.js";
import {renderWithNativeTrace} from "../../support/native-canvas-trace.js";
import {visualVariants,approvedTargetCases} from "./manifest.js";

function output(program,width,height) {
  const canvas=createCanvas(1,1);render(program,canvas.getContext("2d"));
  return {png:canvas.toBuffer("image/png"),rgba:canvas.getContext("2d").getImageData(0,0,width,height).data};
}

test("combined numeric samples has a stable literal/public PNG pair",async()=>{
  for(const variant of visualVariants) {
    const publicProgram=variant.userFacing(),primitiveProgram=variant.primitive();
    const publicOutput=output(publicProgram,variant.width,variant.height),primitiveOutput=output(primitiveProgram,variant.width,variant.height);
    const nativePublic=renderWithNativeTrace(publicProgram,variant),nativePrimitive=renderWithNativeTrace(primitiveProgram,variant);
    assert.deepEqual(nativePublic.calls,nativePrimitive.calls);
    assert.deepEqual(publicOutput.rgba,primitiveOutput.rgba,variant.variant);
    let plotInk=0;for(let y=10;y<290;y++)for(let x=10;x<400;x++){const i=(y*variant.width+x)*4;if(publicOutput.rgba[i]!==255||publicOutput.rgba[i+1]!==255||publicOutput.rgba[i+2]!==255)plotInk++;}
    assert.ok(plotInk>0,"plot-region ink");
    const artifact={scope:"charts",capability:variant.capability,chart:variant.chart,
      variant:variant.variant,title:variant.title,userFacingCallChain:variant.calls.join("\n")+";",kind:"user-facing"};
    assertDisplayedProgram({...variant,callChain:artifact.userFacingCallChain},publicProgram);
    await ensureVariantMetadata(artifact);
    const publicPath=resolvePngArtifactPath({artifact});
    const primitivePath=resolvePngArtifactPath({artifact:{...artifact,kind:"primitive"}});
    await writeFile(publicPath,publicOutput.png);
    await writeFile(primitivePath,primitiveOutput.png);
    await writeFile(path.join(path.dirname(publicPath),"evidence.json"),JSON.stringify({
      decodedPixels:"exact",plotRegionInk:true,approvedTargetCases,
      sourceSha256:createHash("sha256").update(await readFile(new URL("../../../examples/combined-legends/program.js",import.meta.url))).digest("hex"),
      primitiveSourceSha256:createHash("sha256").update(await readFile(new URL("./primitive.program.js",import.meta.url))).digest("hex"),
      nativeCallCount:nativePublic.calls.length,
      publicNativeCallsSha256:createHash("sha256").update(JSON.stringify(nativePublic.calls)).digest("hex"),
      primitiveNativeCallsSha256:createHash("sha256").update(JSON.stringify(nativePrimitive.calls)).digest("hex"),
      rootActions:publicProgram.trace.children.map(({op,args})=>({op,args})),
      childActions:Object.fromEntries(Object.entries(publicProgram.children).map(([id,child])=>[id,child.trace.children.map(({op,args})=>({op,args}))])),
      publicSha256:createHash("sha256").update(publicOutput.png).digest("hex"),
      primitiveSha256:createHash("sha256").update(primitiveOutput.png).digest("hex")
    },null,2)+"\n");
  }
});
