import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {renderToPNGBuffer} from '../../../src/renderers/png.js';
import {registerVisualVariantTests} from '../../support/visual-variants.js';
import {visualVariants,createPublicProgram,createPrimitiveProgram} from './manifest.js';
registerVisualVariantTests(visualVariants);

test('shared facet top lane remains exact at physical double density',async()=>{
  const outputs=[];
  for(const program of[createPublicProgram(),createPrimitiveProgram()]){
    const result=await renderToPNGBuffer(program,{pixelRatio:2});
    assert.equal(result.width,1016);assert.equal(result.height,524);
    const canvas=createCanvas(1016,524),context=canvas.getContext('2d');
    context.drawImage(await loadImage(result.buffer),0,0);outputs.push(context.getImageData(0,0,1016,524).data);
  }
  assert.deepEqual(outputs[0],outputs[1]);
});
