import assert from "node:assert/strict";
import test from "node:test";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import {
  CONDITIONAL_WITNESS_DATASETS, buildConditionalLifecycleWitness
} from "../support/scenarios/realistic-conditional-recipes.js";

function selectedData(program) {
  const id = program.materializationConfigs.data.filter.filtered.current;
  return program.semanticSpec.datasets.find(dataset => dataset.id === id);
}
function fills(program) {
  return program.graphicSpec.objects.selected.items.map(item => item.properties.fill);
}

test("conditional selection and expression filter lifecycle have five authentic independent dataset witnesses", () => {
  const witnessed = new Map(["filterData", "editFilteredData", "encodeColor", "encodeStroke", "encodeOpacity",
    "encodeX", "encodeY", "encodePointRadius", "encodeText", "encodeDx", "encodeDy"]
    .map(action => [action, new Set()]));
  for (const dataset of CONDITIONAL_WITNESS_DATASETS) {
    try {
      const { program, rows, cutoff, yDomain, provenance } = buildConditionalLifecycleWitness(dataset);
      const original = serializeProgram(program);
      function assertConditionalGeometry(actual, filterCutoff, selectionCutoff) {
        const visible = rows.filter(row => row.order <= filterCutoff);
        const points = actual.graphicSpec.objects.selected.items;
        const labels = actual.graphicSpec.objects.labels.items;
        assert.equal(points.length, visible.length);
        assert.equal(labels.length, visible.length);
        const mappedX = value => 60 + value / rows.length * 480;
        const mappedY = value => 340 - (value - yDomain[0]) / (yDomain[1] - yDomain[0]) * 280;
        const close = (actualValue, expected, label) => assert.ok(
          Math.abs(actualValue - expected) < 1e-9,
          `${dataset}: ${label}: ${actualValue} matches ${expected}`);
        for (const [index, row] of visible.entries()) {
          const selected = row.order >= selectionCutoff;
          const point = points[index].properties;
          close(point.x, mappedX(row.order === filterCutoff ? 0 : row.order), "conditional X");
          close(point.y, mappedY(selected ? 0 : row.value), "conditional Y");
          assert.equal(point.radius, selected ? 6 : 3);
          const label = labels[index].properties;
          assert.equal(label.text, selected ? "Selected" : row.category);
          close(label.x, mappedX(row.order) + (selected ? 8 : 0), "conditional dx");
          close(label.y, mappedY(row.value) + (row.order === filterCutoff ? -4 : 2), "conditional dy");
        }
      }
      assertConditionalGeometry(program, cutoff, cutoff);
      assert.equal(provenance.sourceDataset, dataset);
      assert.deepEqual(rows.map(row => row.sourceRowIndex), provenance.sourceRowIndexes);
      assert.ok(rows.length >= 4);
      const source = program.semanticSpec.datasets.find(item => item.id === "observations");
      assert.deepEqual(selectedData(program).values, rows.filter(row => row.order <= cutoff));
      assert.deepEqual(selectedData(program).rowKeys, source.rowKeys.slice(0, cutoff));
      assert.deepEqual(fills(program), rows.slice(0, cutoff).map(row =>
        row.order >= cutoff ? "#dc2626" : "#2563eb"));
      assert.deepEqual(program.graphicSpec.objects.selected.items.map(item => item.properties.stroke),
        rows.slice(0, cutoff).map(row => row.order >= cutoff ? "#0f172a" : "#94a3b8"));
      assert.deepEqual(program.graphicSpec.objects.selected.items.map(item => item.properties.opacity),
        rows.slice(0, cutoff).map(row => row.order === cutoff ? 0 : 0.75));
      const edited = program.editParameter({ target: "cutoff", value: cutoff + 1 });
      assertConditionalGeometry(edited, cutoff + 1, cutoff);
      assert.deepEqual(selectedData(edited).values, rows.filter(row => row.order <= cutoff + 1));
      assert.deepEqual(selectedData(edited).rowKeys, source.rowKeys.slice(0, cutoff + 1));
      assert.deepEqual(selectedData(edited).transform[0].parameterInputs,
        [{ kind: "parameter", id: "cutoff", revision: 1 }]);
      assert.deepEqual(fills(edited), rows.slice(0, cutoff + 1).map(row =>
        row.order >= cutoff ? "#dc2626" : "#2563eb"));
      const changedSelection = edited.editMarkSelection({ selection: "tail",
        field: "order", op: "gte", value: cutoff + 1 });
      assertConditionalGeometry(changedSelection, cutoff + 1, cutoff + 1);
      assert.deepEqual(fills(changedSelection), rows.slice(0, cutoff + 1).map(row =>
        row.order >= cutoff + 1 ? "#dc2626" : "#2563eb"));
      const restored = deserializeProgram(serializeProgram(changedSelection));
      assert.equal(serializeProgram(restored), serializeProgram(changedSelection));
      const reduced = restored.editParameter({ target: "cutoff", value: cutoff - 1 });
      assertConditionalGeometry(reduced, cutoff - 1, cutoff + 1);
      assert.deepEqual(selectedData(reduced).values, rows.filter(row => row.order < cutoff));
      assert.deepEqual(fills(reduced), Array(cutoff - 1).fill("#2563eb"));
      assert.equal(serializeProgram(program), original, `${dataset} previous program is immutable`);
      assertGraphicIntegrity(reduced, dataset);
      assertSvgIntegrity(renderToSVG(reduced), dataset);
      for (const [action, datasets] of witnessed) {
        assert.ok(program.trace.children.some(entry => entry.op === action &&
          (action.startsWith("encode") ? entry.args.conditionsCount > 0 : entry.args.where?.version === 2)),
        `${dataset}: direct ${action}`);
        datasets.add(dataset);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  }
  for (const [action, datasets] of witnessed) {
    assert.equal(datasets.size, 5, `${action}: five occurrences on five distinct datasets exceeds 5/3`);
  }
});
