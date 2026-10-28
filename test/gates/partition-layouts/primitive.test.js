import assert from "node:assert/strict";
import test from "node:test";
import {variants,bendOptions} from "./manifest.js";
import {partitionFixture,createPartitionPrimitive,bendScreenPoint} from "./primitive.program.js";
import {expectedCells,expectedRectangle,expectedSector,expectedBendPoint} from "./reference.js";

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} ~= ${expected}`);
test("maps literal hierarchy cells into explicit immutable partition primitives",()=>{
  for(const variant of variants){
    const fixture=partitionFixture(variant.variant),expected=expectedCells(variant);
    assert.deepEqual(fixture.shapes.map(s=>s.label),expected.map(cell=>cell[0]));
    fixture.shapes.forEach((shape,i)=>Object.values(shape.cell).forEach((value,j)=>close(value,expected[i][j+1])));
    const program=createPartitionPrimitive(variant.variant),objects=program.graphicSpec.objects;
    assert.equal(objects["partition-cells"].items.length,expected.length);
    assert.deepEqual(objects["partition-cells"].items.map(i=>i.properties.commands),fixture.shapes.map(s=>s.commands));
    assert.deepEqual(objects["partition-cells"].items.map(i=>i.properties.fill),fixture.shapes.map(s=>s.fill));
    assert.ok(Object.isFrozen(fixture.view.nodes));
    assert.ok(fixture.shapes.every(shape=>shape.commands.length<=259));
    for(const [i,shape]of fixture.shapes.entries()){
      if(variant.kind==="bend")continue;
      const reference=variant.kind==="rectangle"?expectedRectangle(expected[i],variant):expectedSector(expected[i],variant);
      for(const key of Object.keys(reference))close(shape.geometry[key],reference[key]);
    }
  }
});
test("retains focus, zero, residual and synthetic metadata without fabricating area",()=>{
  const zero=partitionFixture("zero");assert.equal(zero.view.nodes.length,2);assert.equal(zero.shapes.length,0);assert.equal(zero.view.diagnostics.emptyValue,true);
  const forest=partitionFixture("forest");assert.equal(forest.view.nodes[0].synthetic,true);assert.equal(forest.view.nodes[0].visible,false);
  const focus=partitionFixture("focus");assert.deepEqual(focus.view.breadcrumbKeys,[focus.model.rootKey]);assert.deepEqual(focus.shapes.map(s=>s.value),[6,2,4]);
  const residual=partitionFixture("inclusive");assert.equal(residual.view.nodes[1].residual,3);close(residual.view.nodes[1].residualStart,.3);assert.equal(residual.shapes.length,5);
});
test("bounds the canonical bend polyline and anchors both exact coordinate endpoints",()=>{
  for(const b of[0,.5,1])for(const u of[0,.2,.5,.6,1])for(const v of[0,1/3,2/3,1]){
    const actual=bendScreenPoint(u,v,b),expected=expectedBendPoint(u,v,b);close(actual.x,expected.x);close(actual.y,expected.y);
  }
  // For each circular boundary, chord sagitta <= radius * deltaAngle^2 / 8.
  // At b=0 the boundaries are exactly straight. At b=.5/1 the global grid
  // step is <= 1/128; 259 commands per node, 1295 for this five-node fixture.
  for(const b of[.5,1]){
    const radius=(1-b)*bendOptions.width/(2*Math.PI*b)+(1-b)*bendOptions.height+b*bendOptions.outerRadius;
    assert.ok(radius*(2*Math.PI*b/128)**2/8<.031);
  }
  assert.deepEqual(bendScreenPoint(.5,0,0),{x:240,y:180});
  assert.deepEqual(bendScreenPoint(.5,1,1),{x:240,y:280});
});
