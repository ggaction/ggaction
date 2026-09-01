import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultAxisTitleRotation,
  formatAxisValue,
  resolveAxisLabelGeometry,
  resolveAxisTickGeometry,
  validateAxisFormat,
  validateAxisPosition
} from "../../../../src/actions/guides/axes/policy.js";

test("owns mirrored positions and outward guide geometry", () => {
  const bounds = { x: 20, y: 30, width: 160, height: 100 };

  assert.equal(validateAxisPosition("x", "top"), "top");
  assert.equal(validateAxisPosition("y", "right"), "right");
  assert.throws(() => validateAxisPosition("x", "right"), /Unsupported/);
  assert.equal(defaultAxisTitleRotation("x", "top"), 0);
  assert.equal(defaultAxisTitleRotation("y", "right"), Math.PI / 2);

  assert.deepEqual(resolveAxisTickGeometry({
    bounds,
    channel: "x",
    position: "top",
    positions: [40, 80],
    length: 6
  }), { x1: [40, 80], y1: 30, x2: [40, 80], y2: 24 });
  assert.deepEqual(resolveAxisLabelGeometry({
    bounds,
    channel: "y",
    position: "right",
    positions: [50, 90],
    offset: 12
  }), {
    x: 192,
    y: [50, 90],
    textAlign: "left",
    textBaseline: "middle"
  });
});

test("formats every accepted numeric and UTC axis token", () => {
  const auto = value => String(value);
  const number = 1.234;
  const timestamp = Date.UTC(2024, 0, 2);
  const expected = new Map([
    [".0f", "1"],
    [".1f", "1.2"],
    [".2f", "1.23"],
    [".0%", "123%"],
    [".1%", "123.4%"],
    [".2e", "1.23e+0"]
  ]);

  for (const [format, text] of expected) {
    assert.equal(formatAxisValue(number, "linear", format, auto), text);
  }
  assert.equal(formatAxisValue(timestamp, "time", "%Y", auto), "2024");
  assert.equal(formatAxisValue(timestamp, "time", "%Y-%m", auto), "2024-01");
  assert.equal(formatAxisValue(timestamp, "time", "%b %Y", auto), "Jan 2024");
  assert.equal(
    formatAxisValue(timestamp, "time", "%Y/%m/%d", auto),
    "2024/01/02"
  );
  assert.equal(
    formatAxisValue(timestamp, "time", "%b %% %Y", auto),
    "Jan % 2024"
  );
  assert.equal(
    formatAxisValue(timestamp, "time", "%Y-%m-%d", auto),
    "2024-01-02"
  );
  assert.equal(formatAxisValue(number, "linear", { decimals: 2 }, auto), "1.23");
  assert.equal(formatAxisValue(number, "linear", "auto", auto), "1.234");
});

test("formats numeric boundaries and UTC calendar boundaries deterministically", () => {
  const auto = value => String(value);

  assert.equal(formatAxisValue(-12.5, "linear", ".0f", auto), "-13");
  assert.equal(formatAxisValue(0, "linear", ".2e", auto), "0.00e+0");
  assert.equal(formatAxisValue(123_456_789, "linear", ".2e", auto), "1.23e+8");
  assert.equal(formatAxisValue(-0.25, "linear", ".1%", auto), "-25.0%");
  assert.equal(
    formatAxisValue(Date.UTC(1999, 11, 31, 23, 59), "time", "%Y-%m-%d", auto),
    "1999-12-31"
  );
});

test("rejects unknown and scale-incompatible axis formats", () => {
  const auto = value => String(value);

  assert.throws(() => validateAxisFormat(".3f"), /supported format string/);
  assert.throws(() => validateAxisFormat("%Y-%q"), /supported format string/);
  assert.throws(() => validateAxisFormat("%Y-%"), /supported format string/);
  assert.throws(() => validateAxisFormat("calendar"), /supported format string/);
  assert.throws(() => validateAxisFormat({ decimals: -1 }), /Label format/);
  assert.throws(
    () => formatAxisValue(1, "linear", "%Y", auto),
    /cannot use a time format/
  );
  assert.throws(
    () => formatAxisValue(Date.now(), "time", ".1f", auto),
    /supported time format/
  );
  assert.throws(
    () => formatAxisValue("A", "ordinal", ".1f", auto),
    /require format "auto"/
  );
});
