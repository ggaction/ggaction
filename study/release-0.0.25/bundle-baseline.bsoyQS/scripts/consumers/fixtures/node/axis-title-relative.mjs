import assert from "node:assert/strict";
import { chart } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";

export const cases = [{ id: "guides/label-relative-axis-title", async run() {
  for (const factory of [chart, basicChart]) {
    const p = factory().createCanvas({ width: 600, height: 500, margin: 150 })
      .createData({ values: [{ x: 0, y: 0, panel: "A" }, { x: 1, y: 100, panel: "B" }] })
      .createScatterPlot({ x: "x", y: "y", guides: false })
      .createYAxis({ title: { text: "Measure", offset: { from: "labels", gap: 5 } } });
    assert.deepEqual(p.guideConfigs.axis.y.title.offset, { from: "labels", gap: 5 });
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
    assert(renderToSVG(p).includes("Measure"));
    assert.equal((await renderToPNGBuffer(p)).width, 600);
    assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0, 4).toString(), "%PDF");
    if (factory === chart) {
      const q = p.editYAxisLabels({ fontSize: 20 });
      assert(q.graphicSpec.objects.yAxisTitle.properties.x < p.graphicSpec.objects.yAxisTitle.properties.x);
      const f = q.facet({ field: "panel", guides: { axes: "each", legend: false } })
        .editFacetScales({ y: "independent" });
      assert.deepEqual(deserializeProgram(serializeProgram(f)).graphicSpec, f.graphicSpec);
      assert.equal(q.editYAxis({ labels: false, title: false }).guideConfigs.axis.y.title, undefined);
      const before = serializeProgram(q);
      assert.throws(() => q.editYAxis({ labels: false }));
      assert.equal(serializeProgram(q), before);
    }
  }
} }];
