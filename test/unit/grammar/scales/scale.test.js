import assert from "node:assert/strict";
import test from "node:test";

import {
  DASH10,
  NAMED_DASH_PATTERNS,
  mapLinearValues,
  mapOrdinalPositionValues,
  mapOrdinalValues,
  readQuantitativeField,
  readNominalField,
  readTemporalField,
  resolveColorRange,
  resolveContinuousDomain,
  resolveOrdinalDomain,
  resolveOrdinalOffsetScale,
  resolveOrdinalPositionScale,
  resolveScaleDomain,
  resolveScaleRange,
  resolveStrokeDashRange,
  normalizeStrokeDashPattern,
  validateFieldType,
  validateColorRange,
  validateNominalFieldType,
  validateOrdinalDomain,
  validatePositionChannel,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType,
  validateStrokeDashRange
} from "../../../../src/grammar/scales.js";
import { niceTimeDomain } from "../../../../src/grammar/scales/temporal.js";

test("reads finite quantitative field values", () => {
  const values = readQuantitativeField([{ value: 1 }, { value: 4 }], "value");

  assert.deepEqual(values, [1, 4]);
  assert.equal(Object.isFrozen(values), true);
  assert.throws(
    () => readQuantitativeField([{ value: 1 }, {}], "value"),
    /finite number at row 1/
  );
});

test("normalizes temporal field values to timestamps", () => {
  const values = readTemporalField(
    [
      { value: 1970 },
      { value: "1980" },
      { value: "1990-08-05" },
      { value: "1997/08/21" },
      { value: Date.UTC(2000, 0, 1) }
    ],
    "value"
  );

  assert.deepEqual(values, [
    Date.UTC(1970, 0, 1),
    Date.UTC(1980, 0, 1),
    Date.UTC(1990, 7, 5),
    Date.UTC(1997, 7, 21),
    Date.UTC(2000, 0, 1)
  ]);
  assert.equal(Object.isFrozen(values), true);
  assert.throws(
    () => readTemporalField([{ value: "not-a-date" }], "value"),
    /temporal string or finite timestamp/
  );
  assert.throws(
    () => readTemporalField([{ value: "2024-02-31" }], "value"),
    /valid date/
  );
});

test("resolves automatic domains and positional ranges", () => {
  const bounds = { x: 70, y: 30, width: 540, height: 310 };

  assert.deepEqual(resolveScaleDomain("auto", [4, 1, 9]), [1, 9]);
  assert.deepEqual(resolveScaleRange("auto", "x", bounds), [70, 610]);
  assert.deepEqual(resolveScaleRange("auto", "y", bounds), [340, 30]);
  assert.deepEqual(resolveScaleDomain([0, 10], []), [0, 10]);
  assert.deepEqual(resolveScaleRange([5, 15], "x", undefined), [5, 15]);
});

test("maps linear values and centers a constant domain", () => {
  assert.deepEqual(mapLinearValues([0, 5, 10], [0, 10], [20, 100]), [
    20,
    60,
    100
  ]);
  assert.deepEqual(mapLinearValues([2, 2], [2, 2], [10, 20]), [15, 15]);
  assert.throws(
    () => mapLinearValues([NaN], [2, 2], [10, 20]),
    /finite numbers/
  );
  assert.deepEqual(
    mapLinearValues([-5, 5, 15], [0, 10], [20, 100], { clamp: true }),
    [20, 60, 100]
  );
  assert.throws(
    () => mapLinearValues([5], [0, 10], [20, 100], { clamp: "yes" }),
    /must be a boolean/
  );
});

test("stabilizes a near-constant nice domain", () => {
  const resolved = resolveContinuousDomain({
    domain: "auto",
    values: [0.1, 0.1 + Number.EPSILON],
    type: "linear",
    nice: true,
    zero: false
  });

  assert.equal(resolved[0], resolved[1]);
  assert.equal(resolved[0] > 0.1, true);
});

test("rounds time domains at calendar boundaries across supported spans", () => {
  const cases = [
    [
      [Date.UTC(2021, 5, 15), Date.UTC(2024, 2, 10)],
      [Date.UTC(2021, 0, 1), Date.UTC(2025, 0, 1)]
    ],
    [
      [Date.UTC(2024, 0, 15), Date.UTC(2024, 5, 2)],
      [Date.UTC(2024, 0, 1), Date.UTC(2024, 6, 1)]
    ],
    [
      [Date.UTC(2024, 0, 1, 12), Date.UTC(2024, 0, 8, 4)],
      [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 9)]
    ],
    [
      [Date.UTC(2024, 0, 1, 1, 20), Date.UTC(2024, 0, 1, 6, 10)],
      [Date.UTC(2024, 0, 1, 1), Date.UTC(2024, 0, 1, 7)]
    ],
    [
      [Date.UTC(2024, 0, 1, 1, 2, 20), Date.UTC(2024, 0, 1, 1, 8, 10)],
      [Date.UTC(2024, 0, 1, 1, 2), Date.UTC(2024, 0, 1, 1, 9)]
    ],
    [[1_250, 4_100], [1_000, 5_000]]
  ];

  for (const [domain, expected] of cases) {
    assert.deepEqual(niceTimeDomain(domain), expected);
  }
  const constant = [Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1)];
  assert.equal(niceTimeDomain(constant), constant);
  assert.deepEqual(
    niceTimeDomain([Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)]),
    [Date.UTC(2024, 0, 1), Date.UTC(2025, 0, 1)]
  );
});

test("validates the continuous scale vocabulary and bounds", () => {
  assert.equal(validatePositionChannel("x"), "x");
  assert.equal(validateFieldType("quantitative"), "quantitative");
  assert.equal(validateFieldType("ordinal"), "ordinal");
  assert.equal(validateFieldType("temporal"), "temporal");
  assert.equal(validateScaleType("linear"), "linear");
  assert.equal(validateScaleType("log"), "log");
  assert.equal(validateScaleType("time"), "time");
  assert.equal(validateScaleDomain("auto"), "auto");
  assert.equal(validateScaleRange("auto"), "auto");

  assert.throws(() => validatePositionChannel("color"), /Unknown/);
  assert.throws(() => validateFieldType("nominal"), /Unsupported/);
  assert.throws(() => validateScaleType("band"), /Unsupported/);
  assert.throws(() => validateScaleDomain([0]), /two finite numbers/);
  assert.throws(() => validateScaleRange([0, Infinity]), /two finite numbers/);
  assert.throws(
    () => resolveScaleDomain("auto", []),
    /infer an automatic scale domain/
  );
  assert.throws(
    () => resolveScaleRange("auto", "x", undefined),
    /requires graphical bounds/
  );
});

test("resolves ordinal position domains, ranges, and band geometry", () => {
  const scale = resolveOrdinalPositionScale({
    domain: "auto",
    values: [1850, 1860, 1850, 1870],
    range: "auto",
    channel: "x",
    bounds: { x: 80, y: 40, width: 300, height: 200 }
  });

  assert.deepEqual(scale, {
    type: "ordinal",
    domain: [1850, 1860, 1870],
    range: [80, 380],
    step: 100,
    bandwidth: 100
  });
  assert.deepEqual(mapOrdinalPositionValues([1850, 1870], scale), [130, 330]);
  assert.equal(Object.isFrozen(scale), true);
});

test("preserves explicit ordinal order and reversed position ranges", () => {
  const scale = resolveOrdinalPositionScale({
    domain: [1870, 1860, 1850],
    values: [1850, 1860, 1870],
    range: [300, 0],
    channel: "x"
  });

  assert.deepEqual(scale, {
    type: "ordinal",
    domain: [1870, 1860, 1850],
    range: [300, 0],
    step: -100,
    bandwidth: 100
  });
  assert.deepEqual(mapOrdinalPositionValues([1870, 1850], scale), [250, 50]);
  assert.throws(
    () => resolveOrdinalPositionScale({
      domain: [1850],
      values: [1850, 1860],
      range: [0, 100],
      channel: "x"
    }),
    /outside the ordinal domain/
  );
  assert.throws(
    () => mapOrdinalPositionValues([1900], scale),
    /outside the ordinal domain/
  );
});

test("resolves ordinal offsets within a parent band", () => {
  assert.deepEqual(resolveOrdinalOffsetScale({
    domain: "auto",
    values: ["men", "women", "men"],
    range: "auto",
    parentBandwidth: 40
  }), {
    type: "ordinal",
    domain: ["men", "women"],
    range: [0, 40],
    step: 20,
    start: 0,
    bandwidth: 20,
    paddingInner: 0,
    paddingOuter: 0
  });
  assert.deepEqual(resolveOrdinalOffsetScale({
    domain: ["men", "women"],
    values: ["men", "women"],
    range: [40, 0],
    parentBandwidth: 40,
    paddingInner: 0.2,
    paddingOuter: 0.1
  }), {
    type: "ordinal",
    domain: ["men", "women"],
    range: [40, 0],
    step: -20,
    start: 38,
    bandwidth: 16,
    paddingInner: 0.2,
    paddingOuter: 0.1
  });
  assert.throws(
    () => resolveOrdinalOffsetScale({
      domain: "auto",
      values: ["men"],
      range: "auto"
    }),
    /positive x bandwidth/
  );
});

test("resolves nominal domains and tableau10 color ranges", () => {
  const values = readNominalField(
    [{ origin: "USA" }, { origin: "Europe" }, { origin: "USA" }],
    "origin"
  );
  const domain = resolveOrdinalDomain("auto", values);
  const range = resolveColorRange({ palette: "tableau10" });

  assert.deepEqual(domain, ["USA", "Europe"]);
  assert.deepEqual(range.slice(0, 3), ["#4c78a8", "#f58518", "#e45756"]);
  assert.deepEqual(mapOrdinalValues(values, domain, range), [
    "#4c78a8",
    "#f58518",
    "#4c78a8"
  ]);
});

test("validates nominal fields, ordinal domains, and color ranges", () => {
  assert.equal(validateNominalFieldType("nominal"), "nominal");
  assert.deepEqual(validateOrdinalDomain(["USA", "Europe"]), [
    "USA",
    "Europe"
  ]);
  assert.deepEqual(validateColorRange(["red", "blue"]), ["red", "blue"]);
  assert.throws(() => validateNominalFieldType("quantitative"), /Unsupported/);
  assert.throws(() => validateOrdinalDomain(["USA", "USA"]), /unique/);
  assert.throws(() => validateColorRange([]), /non-empty color strings/);
  assert.throws(
    () => validateColorRange({ palette: "unknown" }),
    /Unknown palette/
  );
  assert.throws(
    () => readNominalField([{ value: null }], "value"),
    /nominal value/
  );
});

test("resolves and validates ordinal stroke dash ranges", () => {
  assert.deepEqual(resolveStrokeDashRange("auto"), DASH10);
  assert.equal(DASH10.length, 10);
  assert.deepEqual(NAMED_DASH_PATTERNS, {
    solid: [],
    dashed: [6, 4],
    dotted: [1, 3],
    dashdot: [6, 3, 1, 3]
  });
  assert.deepEqual(
    resolveStrokeDashRange(["solid", "dashed", "dotted", "dashdot"]),
    [[], [6, 4], [1, 3], [6, 3, 1, 3]]
  );
  assert.deepEqual(normalizeStrokeDashPattern([]), []);
  assert.deepEqual(normalizeStrokeDashPattern([2, 5]), [2, 5]);
  assert.deepEqual(validateStrokeDashRange([[], [8, 4]]), [[], [8, 4]]);
  assert.throws(() => validateStrokeDashRange([]), /one or more/);
  assert.throws(() => normalizeStrokeDashPattern("longdash"), /Unknown/);
  assert.throws(() => validateStrokeDashRange([[3]]), /even-length/);
  assert.throws(() => validateStrokeDashRange([[3, -1]]), /non-negative/);
  assert.throws(() => validateStrokeDashRange([[3, Infinity]]), /finite/);
  assert.throws(() => validateStrokeDashRange([[0, 0]]), /nonzero/);
});
