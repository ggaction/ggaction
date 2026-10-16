import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart } from "../../../src/index.js";
import { serializeProgram } from "../../../src/persistence.js";
import { resolveTextBounds } from "../../../src/layout/text.js";

const base = chart().createCanvas({
  width: 900, height: 420, margin: { left: 250, top: 60, right: 100, bottom: 70 }
}).createData({ values: [{ x: 1, y: "Short" }, { x: 2, y: "Long category" }] })
  .createBarPlot({ x: "x", y: "y", guides: false });
const before = serializeProgram(base), rejections = [];
for (const [operation, run] of [
  ["complete-axis creation", () => base.createAxes({
    y: { ticksAndLabels: { labels: { align: "left", offset: 75 } } }, x: false
  })],
  ["whole-axis edit", () => base.createAxes({ x: false, y: {} })
    .editYAxis({ ticksAndLabels: { labels: { align: "left" } } })],
  ["focused-label edit", () => base.createAxes({ x: false, y: {} })
    .editYAxisLabels({ align: "left" })]
]) {
  let rejection;
  try { run(); } catch (error) { rejection = { name: error.name, message: error.message }; }
  assert.match(rejection?.message ?? "", /align/);
  rejections.push({ operation, ...rejection });
}
assert.equal(serializeProgram(base), before);
const surrogate = base.createAxes({ x: false, y: {
  title: false, ticksAndLabels: { labels: { fontSize: 10, offset: 75 } }
} });
const object = surrogate.graphicSpec.objects.yAxisLabels;
const labels = object.items.map(item => {
  const p = item.properties;
  const actualBounds = resolveTextBounds(p, surrogate.materializationConfigs.textMetrics);
  const proposedBounds = resolveTextBounds({ ...p, textAlign: "left" },
    surrogate.materializationConfigs.textMetrics);
  return { text: p.text, anchor: { x: p.x, y: p.y }, currentAlign: p.textAlign,
    actualBounds, expectedLeftAnchoredBounds: proposedBounds };
});
assert.equal(labels.length, 2);
assert.equal(labels[0].anchor.x, labels[1].anchor.x);
assert.notEqual(labels[0].actualBounds.left, labels[1].actualBounds.left);
assert.equal(labels[0].expectedLeftAnchoredBounds.left,
  labels[1].expectedLeftAnchoredBounds.left);
assert.deepEqual(surrogate.graphicSpec.objects.barPlot, base.graphicSpec.objects.barPlot);
assert.equal(serializeProgram(base), before);
const result = {
  status: "gap-confirmed", newPublicAPIImplemented: false,
  modelCalls: 0, chartPixelsInspected: false,
  rejections, labels, parentImmutable: true, marksUnchanged: true,
  note: "Expected bounds are a pure text-anchor calculation; no proposed axis API is implemented.",
  sourceModuleBindings: ["src/actions/guides/axes/labels.js", "types/program.d.ts"]
    .map(path => ({ path, sha256: createHash("sha256")
      .update(readFileSync(new URL(`../../../${path}`, import.meta.url))).digest("hex") }))
};
writeFileSync(new URL("REPRODUCTION.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
