import assert from "node:assert/strict";
import test from "node:test";
import { createTreemap } from "../../../examples/treemap-layouts/program.js";
import { createTreemapPrimitive } from "./primitive.program.js";
import { variants } from "./reference-values.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
const flatten = (p, ids) => ids.flatMap(id => { const g = p.graphicSpec.objects[id]; return (g.items ?? [g]).map(item => ({ type: item.type ?? g.type, properties: item.properties })); });
for (const variant of variants) test(`public ${variant.id} treemap preserves primitive order and exact concrete properties`, () => {
  const p = createTreemap(variant.id), primitive = createTreemapPrimitive(variant.id);
  assert.deepEqual(flatten(p, ["treemapPlot", "chartTitle", "chartSubtitle"]), flatten(primitive, ["cells", "labels", "heading"]));
  const identities = p.graphicSpec.objects.treemapPlot.items.map(item => JSON.stringify([item.identity.key, item.identity.role]));
  assert.equal(new Set(identities).size, identities.length);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
});
