import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { deserializeProgram, serializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { getMarkItems } from "../../../src/inspection.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

const directory = new URL("../../fixtures/persistence/legacy-selection/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));

for (const fixture of manifest.files) {
  const text = readFileSync(new URL(fixture.path, directory), "utf8");
  test(`historical editable v${fixture.schemaVersion} preserves selected row, tagged cells and graphics`, () => {
    assert.equal(createHash("sha256").update(text).digest("hex"), fixture.sha256);
    const envelope = JSON.parse(text);
    assert.equal(envelope.schemaVersion, fixture.schemaVersion);
    const captured = decodeValue(envelope.payload);
    const program = deserializeProgram(text);
    const rows = program.semanticSpec.datasets[0].values;
    assert.deepEqual(rows.map(({ id, x, y }) => ({ id, x, y })), [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 5 }]);
    for (const row of rows) {
      assert.ok(Object.hasOwn(row, "missing"));
      assert.equal(row.missing, undefined);
      assert.ok(Number.isNaN(row.nonfinite));
      assert.equal(row.big, 9007199254740993n);
      assert.ok(Object.is(row.negativeZero, -0));
      assert.deepEqual(row.samples, Array.from({ length: 32 }, (_, i) => i));
      assert.ok(Object.isFrozen(row.samples));
    }
    if (fixture.schemaVersion === 3) {
      assert.equal(envelope.payload[0], "shared");
      assert.ok(envelope.payload[1].length > 0);
      assert.strictEqual(rows[0].samples, rows[1].samples);
    }
    const marked = getMarkItems(program, { target: "points" }).filter(item => item.properties.fill === "#ff0000");
    assert.deepEqual(marked.map(item => item.fields.id), ["b"]);
    assert.equal(renderToSVG(program), renderToSVG({ graphicSpec: captured.graphicSpec }));
    const saved = serializeProgram(program);
    const changed = program.editMarkSelection({ selection: "picked", rows: { data: "rows", indices: [0] } });
    assert.deepEqual(getMarkItems(changed, { target: "points" }).filter(item => item.properties.fill === "#ff0000").map(item => item.fields.id), ["a"]);
    assert.equal(serializeProgram(program), saved);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(changed))), renderToSVG(changed));
    assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(program))), renderToSVG(program));
  });

  test(`historical editable v${fixture.schemaVersion} rejects dangling and out-of-range selection before restoration`, () => {
    for (const mutate of [
      state => { state.materializationConfigs.selections.picked.selector.rows.indices = [2]; },
      state => { state.materializationConfigs.selections.picked.selector.rows.data = "absent"; },
      state => { state.materializationConfigs.selections.picked.target = "absent"; }
    ]) {
      const envelope = JSON.parse(text), state = decodeValue(envelope.payload);
      mutate(state); envelope.payload = encodeValue(state);
      assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
    }
    assert.equal(createHash("sha256").update(text).digest("hex"), fixture.sha256);
  });
}

test("historical snapshots restore, edit and remove selections in a fresh process", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { readFileSync } from 'node:fs';
    import { deserializeProgram, serializeProgram } from './src/persistence.js';
    import { getMarkItems } from './src/inspection.js';
    const files = JSON.parse(process.argv[1]);
    const results = files.map(file => {
      const before = deserializeProgram(readFileSync(file, 'utf8'));
      const saved = serializeProgram(before);
      const changed = before.editMarkSelection({ selection: 'picked', rows: { data: 'rows', indices: [0] } });
      const selected = getMarkItems(changed, {target:'points'}).filter(item => item.properties.fill === '#ff0000').map(item => item.fields.id);
      const removed = changed.removeMarkSelection({ selection: 'picked' });
      const restored = deserializeProgram(serializeProgram(removed));
      return { selected, unchanged: saved === serializeProgram(before),
        highlighted: getMarkItems(restored, {target:'points'}).filter(item => item.properties.fill === '#ff0000').length };
    });
    console.log(JSON.stringify(results));
  `, JSON.stringify(manifest.files.map(file => fileURLToPath(new URL(file.path, directory))))], {
    cwd: fileURLToPath(new URL("../../../", import.meta.url)), encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), manifest.files.map(() => ({ selected: ["a"], unchanged: true, highlighted: 0 })));
});
