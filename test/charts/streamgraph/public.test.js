import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertDisplayedProgram } from "../../support/visual-variants.js";
test("wiggle Area matches the independently authored moving boundaries",()=>{
  const variant=visualVariants[0],p=variant.userFacing(),q=variant.primitive();
  assertDisplayedProgram(variant,p);
  assert.deepEqual(p.graphicSpec.objects.stream.items.map(({properties})=>properties),q.graphicSpec.objects.stream.items.map(({properties})=>properties));
  assert.equal(new Set(p.graphicSpec.objects.stream.items.map(item=>item.identity.key)).size,2);
});
