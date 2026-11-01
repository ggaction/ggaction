import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createCanvas,GlobalFonts } from "@napi-rs/canvas";
import { planTransition,sampleTransition,serializeAnimation,deserializeAnimation } from "../../../src/animation.js";
import { prepareAnimationHitFrame } from "../../../src/interaction/hitProgram.js";
import { animationAxisReflowFrame,axisReflowFontIdentity,axisReflowFontHash } from "../../support/animation-axis-reflow-frame.js";
import { animationOfflineChildURL } from "../../support/animation-offline-child.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectAxisLabelGroups } from "../../../src/materialization/animation/axisLabelGroups.js";
import { prepareAxisLabelTracks } from "../../../src/animation/axisLabelTracks.js";

const bytes=new Uint8Array(readFileSync(new URL("../../fixtures/fonts/metric-fixture.ttf",import.meta.url)));
const sha=value=>createHash("sha256").update(value).digest("hex");
function measure({asset,queries}) {
  const key=GlobalFonts.register(Buffer.from(asset.payload.data,"base64"),asset.family);assert.ok(key);
  try {const context=createCanvas(1,1).getContext("2d");return {contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,widths:queries.map(({text,fontSize})=>{
    context.font=`${asset.weight} ${fontSize}px "${asset.family}"`;return context.measureText(text).width;
  })};} finally {assert.ok(GlobalFonts.remove(key));}
}
test("dynamic axis groups retain exact font queries, current hit metrics and network-free offline frames",async()=>{
  const {from,to,plan,frame,native}=await animationAxisReflowFrame({bytes,decode:axisReflowFontIdentity,measure});
  const unbound=from.removeTextMetrics(),groups=p=>projectAxisLabelGroups(p,projectAnimationEndpoint(p));
  const changedFont=prepareAxisLabelTracks(groups(from),groups(unbound));assert.equal(changedFont.state.groups.length,0);
  assert.equal(from.graphicSpec.objects.xAxisLabels.items.length,6);assert.equal(to.graphicSpec.objects.xAxisLabels.items.length,3);
  const labels=frame.scene.nodes.filter((node,i)=>frame.decisions[i]?.kind==="guide");
  assert.deepEqual(labels.map(node=>[node.properties.text,node.properties.x,node.properties.y]),[["AB AB",80,238],["AB AB",165,238],["AB AB",250,238]]);
  assert.deepEqual(labels.map(node=>node.properties),native.graphicSpec.objects.xAxisLabels.items.map(item=>item.properties));
  assert.ok(labels.every(node=>node.properties.font.contentHash===axisReflowFontHash));
  const hit=prepareAnimationHitFrame(frame);assert.equal(hit.entries.filter(entry=>labels.some(node=>node.key===entry.nodeKey)).length,3);
  const saved=serializeAnimation(plan),replay=deserializeAnimation(saved).plan;
  assert.ok(saved.includes(Buffer.from(bytes).toString("base64")));assert.deepEqual(sampleTransition(replay,50),frame);
  const rebased=planTransition({from:frame,to,options:{durationMs:100,easing:"linear"}});
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,50),sampleTransition(rebased,50));
  const child=spawnSync(process.execPath,[animationOfflineChildURL.pathname],{input:saved,encoding:"utf8",timeout:30000,maxBuffer:1024*1024});
  assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout);assert.equal(result.networkCalls,0);
  for(const record of result.records){const expected=sampleTransition(plan,record.timeMs);assert.equal(record.sceneHash,sha(JSON.stringify(expected.scene)));
    assert.equal(record.svgHash,sha(renderToSVG(expected)));assert.equal(record.pngHash,sha((await renderToPNGBuffer(expected)).buffer));
    assert.equal(record.pngHash,record.canvasHash);assert.equal(record.pdfSignature,"%PDF");assert.equal(record.registered,1);assert.equal(record.removed,1);}
});
