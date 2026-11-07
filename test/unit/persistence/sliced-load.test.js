import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram, loadProgramInSlices } from "../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../src/persistence/codec.js";
import { parseJSONStages } from "../../../src/core/jsonSlices.js";
import { drainStages } from "../../../src/core/stages.js";
import { getErrorDetails } from "../../../src/core/diagnostics.js";
import { buildActionRelationshipPrograms } from "../../../scripts/action-relationship-source.js";

const points = count => chart().createCanvas({ width: 300, height: 200 })
  .createData({ id: "rows", keyField: "id", values: Array.from({ length: count }, (_, id) => ({ id, x: id % 97, y: id % 31 })) })
  .createPointMark({ id: "points", maxItems: 100000 }).encodeX({ field: "x" }).encodeY({ field: "y" });
const outcome = async load => {
  try { return { value: serializeProgram(await load()) }; } catch (error) { return { message: error.message, details: getErrorDetails(error) }; }
};
const fixtures = ["legacy-derived", "legacy-selection"].flatMap(name => {
  const directory = new URL(`../../fixtures/persistence/${name}/`, import.meta.url);
  return readdirSync(directory).filter(file => file.endsWith(".json") && file !== "manifest.json")
    .map(file => readFileSync(new URL(file, directory), "utf8"));
});

test("sliced load returns the exact synchronous program for every corpus and legacy snapshot", async () => {
  const texts = [...buildActionRelationshipPrograms().map(serializeProgram), ...fixtures, serializeProgram(points(5000))];
  for (const [index, text] of texts.entries()) {
    assert.deepEqual(await outcome(() => loadProgramInSlices(text, { sliceMs: 1 })), await outcome(() => deserializeProgram(text)), `snapshot ${index}`);
  }
});

test("sliced load reports the synchronous error for malformed and tampered snapshots", async () => {
  const text = serializeProgram(points(50)), envelope = JSON.parse(text), state = decodeValue(envelope.payload);
  const tampered = mutate => { const copy = structuredClone(state); mutate(copy); return JSON.stringify({ ...envelope, payload: encodeValue(copy) }); };
  const cases = ["", "{", `${text} x`, text.slice(0, -1), `﻿${text}`, text.replace('"editable"', '"graphic"'), JSON.stringify({ ...envelope, extensions: ["missing"] }),
    tampered(copy => { copy.semanticSpec.datasets[0].rowKeys[3] = copy.semanticSpec.datasets[0].rowKeys[2]; }),
    tampered(copy => { copy.graphicSpec.objects.points.items[7].id = copy.graphicSpec.objects.points.items[6].id; }),
    tampered(copy => { copy.actionStack.push({}); }), JSON.stringify({ ...envelope, payload: ["object", [["a", ["bad"]]]] }), 42];
  for (const input of cases) {
    const expected = await outcome(() => deserializeProgram(input));
    assert.ok(expected.message, String(input).slice(0, 40));
    assert.deepEqual(await outcome(() => loadProgramInSlices(input, { sliceMs: 1 })), expected);
  }
});

test("sliced load yields host turns, honors cancellation and validates its options", async () => {
  const text = serializeProgram(points(20000));
  let turns = 0, running = true;
  const tick = () => { turns++; if (running) setTimeout(tick, 0); };
  setTimeout(tick, 0);
  const program = await loadProgramInSlices(text, { sliceMs: 2 });
  running = false;
  assert.ok(turns > 3, `host turns ${turns}`);
  assert.equal(serializeProgram(program), text);
  const controller = new AbortController(), reason = new Error("stop");
  const pending = loadProgramInSlices(text, { sliceMs: 1, signal: controller.signal });
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  const aborted = new AbortController(); aborted.abort(reason);
  await assert.rejects(loadProgramInSlices(text, { signal: aborted.signal }), error => error === reason);
  for (const options of [{ sliceMs: 0 }, { sliceMs: 1.5 }, { sliceMs: 1001 }, { signal: {} }, { extra: 1 }, null]) {
    await assert.rejects(loadProgramInSlices(text, options));
  }
});

test("the sliced JSON parser equals JSON.parse for accepted and rejected pieces", () => {
  const texts = ['[1, {"a": [true, null, "x\\"]"]}, {"__proto__": {"b": 2}, "a": 1, "a": 3}]', '{"k": [[[]], {}, -0.5e3, "\\u00e9"]}',
    '[1,]', '{"a" 1}', '[1 2]', '{"a":}', '[] []', '["\\x"]', '[1, 2', ' {"a": [1, 2] } ', '[[1, 2], [3, {"b": "}"}]]'];
  for (const text of texts) for (const chunk of [1, 2, 4, 64]) {
    let expected, actual;
    try { expected = { value: JSON.parse(text) }; } catch { expected = { error: true }; }
    try { actual = { value: drainStages(parseJSONStages(text, chunk)) }; } catch (error) { assert.ok(error instanceof SyntaxError); actual = { error: true }; }
    assert.deepEqual(actual, expected, `${text} / ${chunk}`);
    if (expected.value !== undefined) assert.equal(JSON.stringify(actual.value), JSON.stringify(expected.value));
  }
  const proto = drainStages(parseJSONStages('{"__proto__": {"polluted": true}, "padding": [1, 2, 3, 4]}', 4));
  assert.equal(Object.getPrototypeOf(proto), Object.prototype);
  assert.deepEqual(Object.keys(proto), ["__proto__", "padding"]);
});
