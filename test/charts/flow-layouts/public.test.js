import assert from "node:assert/strict";
import test from "node:test";
import { createFlow } from "../../../examples/flow-layouts/program.js";
import { createFlowPrimitive } from "./primitive.program.js";
import { variants } from "./reference-values.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
const flatten = (p, ids) => ids.flatMap(id => { const g = p.graphicSpec.objects[id]; return (g.items ?? [g]).map(item => ({ type: item.type ?? g.type, properties: item.properties })); });
for (const variant of variants) test(`public flow ${variant.id} equals independent primitive properties and drawing order`, () => {
  const p = createFlow(variant.id), primitive = createFlowPrimitive(variant.id);
  assert.deepEqual(flatten(p, ["flowLinks", "flowNodes", "chartTitle", "chartSubtitle"]), flatten(primitive, ["links", "nodes", "heading"]));
  const items = ["flowNodes", "flowLinks"].flatMap(id => p.graphicSpec.objects[id].items);
  assert.equal(new Set(items.map(item => JSON.stringify([item.identity.key, item.identity.role]))).size, items.length);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
});
