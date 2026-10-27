import { execFileSync } from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deserializeProgram, serializeProgram } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { getMarkItems } from "../../../src/inspection.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

const directory = new URL("../../fixtures/persistence/legacy-derived/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
for (const fixture of manifest.files.filter(file => file.kind === undefined)) {
  const text = readFileSync(new URL(fixture.path, directory), "utf8");
  test(`historical ${fixture.path} proves derived correspondence and preserves concrete output`, () => {
    assert.equal(createHash("sha256").update(text).digest("hex"), fixture.sha256);
    const state = decodeValue(JSON.parse(text).payload), restored = deserializeProgram(text);
    assert.equal(renderToSVG(restored), renderToSVG({ graphicSpec: state.graphicSpec }));
    assert.equal(serializeProgram(deserializeProgram(text)), serializeProgram(restored));
    const unit = restored.children.left ?? restored;
    const items = getMarkItems(unit, { target: "points" });
    assert.deepEqual(items.map(item => item.fields.id), ["c", "b"]);
    assert.deepEqual(items.filter(item => item.properties.fill === "red").map(item => item.fields.id), ["b"]);
    for (const item of items) {
      assert.ok(item.rows.some(ref => ref.data === "rows" && ref.role === "left"));
      assert.ok(item.rows.some(ref => ref.data === "lookup" && ref.role === "right"));
    }
    const edited = unit.editMarkSelection({ selection: "picked", rows: { data: "rows", indices: [2] } });
    assert.deepEqual(getMarkItems(edited, { target: "points" }).filter(item => item.properties.fill === "red").map(item => item.fields.id), ["c"]);
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(edited))), serializeProgram(edited));
  });
  test(`historical ${fixture.path} rejects changed derived values instead of repairing them`, () => {
    const envelope = JSON.parse(text), state = decodeValue(envelope.payload);
    const unit = state.children.left ?? state;
    unit.semanticSpec.datasets.find(dataset => dataset.id === "sorted").values[0].y = 900;
    envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /values do not match|Lookup values/);
  });
}

test("legacy derived and retained child namespaces are reproducible in a fresh process", () => {
  for (const fixture of manifest.files) {
    const file = new URL(fixture.path, directory);
    const expected = serializeProgram(deserializeProgram(readFileSync(file, "utf8")));
    const script = `import { readFileSync } from "node:fs"; import { deserializeProgram, serializeProgram } from ${JSON.stringify(new URL("../../../src/persistence.js", import.meta.url).href)}; process.stdout.write(serializeProgram(deserializeProgram(readFileSync(new URL(${JSON.stringify(file.href)}), "utf8"))));`;
    assert.equal(execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }), expected);
  }
});

test("legacy visible statistics validate after selection migration without redrawing", () => {
  const fixture = manifest.files.find(file => file.kind === "statistical");
  const text = readFileSync(new URL(fixture.path, directory), "utf8");
  assert.equal(createHash("sha256").update(text).digest("hex"), fixture.sha256);
  const saved = decodeValue(JSON.parse(text).payload), restored = deserializeProgram(text);
  assert.deepEqual(restored.graphicSpec, saved.graphicSpec);
  const data = restored.semanticSpec.datasets.find(dataset => dataset.transform?.[0].type === "statisticalReference");
  assert.deepEqual(data.values, [{ value: 4 }]);
  assert.deepEqual(data.lineage.entries[0].map(ref => ref.rowKey), restored.semanticSpec.datasets[0].rowKeys);
  assert.equal(serializeProgram(deserializeProgram(serializeProgram(restored))), serializeProgram(restored));
});


test("historical box outputs and explicit filtered row correspondence migrate without replay", () => {
  const fixture = manifest.files.find(file => file.kind === "box-filter");
  const text = readFileSync(new URL(fixture.path, directory), "utf8");
  assert.equal(createHash("sha256").update(text).digest("hex"), fixture.sha256);
  const state = decodeValue(JSON.parse(text).payload), restored = deserializeProgram(text);
  assert.deepEqual(restored.graphicSpec, state.graphicSpec);
  const dataset = id => restored.semanticSpec.datasets.find(dataset => dataset.id === id);
  assert.deepEqual(dataset("outliers").values.map(row => row.id), ["d"]);
  assert.deepEqual(dataset("outliers").rowKeys, [dataset("rows").rowKeys[3]]);
  assert.deepEqual(dataset("summary").lineage.entries[0].map(ref => ref.rowKey), dataset("rows").rowKeys);
  assert.deepEqual(getMarkItems(restored, { target: "points" }).map(item => item.fields.id), ["c", "d"]);
  const envelope = JSON.parse(text);
  delete state.materializationConfigs.rowProvenance;
  envelope.payload = encodeValue(state);
  assert.throws(() => deserializeProgram(JSON.stringify(envelope)), /provenance/i);
});
