import { assertEquivalentMeaning } from "./identity-equivalence.js";
import assert from "node:assert/strict";
import { chart } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToPNGBuffer } from "ggaction/png";
export const cases = [{ id: "guides/prospective-numeric-axis-title-replay", async run() {
  const title = { text: "Y", fontSize: 11, fontWeight: 700, offset: 35.7412109375 };
  let fullGeometry;
  for (const factory of [chart, basicChart]) {
    const build = margin => factory().createCanvas({ plot: { width: 100, height: 100 }, margin })
      .createData({ values: [{ x: 0, y: -5 }, { x: 1, y: 0 }, { x: 2, y: 5 }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .createYAxis({ ticksAndLabels: { values: [-5, 0, 5], labels: { fontSize: 10, format: ".1f", offset: 6.5 } }, title });
    const p = build({ left: 58.5, top: 40, right: 79.25, bottom: 48.5 });
    const before = serializeProgram(p), margin = { left: 47, top: 40, right: 7, bottom: 37 };
    const q = factory === chart ? p.editCanvas({ margin }) : build(margin);
    if (factory === chart) fullGeometry = q.graphicSpec;
    else { assert.equal(p.editCanvas, undefined); assertEquivalentMeaning(q.graphicSpec, fullGeometry); }
    assert.equal(q.graphicSpec.objects.yAxisTitle.properties.x, 11.2587890625);
    assert.equal(q.guideConfigs.axis.y.title.offset, title.offset);
    assert.equal(Object.hasOwn(q.context, "pendingMaterializationPlan"), false);
    assert.equal(serializeProgram(p), before);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
    const png = await renderToPNGBuffer(q);
    assert.equal(png.width, 154); assert.equal(png.height, 177);
  }
  const createFramed = offset => chart()
    .createCanvas({ width: 270, height: 295, margin: { left: 57, right: 13, top: 57, bottom: 38 } })
    .createData({ values: [{ x: 0, y: 6 }, { x: 1, y: 10 }, { x: 2, y: 16 }] })
    .createLinePlot({ x: { field: "x", scale: { domain: [0, 2] } },
      y: { field: "y", scale: { domain: [5, 16] } }, guides: false })
    .createYAxis({ offset, ticksAndLabels: { values: [6, 8, 10, 12, 14, 16],
      ticks: { length: 5, alongOffset: 0.5 },
      labels: { fontSize: 10, format: ".2f", offset: 6.5, alongOffset: 0.890625 } },
      title: { text: "Quantity", fontSize: 11, fontWeight: 700, offset: 40.5, alongOffset: 0.5 } });
  const framed = createFramed(0), original = serializeProgram(framed);
  const moved = framed.editYAxis({ offset: 4 });
  assertEquivalentMeaning(moved.graphicSpec, createFramed(4).graphicSpec);
  assert.deepEqual(moved.editYAxis({ offset: 0 }).graphicSpec, framed.graphicSpec);
  assert.deepEqual(deserializeProgram(serializeProgram(moved)).graphicSpec, moved.graphicSpec);
  assert.throws(() => moved.editYAxisLabels({ offset: 20 }), /overlap/);
  assert.equal(serializeProgram(framed), original);

} }];
