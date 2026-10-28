import assert from "node:assert/strict";
import test from "node:test";
import {ellipseVariant} from "./ellipse.manifest.js";
import {ellipseOffset,ellipseExpected} from "./ellipse-reference.js";
import {radialOffset} from "../../../../oracles/radial-gradient.js";
test("anchors the proposed object-bounds radial ellipse without a public API",()=>{
  const fixture=ellipseVariant.fixture;
  assert.deepEqual(fixture.gradient.center,{x:.5,y:.5});assert.equal(fixture.gradient.radius,.5);
  assert.deepEqual(ellipseExpected(130,110),[254,243,199,255]);
  assert.deepEqual(ellipseExpected(240,110),[15,118,110,255]);
  assert.deepEqual(ellipseExpected(130,180),[15,118,110,255]);
  assert.equal(ellipseOffset(185,110),.5);assert.equal(ellipseOffset(130,145),.5);
  for(const x of[20,75,130,185,240])for(const y of[40,75,110,145,180]){
    const offset=radialOffset(fixture.gradient,{x:(x-20)/220,y:(y-40)/140});
    assert.ok(Math.abs(offset-ellipseOffset(x,y))<1e-12);
  }
  assert.match(ellipseVariant.svg(fixture),/gradientUnits="objectBoundingBox"/);
  assert.match(ellipseVariant.callChain,/ellipseFixture/);
});
