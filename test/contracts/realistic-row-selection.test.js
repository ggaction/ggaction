import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { datasetDefinition } from "../support/datasets/catalog.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { realisticDirectPaletteRangeProgram } from "../support/scenarios/realistic-direct-lifecycle-coverage-recipes.js";

const DATASETS = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const REQUIRED = [
  "filterMarks.rows", "filterMarks.rows.data", "filterMarks.rows.indices",
  "createMarkLabels.select.rows", "createMarkLabels.select.rows.data", "createMarkLabels.select.rows.indices",
  "editMarkLabelSelection.select.rows", "editMarkLabelSelection.select.rows.data", "editMarkLabelSelection.select.rows.indices",
  "highlightMarks.fontSize", "highlightMarks.select.rows", "highlightMarks.select.rows.data", "highlightMarks.select.rows.indices"
];

test("new row selection and text highlight options have five authentic dataset witnesses", () => {
  const seen = new Map(REQUIRED.map(path => [path, new Set()]));
  for (const dataset of DATASETS) {
    try {
      const source = realisticDirectPaletteRangeProgram(dataset);
      assert.equal(datasetDefinition(dataset).corpus, "tidytuesday");
      assert.equal(source.provenance.sourceDataset, dataset);
      assert.match(source.provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u);
      const rows = source.program.semanticSpec.datasets.find(d => d.id === "analysisRows").values;
      assert.ok(rows.length > 2);
      const p = chart().createCanvas({ margin: 80 }).createData({ id: "observations", values: rows })
        .createScatterPlot({ id: "points", x: "positiveX", y: "positiveY", guides: false })
        .filterMarks({ target: "points", rows: { data: "observations", indices: [0, 1] } })
        .createMarkLabels({ id: "labels", source: "points", field: "positiveY", select: { rows: { data: "observations", indices: [0] } } })
        .editMarkLabelSelection({ target: "labels", select: { rows: { data: "observations", indices: [1] } } })
        .highlightMarks({ id: "highlight", target: "labels", select: { rows: { data: "observations", indices: [1] } }, color: "red", fontSize: 18 });
      const items = getMarkItems(p, { target: "labels" });
      assert.equal(items.length, 1);
      assert.ok(items[0].rows.some(r => r.data === "observations" && r.index === 1));
      assert.equal(items[0].geometry[0].properties.fontSize, 18);
      assert.equal(items[0].geometry[0].properties.fill, "red");
      assert.deepEqual(p.semanticSpec.datasets.find(d => d.id === "observations").values, rows);
      const restored = deserializeProgram(serializeProgram(p));
      assert.equal(renderToSVG(restored), renderToSVG(p));
      assert.deepEqual(getMarkItems(restored, { target: "labels" }), items);
      for (const path of REQUIRED) {
        const [action, ...parts] = path.split(".");
        const entry = p.trace.children.find(child => child.op === action);
        assert.ok(entry, path);
        let value = entry.args;
        for (const part of parts) value = value?.[part] ?? value?.[`${part}Count`];
        assert.notEqual(value, undefined, `${dataset} ${path}`);
        seen.get(path).add(dataset);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  }
  for (const [path, datasets] of seen) assert.equal(datasets.size, 5, path);
});
