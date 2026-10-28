import assert from "node:assert/strict";
import test from "node:test";
import { createFlowPrimitive } from "./primitive.program.js";
import { variants, flowReference } from "./reference-values.js";
for (const variant of variants) test(`flow primitive ${variant.id} keeps closed ribbons and node values`, () => {
  const p = createFlowPrimitive(variant.id), { nodes, links } = p.graphicSpec.objects;
  assert.deepEqual(links.items.map(item => item.properties.commands.at(-1)), [{ op: "Z" }, { op: "Z" }]);
  assert.deepEqual(nodes.items.filter(item => item.type === "text").map(item => item.properties.text), variant.method === "dag" ? ["6", "4", "10"] : ["2", "2"]);
  assert.equal(p.graphicSpec.objects["plot-main"].children.indexOf("links") < p.graphicSpec.objects["plot-main"].children.indexOf("nodes"), true);
  assert.deepEqual(links.clip, flowReference(variant.id).clip);
});
test("flow reference rejects an unknown variant", () => assert.throws(() => createFlowPrimitive("unknown")));
