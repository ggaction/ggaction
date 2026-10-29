import test from "node:test";
import assert from "node:assert/strict";
import { createTrailPrimitive } from "./primitive.program.js";
test("Trail primitive fixes per-sample widths and the independent trapezoid areas", () => {
  const items = createTrailPrimitive().graphicSpec.objects.trail.items;
  assert.deepEqual(items.map(item => item.properties.commands.filter(c => c.op === "M").map(c => [c.x,c.y])), [[[40,92]],[[40,166]]]);
  for (const [index,item] of items.entries()) {
    const p=item.properties.commands.filter(c=>c.op!=="Z");
    const area=Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a.x*b.y-b.x*a.y;},0))/2;
    assert.equal(area, [6800,6800][index]);
    assert.equal(item.properties.strokeWidth,0);
  }
});
test("Trail constant-width primitive retains both centerlines", () => {
  const items=createTrailPrimitive({constant:true}).graphicSpec.objects.trail.items;
  assert.deepEqual(items.map(item=>item.properties.commands[1].y-item.properties.commands[2].y),[18,18]);
  assert.deepEqual(items.map(item=>(item.properties.commands[1].y+item.properties.commands[2].y)/2),[88,152]);
});
