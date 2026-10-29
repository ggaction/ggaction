import assert from "node:assert/strict";
import test from "node:test";
import { createStreamgraphPrimitive } from "./primitive.program.js";
test("wiggle literal polygons conserve the trapezoidal area of their sample thicknesses",()=>{
  const items=createStreamgraphPrimitive().graphicSpec.objects.stream.items;
  const areas=items.map(item=>{const p=item.properties.commands.filter(command=>command.op!=="Z");return Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a.x*b.y-b.x*a.y;},0))/2;});
  assert.deepEqual(areas,[22000,18000]);
  assert.deepEqual(items[0].properties.commands.slice(0,4).map(c=>c.y),[200,220,180,240]);
  assert.deepEqual(items[1].properties.commands.slice(0,4),[...items[0].properties.commands.slice(4,8)].reverse().map((c,i)=>({...c,op:i===0?"M":"L"})));
});
