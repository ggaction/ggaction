import assert from "node:assert/strict";
import test from "node:test";
import { createSharedFacetOwnerPrimitive } from "./primitive.program.js";
test("the independent shared-facet-owner scene has only explicit graphics with its authored geometry",()=>{
  const program=createSharedFacetOwnerPrimitive();
  assert.deepEqual(program.semanticSpec.layers,[]);
  assert.deepEqual(program.semanticSpec.datasets,[]);
  assert.deepEqual(program.semanticSpec.scales,[]);
  assert.deepEqual(program.graphicSpec.order,["canvas"]);

  const objects=program.graphicSpec.objects;
  const cells=Object.values(objects).filter(object=>object.type==="canvas"&&object.properties.width===130);
  assert.equal(cells.length,4);
  assert.deepEqual(cells.map(object=>object.properties.x),[0,105,210,315]);
  assert.equal(objects.colorLegendBackground.properties.width+1,270);
  assert.deepEqual(objects.colorLegendSymbolPoints.items.map(item=>item.properties.y),[201.5,201.5,201.5]);
  assert.equal(objects.canvas.properties.height,220);
});
