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
    else { assert.equal(p.editCanvas, undefined); assert.deepEqual(q.graphicSpec, fullGeometry); }
    assert.equal(q.graphicSpec.objects.yAxisTitle.properties.x, 11.2587890625);
    assert.equal(q.guideConfigs.axis.y.title.offset, title.offset);
    assert.equal(Object.hasOwn(q.context, "pendingMaterializationPlan"), false);
    assert.equal(serializeProgram(p), before);
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
    const png = await renderToPNGBuffer(q);
    assert.equal(png.width, 154); assert.equal(png.height, 177);
  }
} }];
