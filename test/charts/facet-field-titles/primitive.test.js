import test from "node:test";
import assert from "node:assert/strict";
import { resolveTextBounds } from "../../../src/core/textMetrics.js";
import { createFacetFieldTitlesPrimitives } from "./primitive.program.js";

test("literal field title uses the complete plot span and its own left lane", () => {
  const p = createFacetFieldTitlesPrimitives();
  const items = p.graphicSpec.objects["facet-headers"].items;
  assert.deepEqual(items.map(item => item.properties.text), ["North", "South", "Region"]);
  const title = items[2].properties, bounds = resolveTextBounds(title);
  assert.equal(title.x, 10);
  assert.equal(title.y, (20 + 165) / 2);
  assert.equal(title.rotation, -Math.PI / 2);
  assert(Math.abs(bounds.left - 4) < 1e-12);
  assert(Math.abs(bounds.right - 16) < 1e-12);
  assert(Object.isFrozen(title));
});
