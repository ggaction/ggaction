import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {registerVisualVariantTests} from '../../support/visual-variants.js';
import {visualVariants,createPublicProgram,createPrimitiveProgram} from './manifest.js';
registerVisualVariantTests(visualVariants);

test('content spacing remains exact at physical double density',async()=>{
  const outputs=[];
  for(const program of[createPublicProgram(),createPrimitiveProgram()]){
    const result=await renderToPNGBuffer(program,{pixelRatio:2});
    assert.equal(result.width,640);assert.equal(result.height,480);
    const canvas=createCanvas(640,480),context=canvas.getContext('2d');
    context.drawImage(await loadImage(result.buffer),0,0);outputs.push(context.getImageData(0,0,640,480).data);
  }
  assert.deepEqual(outputs[0],outputs[1]);
});
