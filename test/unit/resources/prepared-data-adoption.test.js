import assert from "node:assert/strict";
import test from "node:test";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const rows = [{ id: "a", x: 1, y: 2 }, { id: "b", x: 3, y: 4 }];
const manualRows = rows.map(row => ({ ...row, y: row.y + 10 }));

async function sourceUnit() {
  const base = chart().createCanvas().createParameter({ id: "region", value: "north" });
  const prepared = await prepareDataUpdate(base, { kind: "create", id: "raw", keyField: "id", source: {
    kind: "url", format: "json", url: { version: 2, registry: "standard@1", root: { type: "call", name: "concat", args: [
      { type: "literal", value: "https://example.test/" }, { type: "parameter", id: "region" }
    ] } }
  } }, { requestToken: "source", load: async () => ({
    text: JSON.stringify(rows), mimeType: "application/json", encoding: "utf-8"
  }) });
  return base.applyDataUpdate({ prepared, requestToken: "source" })
    .createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
}

for (const mode of ["action", "program"]) {
  test(`repeat ${mode} replacement preserves explicit source detachment across retained child adoption`, async () => {
    const unit = await sourceUnit();
    const original = unit.repeatCharts({ id: "metrics", target: "points", channel: "y", fields: ["x", "y"] });
    const saved = serializeProgram(original);
    const revision = { source: "raw", id: "manual", values: manualRows };
    const revised = original.editFacetSource(mode === "action"
      ? { action: { method: "reviseData", options: revision } }
      : { program: unit.reviseData(revision) });
    for (const scope of [revised, ...Object.values(revised.children)]) {
      assert.equal(scope.semanticSpec.resources.some(resource => resource.kind === "data-source"), false);
      assert.equal(scope.semanticSpec.datasets.find(dataset => dataset.id === "raw").sourceReceipt.original.text, JSON.stringify(rows));
      assert.deepEqual(scope.semanticSpec.datasets.find(dataset => dataset.id === "manual").values, manualRows);
    }
    const changed = revised.editParameter({ target: "region", value: "south" });
    assert.equal(changed.semanticSpec.resources.find(resource => resource.kind === "parameter").result.value, "south");
    assert.doesNotThrow(() => deserializeProgram(serializeProgram(changed)));
    assert.equal(serializeProgram(original), saved);
  });
}
