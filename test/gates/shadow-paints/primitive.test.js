import assert from "node:assert/strict";
import test from "node:test";
import {variants,frame} from "./manifest.js";
import {shadowFixture,prepareShadowGlyph} from "./fixture.js";
import {expectedColor,pixels} from "./reference.js";

test("keeps every shadow effect in a bounded sublayer with explicit primitive source",()=>{
  for(const variant of variants){
    const before=structuredClone(variant.fixture),glyph=variant.prepare(variant.fixture);
    assert.deepEqual(variant.fixture,before);assert.ok(glyph.width<frame.width);assert.ok(glyph.height<frame.height);
    assert.equal(glyph.pixels.length,glyph.width*glyph.height*4);
    assert.ok(variant.callChain.includes(JSON.stringify(variant.variant)));
    assert.match(variant.svg(variant.fixture,"data:image/png;base64,placeholder",glyph),/id="vector-sibling"/);
    for(const [x,y]of pixels)assert.ok(expectedColor(variant.fixture,x,y).every(v=>Number.isInteger(v)&&v>=0&&v<=255));
  }
});
test("applies glyph opacity once after shadow and source composition",()=>{
  const fixture=shadowFixture("alpha-once"),glyph=prepareShadowGlyph(fixture);
  const x=35-glyph.x,y=30-glyph.y,index=(y*glyph.width+x)*4;
  assert.deepEqual([...glyph.pixels.slice(index,index+4)],[180,68,53,119]);
  assert.deepEqual(expectedColor(fixture,115,110),[205,155,153,255]);
  assert.deepEqual(expectedColor(shadowFixture("clip"),145,115),[226,232,240,255]);
  assert.throws(()=>shadowFixture("unknown"));
});
