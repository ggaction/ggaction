import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { animationAxisReflowFrame, axisReflowFontIdentity } from "./animation-axis-reflow-frame.js";

export function nativeAxisReflowFontFrame() {
  const bytes=new Uint8Array(readFileSync(new URL("../fixtures/fonts/metric-fixture.ttf",import.meta.url)));
  return animationAxisReflowFrame({bytes,decode:axisReflowFontIdentity,measure:({asset,queries})=>{
    const key=GlobalFonts.register(Buffer.from(asset.payload.data,"base64"),asset.family);assert.ok(key);
    try {const context=createCanvas(1,1).getContext("2d");return {contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,widths:queries.map(({text,fontSize})=>{
      context.font=`${asset.weight} ${fontSize}px "${asset.family}"`;return context.measureText(text).width;
    })};}finally{assert.ok(GlobalFonts.remove(key));}
  }});
}
