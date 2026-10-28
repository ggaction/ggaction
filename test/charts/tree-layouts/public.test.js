import assert from "node:assert/strict";
import test from "node:test";
import { createTree } from "../../../examples/tree-layouts/program.js";
import { createTreePrimitive } from "./primitive.program.js";
import { variants } from "./reference-values.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
const flatten = (p, ids) => ids.flatMap(id => { const g = p.graphicSpec.objects[id]; return (g.items ?? [g]).map(item => ({ type: item.type ?? g.type, properties: item.properties })); });
for (const variant of variants) test(`public ${variant.id} tree preserves primitive order and exact concrete properties`, () => {
  const p = createTree(variant.id), primitive = createTreePrimitive(variant.id);
  assert.deepEqual(flatten(p, ["treePlot", "chartTitle", "chartSubtitle"]), flatten(primitive, ["links", "nodes", "labels", "heading"]));
  const identities = p.graphicSpec.objects.treePlot.items.map(item => JSON.stringify([item.identity.key, item.identity.role]));
  assert.equal(new Set(identities).size, identities.length);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
});
