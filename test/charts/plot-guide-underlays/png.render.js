import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {registerVisualVariantTests} from '../../support/visual-variants.js';
import {visualVariants,createPublicProgram,createPrimitiveProgram} from './manifest.js';
registerVisualVariantTests(visualVariants);

for(const ratio of [1,2])test(`opaque difference backdrop is exact and matches literal pixels at density ${ratio}`,async()=>{
  const outputs=[];
  for(const p of [createPublicProgram(),createPrimitiveProgram()]){
    const result=await renderToPNGBuffer(p,{pixelRatio:ratio});assert.equal(result.width,240*ratio);assert.equal(result.height,180*ratio);
    const c=createCanvas(result.width,result.height),ctx=c.getContext('2d');ctx.drawImage(await loadImage(result.buffer),0,0);
    assert.deepEqual([...ctx.getImageData(85*ratio,139*ratio,1,1).data],[119,119,136,255]);
    outputs.push(ctx.getImageData(0,0,result.width,result.height).data);
  }
  assert.deepEqual(outputs[0],outputs[1]);
  const p=createPublicProgram({axisUnderlay:false,borderUnderlay:false}),r=await renderToPNGBuffer(p,{pixelRatio:ratio});
  const c=createCanvas(r.width,r.height),ctx=c.getContext('2d');ctx.drawImage(await loadImage(r.buffer),0,0);
  assert.deepEqual([...ctx.getImageData(85*ratio,139*ratio,1,1).data],[136,136,136,255]);
  const normal=await renderToPNGBuffer(createPublicProgram({blend:'normal'}),{pixelRatio:ratio});
  ctx.drawImage(await loadImage(normal.buffer),0,0);
  assert.deepEqual([...ctx.getImageData(85*ratio,139*ratio,1,1).data],[255,255,0,255]);
});
