import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from '../../../src/animation.js';
import { decodeAnimationEnvelope, encodeAnimationEnvelope } from '../../../src/animation/envelopeCodec.js';
import { animationOfflineChildURL } from '../../support/animation-offline-child.js';
import { animationAssetEndpoints } from '../../support/animation-asset-frame.js';

const bytes=readFileSync(new URL('../../fixtures/fonts/metric-fixture.ttf',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
const font={contentHash:sha(bytes),mimeType:'font/ttf',byteLength:bytes.length,family:'ggaction Metric Fixture',
  style:'normal',weight:400,metricsProviderVersion:'fixture@1',payload:{encoding:'base64',data:bytes.toString('base64')}};

test('fresh offline processes render actual embedded image and font bytes from the same sampled times', () => {
  const {from,to,image}=animationAssetEndpoints(font,bytes=>Buffer.from(bytes).toString('base64'));
  const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),text=serializeAnimation(plan);
  assert.ok(text.includes(font.payload.data));assert.ok(text.includes(image.payload.data));
  const run=()=>{
    const child=spawnSync(process.execPath,[animationOfflineChildURL.pathname],
      {input:text,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout);
  };
  const first=run(),second=run();assert.deepEqual(second,first);assert.equal(first.networkCalls,0);
  for(const record of first.records){
    assert.equal(record.sceneHash,sha(JSON.stringify(sampleTransition(plan,record.timeMs).scene)));
    assert.equal(record.pngHash,record.canvasHash);assert.equal(record.pdfSignature,'%PDF');
    assert.equal(record.registered,1);assert.equal(record.removed,1);assert.equal(record.decoded,1);
  }
  assert.deepEqual(first.records[0].pixels.slice(0,4),[[255,0,0,255],[0,0,255,255],[0,128,0,255],[255,255,255,255]]);
  assert.deepEqual(first.records[1].pixels[4],[255,0,0,255]);
});

test('hash-only, truncated and substituted image or font payloads cannot restore', () => {
  const {from,to}=animationAssetEndpoints(font,bytes=>Buffer.from(bytes).toString('base64'));
  const plan=planTransition({from,to,options:{durationMs:100}}),text=serializeAnimation(plan);
  for(const [id,key] of [['assetImage','image'],['assetText','font']]){
    for(const mutate of [asset=>delete asset.payload,asset=>asset.payload.data=asset.payload.data.slice(4),
      asset=>asset.contentHash='0'.repeat(64),asset=>asset.byteLength++]){
      const payload=structuredClone(decodeAnimationEnvelope(text));mutate(payload.plan.from.graphicSpec.objects[id].properties[key]);
      assert.throws(()=>deserializeAnimation(encodeAnimationEnvelope(payload)));
    }
  }
  assert.deepEqual(sampleTransition(deserializeAnimation(text).plan,50),sampleTransition(plan,50));
});
