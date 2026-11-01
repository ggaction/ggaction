import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { prepareFontResource, prepareTextMetrics } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { animationOfflineChildURL } from "../../support/animation-offline-child.js";
import { animationGeoTextFrame } from "../../support/animation-geo-text-frame.js";

const sha=value=>createHash("sha256").update(value).digest("hex");
test("geographic Text frames keep real font bytes and measured queries in a network-free process", async () => {
  let from=animationGeoTextFrame("collision").from;
  const bytes=new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf",import.meta.url)));
  const expectedHash=sha(bytes),decode=value=>Object.fromEntries(["contentHash","family","style","weight","metricsProviderVersion"].map(key=>[key,value[key]]));
  const prepared=await prepareFontResource(from,{kind:"create",id:"font",uri:"fixture:geo-text",expectedHash,mimeType:"font/ttf",family:"sans-serif",style:"normal",weight:400,metricsProviderVersion:"fixture@1"},
    {requestToken:"font",load:()=>({bytes,mimeType:"font/ttf"}),decode});
  from=from.createFontResource({prepared,requestToken:"font"});
  const metrics=await prepareTextMetrics(from,{id:"exact",fonts:["font"]},{requestToken:"metrics",decode,
    measure:({asset,queries})=>({contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,widths:queries.map(({text,fontSize})=>text.length*.6*fontSize)})});
  from=from.applyTextMetrics({prepared:metrics,requestToken:"metrics"});
  const to=from.editProjection({scalePx:4,translatePx:[40,0]}),plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}}),saved=serializeAnimation(plan);
  assert.ok(saved.includes(Buffer.from(bytes).toString("base64")));
  const frame=sampleTransition(plan,50);
  assert.ok(frame.scene.nodes.filter(node=>node.type==="text").every(node=>node.properties.font.contentHash===expectedHash));
  assert.deepEqual(sampleTransition(deserializeAnimation(saved).plan,50).scene,frame.scene);
  const child=spawnSync(process.execPath,[animationOfflineChildURL.pathname],{input:saved,encoding:"utf8",timeout:30000,maxBuffer:1024*1024});
  assert.equal(child.status,0,child.stderr);
  const result=JSON.parse(child.stdout);assert.equal(result.networkCalls,0);
  for(const record of result.records) {assert.equal(record.sceneHash,sha(JSON.stringify(sampleTransition(plan,record.timeMs).scene)));assert.equal(record.pngHash,record.canvasHash);assert.equal(record.pdfSignature,"%PDF");assert.equal(record.registered,1);assert.equal(record.removed,1);}
});
