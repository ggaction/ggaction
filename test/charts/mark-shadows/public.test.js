import test from "node:test";
import assert from "node:assert/strict";
import { styles } from "../../../examples/mark-shadows/data.js";
import { createMarkShadowExample } from "../../../examples/mark-shadows/program.js";
import { createMarkShadowPrimitive } from "./primitive.program.js";
import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
for(const style of styles)test(`public ${style} matches explicit shadow primitives and stable source identity`,()=>{
  const p=createMarkShadowExample(style),primitive=createMarkShadowPrimitive(style);
  assertEquivalentMeaning(p.graphicSpec,primitive.graphicSpec);
  assert.equal(p.graphicSpec.objects.shadowed.items.length,1);
  assert.ok(p.graphicSpec.objects.shadowed.items[0].identity);
});
