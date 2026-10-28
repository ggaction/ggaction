import assert from "node:assert/strict";
import test from "node:test";
import { blurShadowMask, planShadowMask, SHADOW_LIMITS } from "../../../src/grammar/shadow.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { shadowReference } from "../../oracles/shadow.js";

test("plans one pixel-space blur policy and finite expanded bounds before allocation", () => {
  const plan = planShadowMask({width: 20, height: 10, blurRadius: 4, pixelRatio: 2, offsetX: -3, offsetY: 5});
  assert.equal(plan.sigmaPixels, 4); assert.equal(plan.padding, 12);
  assert.deepEqual(plan.bounds, {x: -9, y: -1, width: 22, height: 17});
  assert.equal(plan.width, 44); assert.equal(plan.height, 34);
  assert.equal(plan.work, 200 + (440 + 1496 + 2) * 25);
  assert.equal(plan.bufferBytes, (25 + 440) * 8 + 1496);
  assert.ok(Object.isFrozen(plan)); assert.ok(Object.isFrozen(plan.bounds));
  assert.equal(SHADOW_LIMITS.pixels, 1_048_576);
  assert.equal(Object.is(planShadowMask({width: 1, height: 1, offsetX: -0, offsetY: -0}).bounds.x, -0), false);
});

test("anchors zero blur and Gaussian impulse with independent literal bytes", () => {
  const input = [0, 127, 255, 23], before = [...input];
  const result = blurShadowMask(input, {width: 2, height: 2});
  assert.deepEqual([...result.alpha], input); assert.deepEqual(input, before);
  result.alpha[0] = 255; assert.deepEqual(input, before);
  assert.deepEqual([...blurShadowMask(input, {width: 2, height: 2}).alpha], before);
  const blurred = blurShadowMask([255], {width: 1, height: 1, blurRadius: 1});
  assert.deepEqual([...blurred.alpha], [0,0,0,0,0, 0,3,21,3,0, 0,21,158,21,0, 0,3,21,3,0, 0,0,0,0,0]);
  assert.deepEqual([...blurred.alpha], shadowReference([255], 1, 1, .5));
  assert.deepEqual(shadowReference(input,2,2,0),input);
});

test("matches direct two-dimensional convolution and preserves symmetry and order", () => {
  const input = [0, 64, 128, 255, 32, 160];
  for (const blurRadius of [.5, 1, 2, 4]) {
    const result = blurShadowMask(input, {width: 3, height: 2, blurRadius});
    assert.deepEqual([...result.alpha], shadowReference(input,3,2,blurRadius/2));
    const stronger = blurShadowMask(input.map(x => Math.min(255,x+20)), {width: 3, height: 2, blurRadius});
    assert.ok(result.alpha.every((value,index) => value <= stronger.alpha[index]));
    const shifted = blurShadowMask(input, {width: 3, height: 2, blurRadius, offsetX: 4, offsetY: -2});
    assert.deepEqual(shifted.alpha,result.alpha); assert.equal(shifted.bounds.x,result.bounds.x+4); assert.equal(shifted.bounds.y,result.bounds.y-2);
    const impulse = blurShadowMask([255], {width: 1, height: 1, blurRadius});
    assert.deepEqual([...impulse.alpha], [...impulse.alpha].reverse());
    const mass = impulse.alpha.reduce((sum,x) => sum+x,0);
    assert.ok(Math.abs(mass-255) <= impulse.alpha.length/2);
  }
  const invisible = blurShadowMask([0], {width: 1, height: 1, blurRadius: 2});
  assert.ok(invisible.alpha.every(x => x===0));
  const solid = blurShadowMask(Array(81).fill(255), {width:9,height:9,blurRadius:1});
  assert.equal(solid.alpha[6*solid.width+6],255);
  const samePixels = blurShadowMask(input,{width:3,height:2,blurRadius:1,pixelRatio:2});
  assert.deepEqual(samePixels.alpha,blurShadowMask(input,{width:3,height:2,blurRadius:2}).alpha);
  const tiny = blurShadowMask([255], {width: 1, height: 1, blurRadius: 1e-100});
  assert.deepEqual([...tiny.alpha], [0,0,0,0,255,0,0,0,0]);
});

test("rejects invalid shape and finite numeric extremes before convolution", () => {
  for (const options of [null, [], {}, {width:0,height:1}, {width:1.5,height:1}, {width:1,height:-1},
    {width:1,height:1,blurRadius:-1}, {width:1,height:1,pixelRatio:0}, {width:1,height:1,offsetX:NaN},
    {width:1,height:1,offsetY:Infinity}, {width:1,height:1,blurRadius:undefined}, {width:1,height:1,extra:1}]) assert.throws(()=>planShadowMask(options));
  for (const options of [{width:1,height:1,blurRadius:Number.MAX_VALUE}, {width:1,height:1,blurRadius:Number.MIN_VALUE},
    {width:1,height:1,pixelRatio:Number.MIN_VALUE}, {width:1,height:1,offsetX:Number.MAX_VALUE}, {width:1,height:1,offsetY:-Number.MAX_VALUE}]) assert.throws(()=>planShadowMask(options),RangeError);
  for (const alpha of [[], [1,2], [NaN], [-1], [256], [.5], new Uint8Array([255])]) assert.throws(()=>blurShadowMask(alpha,{width:1,height:1}));
});

test("enforces dimension, pixel and work budgets before inspecting caller payload", () => {
  let touched=0; const alpha=[];Object.defineProperty(alpha,0,{get(){touched++;return 255;},enumerable:true});
  for (const options of [{width:4097,height:1}, {width:4096,height:257}, {width:100,height:100,blurRadius:100}, {width:1,height:1,blurRadius:1400}, {width:1024,height:1024}]) {
    assert.throws(()=>blurShadowMask(alpha,options),error=>getErrorDetails(error)?.code==='resource-limit');
  }
  assert.equal(touched,0);
});

test("rejects accessors, symbols, extra and missing alpha properties without reading them", () => {
  let touched=0;const options={width:1,height:1};Object.defineProperty(options,'blurRadius',{get(){touched++;return 1;},enumerable:true});
  assert.throws(()=>planShadowMask(options),/accessors/);
  const getter=[];Object.defineProperty(getter,0,{get(){touched++;return 255;},enumerable:true});
  for (const alpha of [getter,new Array(1),Object.assign([255],{extra:1}),Object.assign([255],{[Symbol('extra')]:1}),Object.defineProperty([255],'hidden',{value:1})]) assert.throws(()=>blurShadowMask(alpha,{width:1,height:1}));
  assert.equal(touched,0);
});
