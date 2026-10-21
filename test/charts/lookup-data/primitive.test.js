import test from "node:test";
import assert from "node:assert/strict";
import { createLookupPrimitives } from "./primitive.program.js";

test("independent literal bar target has three exact means at the unchanged plot bounds", () => {
  const p = createLookupPrimitives();
  assert.deepEqual(p.graphicSpec.objects.canvas.properties, {width:400,height:280,background:"white"});
  assert.deepEqual(p.graphicSpec.objects.barPlot.items.map(i => {
    const {x,y,width,height,fill} = i.properties;return {x,y,width,height,fill};
  }), [
    {x:64,y:134,width:72,height:96,fill:"#4c78a8"},
    {x:164,y:144,width:72,height:86,fill:"#4c78a8"},
    {x:264,y:62,width:72,height:168,fill:"#4c78a8"}
  ]);
});
