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
  const witnessed = new Map(["filterData", "editFilteredData", "encodeColor", "encodeStroke", "encodeOpacity"]
    .map(action => [action, new Set()]));
  for (const dataset of CONDITIONAL_WITNESS_DATASETS) {
    try {
      const { program, rows, cutoff, provenance } = buildConditionalLifecycleWitness(dataset);
      const original = serializeProgram(program);
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
      assert.deepEqual(selectedData(edited).values, rows.filter(row => row.order <= cutoff + 1));
      assert.deepEqual(selectedData(edited).rowKeys, source.rowKeys.slice(0, cutoff + 1));
      assert.deepEqual(selectedData(edited).transform[0].parameterInputs,
        [{ kind: "parameter", id: "cutoff", revision: 1 }]);
      assert.deepEqual(fills(edited), rows.slice(0, cutoff + 1).map(row =>
        row.order >= cutoff ? "#dc2626" : "#2563eb"));
      const changedSelection = edited.editMarkSelection({ selection: "tail",
        field: "order", op: "gte", value: cutoff + 1 });
      assert.deepEqual(fills(changedSelection), rows.slice(0, cutoff + 1).map(row =>
        row.order >= cutoff + 1 ? "#dc2626" : "#2563eb"));
      const restored = deserializeProgram(serializeProgram(changedSelection));
      assert.equal(serializeProgram(restored), serializeProgram(changedSelection));
      const reduced = restored.editParameter({ target: "cutoff", value: cutoff - 1 });
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
