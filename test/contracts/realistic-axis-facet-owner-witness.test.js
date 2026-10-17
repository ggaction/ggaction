import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { resolveFacetProgramLayout } from "../../src/materialization/facets.js";
import { resolveConcreteGraphicBounds } from "../../src/grammar/schemas/graphicBounds.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { exerciseCartesianAxisOwners } from "../support/scenarios/cartesian-axis-owner-witness.js";

for (const dataset of ["tt-tour-de-france-winners", "tt-london-marathon-winners", "tt-penguins"]) {
  test(`named axis and parent legend lifecycle preserve actual rows from ${dataset}`, async () => {
    const view = realisticRecordView(dataset, { rowLimit: 24 });
    const native = chart().createCanvas({ width: 4400, height: 3200, margin: 1000 })
      .createData({ id: "rows", values: view.rows }).createPointMark({ id: "points" })
      .encodeX({ field: "orderNumeric" }).encodeY({ field: "value" });
    const original = serializeProgram(native);
    for (let repetition = 0; repetition < 5; repetition++) {
      let owners = 0;
      const exercised = exerciseCartesianAxisOwners(native, { observe(program, { baseline, align }) {
        owners++;
        assert.equal(program.semanticSpec.guides.axis.sourceQuantity.scale, "y");
        assert.equal(program.semanticSpec.guides.axis.sourceShare.scale, "axisSecondary");
        assert.equal(program.guideConfigs.axis.sourceHorizontal.title.baseline, baseline);
        assert.equal(program.guideConfigs.axis.sourceHorizontal.labels.align, align);
        assert.equal(program.graphicSpec.objects.axis_sourceHorizontal__Line.properties.y1, 2204);
        assert.equal(program.graphicSpec.objects.axis_sourceQuantity__Line.properties.x1, 996);
        assert.equal(program.graphicSpec.objects.axis_sourceShare__Line.properties.x1, 3402);
        assert.deepEqual(program.graphicSpec.objects.axis_sourceHorizontal__Ticks.items[0].properties.strokeDash, []);
        assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
      } });
      assert.equal(owners, 6);
      assert.deepEqual(exercised.graphicSpec, native.graphicSpec);
      assert.equal(serializeProgram(native), original);
      const arrays = exercised.trace.children.filter(entry => entry.op === "createAxes");
      assert.equal(arrays.length, 6);
      assert.ok(arrays.every(entry => entry.args.xCount === 1 && entry.args.yCount === 2));
      assert.deepEqual(exercised.semanticSpec.datasets, native.semanticSpec.datasets);
      const arrayFacade = chart().createCanvas({ width: 4400, height: 3200, margin: 1000 })
        .createData({ values: view.rows })
        .createScatterPlot({ id: "namedScatter", x: "orderNumeric", y: "value", guides: {
          axes: { coordinate: { id: "main", type: "cartesian" },
            x: [{ id: "index", ticksAndLabels: false, title: false }],
            y: [{ id: "quantity", position: "left", ticksAndLabels: false, title: false },
              { id: "rightQuantity", position: "right", ticksAndLabels: false, title: false }] },
          grid: false, legend: false } });
      assert.deepEqual(Object.keys(arrayFacade.guideConfigs.axis), ["index", "quantity", "rightQuantity"]);
      assert.equal(arrayFacade.trace.children.at(-1).args.guides.axes.xCount, 1);
      assert.equal(arrayFacade.trace.children.at(-1).args.guides.axes.yCount, 2);
      assert.deepEqual(deserializeProgram(serializeProgram(arrayFacade)).graphicSpec, arrayFacade.graphicSpec);
      const binned = chart().createCanvas({ width: 4400, height: 3200, margin: 1000 })
        .createData({ id: "rows", values: view.rows }).createHeatmap({ id: "binned",
          x: "orderNumeric", y: "value", bin: { bins: 3 }, guides: { axes: {
            x: [{ id: "heatmapX", title: false }],
            y: [{ id: "heatmapY", title: false },
              { id: "heatmapRight", position: "right", title: { text: "Source intervals" } }]
          }, legend: false } });
      assert.equal(binned.graphicSpec.objects.axis_heatmapX__Title, undefined);
      assert.equal(binned.graphicSpec.objects.axis_heatmapY__Title, undefined);
      assert.ok(binned.graphicSpec.objects.axis_heatmapX__Line);
      assert.ok(binned.graphicSpec.objects.axis_heatmapY__Ticks);
      assert.equal(binned.graphicSpec.objects.axis_heatmapRight__Title.properties.text, "Source intervals");
      assert.equal(binned.trace.children.at(-1).args.guides.axes.yCount, 2);
      assert.deepEqual(binned.semanticSpec.datasets.find(data => data.id === "rows").values, view.rows);
      assert.deepEqual(deserializeProgram(serializeProgram(binned)).graphicSpec, binned.graphicSpec);
      const parent = chart().createCanvas({ plot: { width: 60, height: 275 },
        margin: { top: 35, right: 45, bottom: 60, left: 45 } })
        .createData({ id: "rows", values: view.rows })
        .createScatterPlot({ id: "points", x: "orderNumeric", y: "value", color: "category", guides: false })
        .facet({ field: "category", columns: 4, spacing: "plot", gap: 100,
          guides: { axes: "outer", legend: { target: "points", channels: ["color"], position: "bottom", direction: "horizontal", columns: 2 } } })
        .editLegendTitle({ title: "Source groups", fontSize: 12 })
        .editLegendLabels({ channel: "color", fontSize: 11 })
        .editLegendBorder({ border: { strokeDash: [4, 2] } })
        .editLegendBlock({ target: "points", channel: "color", text: { color: "#334155" } })
        .editLegendLayout({ channel: "color", position: "top-right", direction: "vertical", columns: 1 });
      const changed = parent.editCompositionLayout({ gap: 110 });
      const { plot } = resolveFacetProgramLayout(changed);
      const bounds = resolveConcreteGraphicBounds(changed.graphicSpec, "facet-shared-legend", changed.materializationConfigs.textMetrics);
      assert.equal(bounds.right, plot.x + plot.width - 8);
      assert.equal(bounds.top, plot.y + 8);
      assert.ok(bounds.right - bounds.left > 60);
      for (const child of Object.values(changed.children)) assert.equal(child.materializationConfigs.canvas.plot.width, 60);
      assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
      assert.deepEqual(changed.semanticSpec.datasets, parent.semanticSpec.datasets);
      const removed = changed.removeLegend({ channels: ["color"] });
      assert.equal(removed.compositionSpec.facet.guides.legend, false);
      assert.equal(removed.editCompositionLayout({ gap: 115 }).guideConfigs.legend, undefined);
      if (repetition === 0) assert.ok((await renderToPNGBuffer(changed)).buffer.length > 100);
    }
  });
}
