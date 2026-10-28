import assert from "node:assert/strict";import test from "node:test";
import {readFileSync} from "node:fs";import {createHash} from "node:crypto";
import {resolvePrimitiveGraphicBounds} from "../../../../../src/grammar/schemas/graphicBounds.js";
import {validateConcreteGraphicProperties} from "../../../../../src/grammar/schemas/concreteGraphic.js";
import {variants} from "./manifest.js";import {fontSHA256} from "./fixture.js";
import {expectedColor,samplePoints,expectedBounds} from "./reference.js";
test("reuses explicit mark stroke bounds and anchors outside ink numerically",()=>{
 assert.deepEqual(resolvePrimitiveGraphicBounds("rect",{x:80,y:80,width:120,height:60,stroke:"black",strokeWidth:8}),{left:76,right:204,top:76,bottom:144});
 assert.deepEqual(resolvePrimitiveGraphicBounds("circle",{x:140,y:110,radius:36,stroke:"white",strokeWidth:16}),{left:96,right:184,top:66,bottom:154});
 assert.deepEqual(resolvePrimitiveGraphicBounds("path",{commands:[{op:"M",x:80,y:140},{op:"L",x:140,y:70},{op:"L",x:200,y:140},{op:"Z"}],stroke:"black",strokeWidth:8,lineJoin:"round"}),{left:76,right:204,top:66,bottom:144});
 const rect=variants[0].fixture;assert.deepEqual(expectedColor(rect,100,100),[34,139,180,255]);assert.deepEqual(expectedColor(rect,77,110),[92,42,115,255]);assert.deepEqual(expectedColor(rect,74,110),[226,232,240,255]);
 for(const v of variants)for(const[x,y]of samplePoints(v.fixture))assert.ok(expectedColor(v.fixture,x,y).every(c=>Number.isInteger(c)&&c>=0&&c<=255));
});
test("keeps the exact geometric font and group opacity independent from public text support",()=>{
 assert.equal(createHash("sha256").update(readFileSync(new URL("../../../../fixtures/fonts/metric-fixture.ttf",import.meta.url))).digest("hex"),fontSHA256);
 const opacity=variants.find(v=>v.variant==="text-opacity").fixture;
 assert.deepEqual(expectedBounds(opacity),{left:79,right:165,top:84,bottom:134});
 assert.deepEqual(expectedColor(opacity,84,110),[130,186,210,255]);
 assert.deepEqual(expectedColor(opacity,90,100),[130,186,210,255]);assert.deepEqual(expectedColor(opacity,81,110),[159,137,178,255]);
 assert.throws(()=>validateConcreteGraphicProperties("text",{text:"AB",x:80,y:130,fontSize:60,stroke:"white",strokeWidth:8}),/stroke/);
 assert.equal(variants.find(v=>v.variant==="zero-width").fixture.strokeWidth,0);
});
