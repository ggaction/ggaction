import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, reviseDataInSlices } from "../../../../src/index.js";
import { serializeProgram } from "../../../../src/persistence.js";
import { getErrorDetails } from "../../../../src/core/diagnostics.js";

// Each revision allocates fresh dataset namespaces. Both calls draw the same
// deterministic sequence, so the complete snapshots must be identical.
const outcome = async revise => {
  let next = 0;
  Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, writable: true,
    value: () => `00000000-0000-4000-8000-${String(next++).padStart(12, "0")}` });
  try { return { value: serializeProgram(await revise()) }; } catch (error) { return { message: error.message, details: getErrorDetails(error) }; }
  finally { delete globalThis.crypto.randomUUID; }
};
const rows = count => Array.from({ length: count }, (_, id) => ({ id, x: id % 97, y: id % 31, group: `g${id % 4}` }));
const points = (count = 40) => chart().createCanvas({ width: 300, height: 200 })
  .createData({ id: "rows", keyField: "id", values: rows(count) })
  .createPointMark({ id: "points", maxItems: 100000 }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "group" });

test("sliced revise returns the synchronous revision for unit, derived, mixed and composed charts", async () => {
  const revised = rows(40).map(row => ({ ...row, x: row.x / 2 }));
  const unit = points();
  const derived = unit.filterData({ id: "big", source: "rows", field: "group", oneOf: ["g1", "g2"] })
    .createLineMark({ id: "line", data: "big" }).encodeX({ field: "x" }).encodeY({ field: "y" });
  const bars = chart().createCanvas({ width: 300, height: 200 }).createData({ id: "rows", values: rows(12) })
    .createBarPlot({ id: "bars", x: "group", y: "y" });
  const composed = hconcat({ programs: [{ id: "left", program: unit }, { id: "right", program: bars }] });
  const cases = [
    [unit, { source: "rows", id: "revision", values: revised }],
    [derived, { source: "rows", id: "revision", values: revised }],
    [bars, { source: "rows", id: "revision", values: rows(12).map(row => ({ ...row, y: row.y + 1 })) }],
    [points(5000), { source: "rows", id: "revision", values: rows(5000).reverse() }],
    [composed.children.left, { source: "rows", id: "revision", values: revised }]
  ];
  for (const [index, [program, args]] of cases.entries()) {
    assert.deepEqual(await outcome(() => reviseDataInSlices(program, args, { sliceMs: 1 })), await outcome(() => program.reviseData(args)), `case ${index}`);
  }
});

test("sliced revise reports the synchronous error and leaves the program unchanged", async () => {
  const program = points(), before = serializeProgram(program);
  const cases = [{ source: "missing", id: "revision", values: [] }, { source: "rows", id: "revision", values: [{ id: 1, x: "no", y: 2 }] },
    { source: "rows", id: "revision", values: [{ id: 1, x: 1, y: 2 }, { id: 1, x: 2, y: 3 }] }, { source: "rows", id: "rows", values: rows(3) },
    { source: "rows", id: "revision", values: rows(3), keyField: "id" }, { source: "rows", id: "revision", values: rows(3), unknown: true }];
  for (const args of cases) {
    const expected = await outcome(() => program.reviseData(args));
    assert.ok(expected.message, JSON.stringify(args).slice(0, 60));
    assert.deepEqual(await outcome(() => reviseDataInSlices(program, args, { sliceMs: 1 })), expected);
  }
  assert.equal(serializeProgram(program), before);
});

test("sliced revise yields host turns, honors cancellation and validates options", async () => {
  const program = points(20000), args = { source: "rows", id: "revision", values: rows(20000).reverse() };
  let turns = 0, running = true;
  const tick = () => { turns++; if (running) setTimeout(tick, 0); };
  setTimeout(tick, 0);
  const revised = await reviseDataInSlices(program, args, { sliceMs: 2 });
  running = false;
  assert.ok(turns > 5, `host turns ${turns}`);
  assert.equal(revised.semanticSpec.layers[0].data, "revision");
  const controller = new AbortController(), reason = new Error("stop");
  const pending = reviseDataInSlices(program, args, { sliceMs: 1, signal: controller.signal });
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  for (const options of [{ sliceMs: 0 }, { sliceMs: 2.5 }, { signal: 1 }, { other: 1 }]) await assert.rejects(reviseDataInSlices(program, args, options));
  await assert.rejects(reviseDataInSlices({}, args), /chart program/);
});

test("sliced revise copies plain rows before returning, so later caller changes cannot reach it", async () => {
  const program = points(20000), values = rows(20000).reverse(), args = { source: "rows", id: "revision", values };
  const expected = await outcome(() => program.reviseData({ ...args, values: rows(20000).reverse() }));
  const pending = outcome(() => reviseDataInSlices(program, args, { sliceMs: 1 }));
  // Change the rows at every host turn until the revision settles.
  let settled = false;
  pending.then(() => { settled = true; });
  for (let turn = 0; !settled; turn++) {
    values[turn % values.length] = { id: -1, x: 999, y: 999, group: "changed" };
    if (turn === 3) values.length = 10;
    args.id = "other";
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  assert.deepEqual(await pending, expected);
});
