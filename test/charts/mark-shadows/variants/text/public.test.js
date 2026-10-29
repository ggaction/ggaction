import assert from "node:assert/strict";
import test from "node:test";
import { visualVariants } from "./manifest.js";
import { assertEquivalentMeaning } from "../../../../support/identity-equivalence.js";
import { serializeProgram, deserializeProgram } from "../../../../../src/persistence.js";
for(const v of visualVariants)test(`${v.variant} public Text shadow preserves exact primitive glyphs and codec state`,()=>{
 const p=v.userFacing();assertEquivalentMeaning(p.graphicSpec,v.primitive().graphicSpec);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 assert.equal(p.graphicSpec.objects.labels.items.length,1);
 assert.equal(p.graphicSpec.objects.labels.items[0].properties.lines.length,2);
});
