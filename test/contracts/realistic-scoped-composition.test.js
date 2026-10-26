import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

// Native options retain their existing dataset ledgers. This matrix owns the
// cross-cutting target, target.childPath and target.id transport contract.
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
for (const dataset of datasets) test(`scopes constructors, individual resources and atomic batches on ${dataset}`, () => {
  try {
    const view = realisticRecordView(dataset, { includeSecondaryMeasure: true, rowLimit: 24, groupLimit: 5 });
    assert.equal(view.provenance.sourceDataset, dataset);
    const rows = view.rows.map(row => ({ ...row, index: row.sourceRowIndex + 1, magnitude: Math.abs(row.value) + 1 }));
    const base = chart().createCanvas({ width: 600, height: 400, margin: 70 }).createData({ id: "data", values: rows });
    for (const action of ["createBarPlot", "createLinePlot", "createScatterPlot", "createParallelCoordinates"]) {
      const options = action === "createParallelCoordinates" ? { dimensions: ["index", "magnitude"] }
        : { x: action === "createBarPlot" ? { field: "index", fieldType: "nominal" } : "index", y: "magnitude" };
      const original = hconcat({ programs: [{ id: "left", program: base }, { id: "right", program: base }] });
      const p = original[action]({ target: [{ childPath: ["left"] }, { childPath: ["right"] }],
        id: "marks", data: "data", ...options, guides: false });
      assert.equal(original.children.left.semanticSpec.layers.length, 0);
      assert.equal(p.trace.children.at(-1).op, action);
      const targets = [{ childPath: ["left"], id: "marks" }, { childPath: ["right"], id: "marks" }];
      const both = p.encodeOpacity({ target: targets, value: .45 });
      const left = both.encodeColor({ target: targets[0], value: "red" });
      for (const id of ["left", "right"]) {
        assert.equal(both.children[id].markConfigs.marks.opacity, .45);
        assert.deepEqual(both.children[id].semanticSpec.datasets.find(d=>d.id==="data").values, rows);
      }
      const paint = ["createBarPlot", "createScatterPlot"].includes(action) ? "fill" : "stroke";
      assert.ok(left.children.left.graphicSpec.objects.marks.items.every(item=>item.properties[paint] === "red"));
      assert.equal(left.children.right, both.children.right);
      const before = serializeProgram(left);
      assert.throws(()=>left.encodeOpacity({target:[targets[0],{childPath:["missing"],id:"marks"}],value:.9}),/Unknown target child/);
      assert.equal(serializeProgram(left),before);
      assert.deepEqual(deserializeProgram(before).graphicSpec,left.graphicSpec);
      assert.match(renderToSVG(left),/<(?:circle|path|rect)\b/u);
    }
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
