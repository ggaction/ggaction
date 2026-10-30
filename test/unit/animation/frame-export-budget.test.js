import test from "node:test";
import assert from "node:assert/strict";
import { collectAnimationFrameViews } from "../../../src/animation/frames.js";

test("frame export charges actual intermediate nodes before exposing a batch", () => {
  // Sparse arrays stand for already-produced frames: no geometry algorithm or
  // endpoint estimate participates in this independent cumulative-work oracle.
  const frame = length => Object.freeze({ scene: Object.freeze({ nodes: Object.freeze(Array(length)) }) });
  const a=frame(4_000_000),b=frame(6_000_000),empty=frame(0),times=Object.freeze([0,1,2]);
  assert.deepEqual(collectAnimationFrameViews([0,1],time=>[a,b][time]),[a,b]);
  let calls=0, published;
  assert.throws(()=>{published=collectAnimationFrameViews(times,time=>{calls++;return[a,b,empty][time];});},/work.*10000000|10,000,000|exceeds/i);
  assert.equal(calls,3);assert.equal(published,undefined);assert.deepEqual(times,[0,1,2]);
  assert.equal(a.scene.nodes.length,4_000_000);assert.equal(b.scene.nodes.length,6_000_000);
});
