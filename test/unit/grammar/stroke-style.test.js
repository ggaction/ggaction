import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LINE_CAP,
  DEFAULT_LINE_JOIN,
  DEFAULT_MITER_LIMIT,
  requestedStrokeDetails,
  resolveStrokeDetails,
  validateLineCap,
  validateLineJoin,
  validateMiterLimit
} from "../../../src/grammar/strokeStyle.js";
import { validateConcreteGraphicProperties } from
  "../../../src/grammar/schemas/concreteGraphic.js";
import { validateGraphicProperty } from
  "../../../src/grammar/schemas/graphic.js";

test("resolves omitted stroke details without persisting defaults", () => {
  assert.deepEqual(resolveStrokeDetails(), {
    lineCap: DEFAULT_LINE_CAP,
    lineJoin: DEFAULT_LINE_JOIN,
    miterLimit: DEFAULT_MITER_LIMIT
  });
  assert.deepEqual(requestedStrokeDetails({}), {});
  assert.deepEqual(requestedStrokeDetails({
    lineCap: "round",
    lineJoin: "bevel",
    miterLimit: 3
  }), {
    lineCap: "round",
    lineJoin: "bevel",
    miterLimit: 3
  });
  assert.equal(Object.isFrozen(resolveStrokeDetails()), true);
});

test("validates the closed stroke detail vocabulary", () => {
  for (const cap of ["butt", "round", "square"]) {
    assert.equal(validateLineCap(cap), cap);
  }
  for (const join of ["miter", "round", "bevel"]) {
    assert.equal(validateLineJoin(join), join);
  }
  assert.equal(validateMiterLimit(0.25), 0.25);

  assert.throws(() => validateLineCap(1), TypeError);
  assert.throws(() => validateLineCap("flat"), /lineCap/u);
  assert.throws(() => validateLineJoin(null), TypeError);
  assert.throws(() => validateLineJoin("sharp"), /lineJoin/u);
  for (const value of [NaN, Infinity, "3", null]) {
    assert.throws(() => validateMiterLimit(value), TypeError);
  }
  for (const value of [0, -1]) {
    assert.throws(() => validateMiterLimit(value), RangeError);
  }
});

test("accepts stroke details only on strokable concrete graphics", () => {
  for (const type of ["collection", "circle", "rect", "line", "path"]) {
    for (const property of ["lineCap", "lineJoin", "miterLimit"]) {
      assert.equal(validateGraphicProperty(type, property), property);
    }
    validateConcreteGraphicProperties(type, {
      lineCap: "square",
      lineJoin: "round",
      miterLimit: 2
    });
  }
  for (const type of ["text", "canvas"]) {
    assert.throws(
      () => validateGraphicProperty(type, "lineJoin"),
      new RegExp(`Unknown ${type} graphic property`)
    );
  }
  assert.throws(
    () => validateConcreteGraphicProperties("line", { miterLimit: 0 }),
    /miterLimit/u
  );
});
