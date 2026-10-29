import test from "node:test";
import assert from "node:assert/strict";
import { visualVariants } from "./manifest.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
const properties = p => Object.values(p.graphicSpec.objects).flatMap(object => object.items ?? []).map(({ type, properties }) => ({ type, properties }));
for (const variant of visualVariants) test(`geographic ${variant.variant} matches independent primitive geometry and source identity`, () => {
  const p = variant.userFacing(), q = variant.primitive();
  assert.equal(properties(p).length, ["planar", "fields", "camera"].includes(variant.variant) ? 5 : variant.variant === "annotations" ? 8 : 6);
  assert.deepEqual(properties(p), properties(q));
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  assert.equal(renderToSVG(p, { resourceNamespace: "same" }), renderToSVG(q, { resourceNamespace: "same" }));
});
