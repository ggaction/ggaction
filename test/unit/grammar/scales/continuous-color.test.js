import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTINUOUS_COLOR_INTERPOLATIONS,
  interpolateColorStops,
  mapSequentialColors,
  resolveSequentialColorStops,
  validateContinuousColorInterpolation,
  validateSequentialColorRange
} from "../../../../src/grammar/scales/index.js";
import {
  PALETTE_NAMES,
  resolveContinuousPalette
} from "../../../../src/grammar/palettes.js";

test("interpolates every accepted continuous color vocabulary to concrete colors", () => {
  assert.deepEqual(CONTINUOUS_COLOR_INTERPOLATIONS, [
    "rgb",
    "hsl",
    "hsl-long",
    "lab",
    "hcl",
    "hcl-long",
    "cubehelix",
    "cubehelix-long"
  ]);

  for (const interpolation of CONTINUOUS_COLOR_INTERPOLATIONS) {
    assert.equal(validateContinuousColorInterpolation(interpolation), interpolation);
    assert.equal(
      /^#[0-9a-f]{6}$/.test(
        interpolateColorStops(["#440154", "#fde725"], 0.5, interpolation)
      ),
      true,
      interpolation
    );
    assert.equal(
      interpolateColorStops(["#440154", "#fde725"], 0, interpolation),
      "#440154"
    );
    assert.equal(
      interpolateColorStops(["#440154", "#fde725"], 1, interpolation),
      "#fde725"
    );
  }
});

test("resolves every named palette for continuous use", () => {
  for (const name of PALETTE_NAMES) {
    const colors = resolveContinuousPalette(name, 32);
    assert.equal(colors.length >= 2, true, name);
    assert.equal(colors.every(color => /^#[0-9a-f]{6}$/.test(color)), true, name);
  }
  assert.deepEqual(
    resolveContinuousPalette({ name: "viridis", extent: [1, 0] }, 3),
    ["#fde725", "#21918d", "#440154"]
  );
  assert.deepEqual(
    resolveContinuousPalette({ name: "viridis", count: 3 }),
    ["#440154", "#21918d", "#fde725"]
  );
  assert.deepEqual(
    resolveContinuousPalette({ name: "set2", count: 3 }),
    ["#66c2a5", "#fc8d62", "#8da0cb"]
  );
});

test("normalizes explicit ranges and maps sequential values", () => {
  assert.deepEqual(resolveSequentialColorStops(["navy", "hsl(60, 100%, 50%)"]), [
    "#000080",
    "#ffff00"
  ]);
  assert.deepEqual(
    mapSequentialColors([0, 5, 10], [0, 10], ["#000000", "#ffffff"]),
    ["#000000", "#808080", "#ffffff"]
  );
  assert.deepEqual(
    mapSequentialColors([-5, 15], [0, 10], ["#000000", "#ffffff"], {
      clamp: true
    }),
    ["#000000", "#ffffff"]
  );
  assert.equal(resolveSequentialColorStops("auto")[0], "#440154");
  assert.equal(resolveSequentialColorStops("auto").at(-1), "#fde725");
});

test("rejects invalid continuous color options", () => {
  assert.throws(
    () => validateContinuousColorInterpolation("RGB"),
    /Unsupported continuous color interpolation/
  );
  assert.throws(
    () => validateSequentialColorRange(["red"]),
    /at least two/
  );
  assert.throws(
    () => validateSequentialColorRange(["not-a-color", "blue"]),
    /Unsupported continuous color/
  );
  assert.deepEqual(
    validateSequentialColorRange({ palette: { name: "viridis", count: 2 } }),
    { palette: { name: "viridis", count: 2 } }
  );
  assert.throws(
    () => validateSequentialColorRange({ palette: { name: "viridis", count: 1 } }),
    /at least 2/
  );
  assert.throws(
    () => mapSequentialColors([NaN], [0, 1], ["#000000", "#ffffff"]),
    /finite numbers/
  );
});
