import assert from "node:assert/strict";
import test from "node:test";
import { createAxisOwnersPrimitive } from "./primitive.program.js";
test("the single-Y axis-owners scene has only explicit graphics with its authored geometry",()=>{
  const program=createAxisOwnersPrimitive();
  assert.deepEqual(program.semanticSpec.layers,[]);
  assert.deepEqual(program.semanticSpec.datasets,[]);
  assert.deepEqual(program.semanticSpec.scales,[]);
  assert.deepEqual(program.graphicSpec.order,["canvas"]);

  const objects=program.graphicSpec.objects;
  assert.equal(objects.axis_quantity__Line.properties.x1,45);
  assert.equal(objects.xAxisTitle.properties.y,175);
  assert.deepEqual(objects.axis_quantity__Labels.items.map(item=>item.properties.text),["0","50","100"]);
});
