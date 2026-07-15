import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBarWidth,
  normalizeOffsetPadding,
  resolveBarWidth
} from "../../../../src/grammar/bars/geometry.js";

test("normalizes default, band, pixel, and retained bar widths", () => {
  assert.deepEqual(normalizeBarWidth(), { band: 0.72 });
  assert.deepEqual(normalizeBarWidth({ band: 0.5 }), { band: 0.5 });
  assert.deepEqual(normalizeBarWidth({ pixels: 14 }), { pixels: 14 });
  assert.deepEqual(normalizeBarWidth({}, { pixels: 9 }), { pixels: 9 });
  assert.equal(resolveBarWidth({ band: 0.5 }, 20), 10);
  assert.equal(resolveBarWidth({ pixels: 30 }, 20), 30);
});

test("validates mutually exclusive and positive bar width modes", () => {
  assert.throws(
    () => normalizeBarWidth({ band: 0.5, pixels: 10 }),
    /mutually exclusive/
  );
  for (const band of [0, -1, 1.1, NaN]) {
    assert.throws(() => normalizeBarWidth({ band }), /greater than 0/);
  }
  for (const pixels of [0, -1, Infinity, NaN]) {
    assert.throws(() => normalizeBarWidth({ pixels }), /positive finite/);
  }
  assert.throws(() => resolveBarWidth({ band: 0.5 }, 0), /positive resolved/);
});

test("normalizes partial offset padding updates", () => {
  assert.deepEqual(normalizeOffsetPadding(), {
    paddingInner: 0,
    paddingOuter: 0
  });
  assert.deepEqual(normalizeOffsetPadding(
    { paddingInner: 0.2 },
    { paddingInner: 0.1, paddingOuter: 0.4 }
  ), {
    paddingInner: 0.2,
    paddingOuter: 0.4
  });
  assert.throws(
    () => normalizeOffsetPadding({ paddingInner: 1 }),
    /paddingInner/
  );
  assert.throws(
    () => normalizeOffsetPadding({ paddingOuter: -1 }),
    /paddingOuter/
  );
});
