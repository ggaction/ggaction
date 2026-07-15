import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import {
  ERROR_BAR_LAYOUT,
  ERROR_BAR_VARIANT_STYLE,
  RULE_GEOMETRY_LAYOUT,
  createExplicitIntervalReferenceValues,
  createEncodedLayerInferenceReferenceValues,
  createErrorBarReferenceValues,
  createHorizontalErrorBarReferenceValues,
  createStyledErrorBarReferenceValues,
  createRuleGeometryReferenceValues
} from "./reference-values.js";

test("locks every accepted rule endpoint geometry class", () => {
  const values = createRuleGeometryReferenceValues();

  assert.deepEqual(values.bounds, {
    left: 80,
    right: 680,
    top: 90,
    bottom: 410
  });
  assert.deepEqual(
    values.rules.map(rule => Object.keys(rule.channels)),
    [
      ["x"],
      ["y"],
      ["x", "y", "y2"],
      ["y", "x", "x2"],
      ["x", "y", "x2", "y2"]
    ]
  );
  assert.deepEqual(
    values.rules.map(rule =>
      [rule.x1, rule.y1, rule.x2, rule.y2].map(value =>
        Number(value.toFixed(10))
      )
    ),
    [
      [170, 90, 170, 410],
      [80, 147.6, 680, 147.6],
      [308, 352.4, 308, 198.8],
      [392, 288.4, 608, 288.4],
      [440, 115.6, 632, 224.4]
    ]
  );
});

test("keeps full spans on plot bounds and bounded rules inside them", () => {
  const { bounds, rules } = createRuleGeometryReferenceValues();
  const [vertical, horizontal, ...bounded] = rules;

  assert.deepEqual([vertical.y1, vertical.y2], [bounds.top, bounds.bottom]);
  assert.deepEqual([horizontal.x1, horizontal.x2], [bounds.left, bounds.right]);
  for (const rule of bounded) {
    assert.equal(rule.x1 >= bounds.left && rule.x1 <= bounds.right, true);
    assert.equal(rule.x2 >= bounds.left && rule.x2 <= bounds.right, true);
    assert.equal(rule.y1 >= bounds.top && rule.y1 <= bounds.bottom, true);
    assert.equal(rule.y2 >= bounds.top && rule.y2 <= bounds.bottom, true);
  }
  assert.deepEqual(RULE_GEOMETRY_LAYOUT.domain, [0, 100]);
});

test("locks the canonical acceleration interval rows and resolved scales", () => {
  const values = createErrorBarReferenceValues(loadCars());

  assert.deepEqual(values.statistics.map(row => [
    row.Origin,
    row.count,
    row.degreesOfFreedom
  ]), [
    ["USA", 254, 253],
    ["Europe", 73, 72],
    ["Japan", 79, 78]
  ]);
  assert.deepEqual(values.xDomain, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.yDomain, [14, 18]);
  assert.deepEqual(values.axes.x.positions, [180, 380, 580]);
  assert.deepEqual(values.axes.y.values, [14, 15, 16, 17, 18]);
  assert.deepEqual(values.axes.y.positions, [390, 315, 240, 165, 90]);
  assert.deepEqual(values.transform, {
    type: "interval",
    field: "Acceleration",
    groupBy: ["Origin"],
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: {
      center: "__errorBar_center",
      lower: "__errorBar_lower",
      upper: "__errorBar_upper"
    }
  });
});

test("maps vertical intervals and fixed eight-pixel caps independently", () => {
  const values = createErrorBarReferenceValues(loadCars());

  assert.deepEqual(
    values.mainRules.map(rule =>
      [rule.x1, rule.y1, rule.x2, rule.y2].map(value =>
        Number(value.toFixed(10))
      )
    ),
    [
      [180, 345.3028613156, 180, 293.3191859284],
      [380, 231.0435911745, 380, 125.6687375926],
      [580, 259.9297595585, 580, 194.2474556314]
    ]
  );
  for (const [index, cap] of values.lowerCaps.entries()) {
    assert.equal(cap.x2 - cap.x1, ERROR_BAR_LAYOUT.capSize);
    assert.equal(cap.y1, values.mainRules[index].y1);
  }
  for (const [index, cap] of values.upperCaps.entries()) {
    assert.equal(cap.x2 - cap.x1, ERROR_BAR_LAYOUT.capSize);
    assert.equal(cap.y1, values.mainRules[index].y2);
  }
});

test("maps the encoded point layer and inferred interval through shared scales", () => {
  const values = createEncodedLayerInferenceReferenceValues(loadCars());

  assert.deepEqual(values.xDomain, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.yDomain, [8, 24.8]);
  assert.deepEqual(values.pointX.slice(0, 3), [180, 180, 180]);
  assert.deepEqual(
    values.pointY.slice(0, 3).map(value => Number(value.toFixed(10))),
    [318.5714285714, 327.5, 336.4285714286]
  );
  assert.deepEqual(
    values.mainRules.map(rule =>
      [rule.x1, rule.y1, rule.x2, rule.y2].map(value =>
        Number(value.toFixed(10))
      )
    ),
    [
      [180, 272.2149669799, 180, 259.8379014115],
      [380, 245.0103788511, 380, 219.9211279982],
      [580, 251.8880379901, 580, 236.2493941979]
    ]
  );
});

test("locks horizontal Horsepower intervals and perpendicular caps", () => {
  const values = createHorizontalErrorBarReferenceValues(loadCars());

  assert.deepEqual(values.statistics.map(row => [row.Origin, row.count]), [
    ["USA", 250],
    ["Europe", 71],
    ["Japan", 79]
  ]);
  assert.deepEqual(values.xDomain, [70, 130]);
  assert.deepEqual(values.yDomain, ["USA", "Europe", "Japan"]);
  assert.deepEqual(values.axes.x.values, [70, 80, 90, 100, 110, 120, 130]);
  assert.deepEqual(values.axes.y.positions, [140, 240, 340]);
  assert.deepEqual(
    values.mainRules.map(rule =>
      [rule.x1, rule.y1, rule.x2, rule.y2].map(value => Number(value.toFixed(10)))
    ),
    [
      [529.1873227515, 140, 628.8126772485, 140],
      [140.7353506028, 240, 239.2646493972, 240],
      [138.4415992765, 340, 218.267261483, 340]
    ]
  );
  for (const cap of [...values.lowerCaps, ...values.upperCaps]) {
    assert.equal(cap.x1, cap.x2);
    assert.equal(cap.y2 - cap.y1, ERROR_BAR_LAYOUT.capSize);
  }
});

test("keeps explicit interval rows independent from transform state and caps", () => {
  const values = createExplicitIntervalReferenceValues(loadCars());

  assert.deepEqual(Object.keys(values.sourceRows[0]), [
    "Origin",
    "meanAcceleration",
    "lowerAcceleration",
    "upperAcceleration"
  ]);
  assert.deepEqual(values.fields, {
    center: "meanAcceleration",
    lower: "lowerAcceleration",
    upper: "upperAcceleration"
  });
  assert.deepEqual(values.lowerCaps, []);
  assert.deepEqual(values.upperCaps, []);
});

test("locks styled caps at sixteen pixels without changing interval geometry", () => {
  const baseline = createErrorBarReferenceValues(loadCars());
  const values = createStyledErrorBarReferenceValues(loadCars());

  assert.deepEqual(values.mainRules, baseline.mainRules);
  assert.deepEqual(ERROR_BAR_VARIANT_STYLE, {
    stroke: "#d9485f",
    strokeWidth: 3,
    strokeDash: [8, 4],
    opacity: 0.8,
    capSize: 16
  });
  for (const cap of [...values.lowerCaps, ...values.upperCaps]) {
    assert.equal(cap.y1, cap.y2);
    assert.equal(cap.x2 - cap.x1, ERROR_BAR_VARIANT_STYLE.capSize);
  }
});
