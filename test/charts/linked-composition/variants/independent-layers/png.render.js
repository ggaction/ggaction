import test from 'node:test';
import { createVariantMetadata } from '../../../../support/artifact-paths.js';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { renderToPNGBuffer } from '../../../../../src/renderers/png.js';
import { deserializeProgram, serializeProgram } from '../../../../../src/persistence.js';
import { build, buildPrimitive, publicCallChain, variants } from './manifest.js';
for (const variant of variants) test(`${variant.id}: reproducible rendered chart`, async () => {
 const program=build(variant), result=await renderToPNGBuffer(program);
 const restored=await renderToPNGBuffer(deserializeProgram(serializeProgram(program)));
 assert.deepEqual(result.buffer,restored.buffer);
 assert.ok(result.bytes>4000);
 const primitive=await renderToPNGBuffer(buildPrimitive(variant));
 const decoded=async buffer=>{const image=await loadImage(buffer), canvas=createCanvas(image.width,image.height),context=canvas.getContext('2d');context.drawImage(image,0,0);return {context,width:image.width,height:image.height,pixels:context.getImageData(0,0,image.width,image.height).data};};
 const target=await decoded(result.buffer), baseline=await decoded(primitive.buffer);
 assert.equal(target.width,baseline.width);assert.equal(target.height,baseline.height);
 assert.deepEqual(target.pixels,baseline.pixels,'new layer call matches the approved explicit native composition');
 const canvas=variant.calls.find(call=>call.method==='createCanvas').args;
 const plot={x:canvas.margin.left,y:canvas.margin.top,...canvas.plot};
 const pixels=target.context.getImageData(plot.x,plot.y,plot.width,plot.height).data;
 let ink=0;for(let offset=0;offset<pixels.length;offset+=4)if(Math.min(pixels[offset],pixels[offset+1],pixels[offset+2])<180)ink++;
 assert.ok(ink>1000,'plot region contains the approved marks');
 assert.deepEqual(program.trace.children.map(node=>({method:node.op,args:node.args})),variant.calls.map(call=>call.method==='createData'
   ? {method:call.method,args:{id:call.args.id,valuesCount:call.args.values.length}} : call));
 assert.deepEqual(program.semanticSpec.datasets.find(dataset=>dataset.id==='observations').values,variant.calls.find(call=>call.method==='createData').args.values);
 const dir=new URL(`../../../../../.artifacts/test/png/charts/linked-composition/independent-layers/${variant.id}/`,import.meta.url);
 await mkdir(dir,{recursive:true});
 await writeFile(new URL('user-facing.png',dir),result.buffer);
 await writeFile(new URL('primitive.png',dir),primitive.buffer);
 await writeFile(new URL('variant.json',dir),JSON.stringify(createVariantMetadata({scope:'charts',kind:'primitive',
  capability:'linked-composition',chart:'independent-layers',variant:variant.id,title:variant.title,
  userFacingCallChain:publicCallChain(variant)}),null,2)+'\n');
 await writeFile(new URL('render-evidence.json',dir),JSON.stringify({executableCalls:variant.calls,
  width:result.width,height:result.height,plotInkPixels:ink},null,2)+'\n');
});
