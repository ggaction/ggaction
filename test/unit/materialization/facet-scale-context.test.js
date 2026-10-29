import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { withFacetScaleDomains } from "../../../src/materialization/facetScaleContext.js";

test("nested responsive domain authority restores the caller context and never changes an old program on failure", () => {
  const source = chart().createCanvas({ responsive: {} });
  const domains = { x: ["a", "b"] }, original = source.context;
  const result = withFacetScaleDomains(source, domains, false, outer => {
    const scoped = outer.context.facetMaterialization;
    const inner = withFacetScaleDomains(outer, { x: ["b"] }, true, value => {
      assert.deepEqual(value.context.facetMaterialization.domains.x, ["b"]);
      return value;
    });
    assert.equal(inner.context.facetMaterialization, scoped);
    assert.throws(() => withFacetScaleDomains(outer, { x: [] }, true, () => { throw Error("stop"); }), /stop/);
    assert.equal(outer.context.facetMaterialization, scoped);
    return inner;
  });
  assert.deepEqual(result.context, original); assert.equal(source.context, original);
  assert.deepEqual(domains, { x: ["a", "b"] });
  const ordinary = chart().createCanvas();
  assert.equal(withFacetScaleDomains(ordinary, domains, false, value => value), ordinary);
});
