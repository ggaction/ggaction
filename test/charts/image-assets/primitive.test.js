import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { loadImage } from '@napi-rs/canvas';
import { imagePlacement } from '../../../src/materialization/image.js';
import { prepareImageAsset } from '../../../src/resources/resolveAssets.js';
import { fixtures, viewport, imageSize, assetSVG } from './fixture.js';
import { variants } from './manifest.js';
import { samples } from './reference.js';

test('image placements retain literal fit and alignment rectangles', () => {
  assert.equal(new Set(variants.map(v=>v.variant)).size,6);
  for (const fixture of fixtures) {
    const result = imagePlacement(imageSize, viewport, { fit: fixture.fit, align: fixture.align });
    assert.deepEqual([result.x,result.y,result.width,result.height],fixture.rect);
    assert.deepEqual(result.clip,viewport);
  }
});

test('the reviewed SVG source resolves to pinned immutable offline bytes', async () => {
  const bytes = new TextEncoder().encode(assetSVG), hash=createHash('sha256').update(bytes).digest('hex');
  const asset=await prepareImageAsset({uri:'fixture:image-fit',expectedHash:hash,mimeType:'image/svg+xml',license:'CC0'}, {
    load:async()=>({bytes,mimeType:'image/svg+xml'}), decode:async({bytes})=>{const image=await loadImage(Buffer.from(bytes));return{width:image.width,height:image.height,originClean:true};}
  });
  assert.equal(asset.contentHash,hash);assert.equal(asset.width,200);assert.equal(asset.height,100);
  assert.equal(Buffer.from(asset.payload.data,'base64').toString(),assetSVG);assert.ok(Object.isFrozen(asset.payload));
});

test('the independent pixel oracle retains representative literal colors and alpha', () => {
  const pixel = (id, x, y) => samples(fixtures.find(fixture => fixture.id === id))
    .find(sample => sample.pixel[0] === x && sample.pixel[1] === y).expected;
  assert.deepEqual(pixel('contain-center', 70, 65), [226, 232, 240, 255]);
  assert.deepEqual(pixel('contain-center', 70, 92), [222, 91, 73, 255]);
  assert.deepEqual(pixel('cover-center', 103, 113), [255, 255, 255, 255]);
  assert.deepEqual(pixel('clip-opacity', 70, 92), [224, 162, 157, 255]);
  assert.deepEqual(pixel('clip-opacity', 70, 65), [226, 232, 240, 255]);
  assert.deepEqual(pixel('fill', 155, 100), [255, 255, 255, 255]);
});
