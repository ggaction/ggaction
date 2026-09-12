import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

function values(program, id, field) {
  return program.semanticSpec.datasets
    .find(dataset => dataset.id === id).values.map(row => row[field]);
}

test("createNormalizedData preserves row order for share, minmax, and zscore", () => {
  const source = chart().createData({
    id: "source",
    values: [{ x: 2 }, { x: 4 }]
  });
  const share = source.createNormalizedData({
    id: "share", field: "x", as: "result", method: "share"
  });
  const minmax = source.createNormalizedData({
    id: "minmax", field: "x", as: "result", method: "minmax"
  });
  const population = source.createNormalizedData({
    id: "population", field: "x", as: "result", method: "zscore"
  });
  const sample = source.createNormalizedData({
    id: "sample", field: "x", as: "result", method: "zscore",
    variance: "sample"
  });

  assert.deepEqual(values(share, "share", "result"), [1 / 3, 2 / 3]);
  assert.deepEqual(values(minmax, "minmax", "result"), [0, 1]);
  assert.deepEqual(values(population, "population", "result"), [-1, 1]);
  assert.deepEqual(
    values(sample, "sample", "result"),
    [-0.7071067811865475, 0.7071067811865475]
  );
  assert.deepEqual(
    share.trace.children.at(-1).children.map(child => child.op),
    ["createDerivedData", "materializeNormalizedData"]
  );
  assert.deepEqual(source.semanticSpec.datasets, [{
    id: "source", values: [{ x: 2 }, { x: 4 }]
  }]);
});

test("createNormalizedData applies stable sorted baselines without reordering rows", () => {
  const source = chart().createData({
    id: "source",
    values: [{ t: 2, x: 15 }, { t: 1, x: 10 }]
  });
  const common = {
    field: "x",
    as: "result",
    sortBy: [{ field: "t", order: "ascending" }]
  };
  const index = source.createNormalizedData({
    ...common, id: "index", method: "index"
  });
  const change = source.createNormalizedData({
    ...common, id: "change", method: "change"
  });
  const percent = source.createNormalizedData({
    ...common, id: "percent", method: "percentChange"
  });

  assert.deepEqual(values(index, "index", "result"), [150, 100]);
  assert.deepEqual(values(change, "change", "result"), [5, 0]);
  assert.deepEqual(values(percent, "percent", "result"), [0.5, 0]);
  assert.deepEqual(index.semanticSpec.datasets[1].transform[0].baseline, {
    position: "first"
  });

  const negative = chart()
    .createData({ id: "negative", values: [{ t: 1, x: -10 }, { t: 2, x: -15 }] })
    .createNormalizedData({
      ...common, id: "negativePercent", source: "negative", method: "percentChange"
    });
  assert.deepEqual(values(negative, "negativePercent", "result"), [0, 0.5]);
});

test("createNormalizedData keeps group summaries and baselines independent", () => {
  const source = chart().createData({
    id: "source",
    values: [
      { group: "A", t: 1, x: 1 },
      { group: "B", t: 1, x: 2 },
      { group: "A", t: 2, x: 3 },
      { group: "B", t: 2, x: 2 }
    ]
  });
  const share = source.createNormalizedData({
    id: "groupShare", field: "x", as: "share", groupBy: "group", method: "share"
  });
  assert.deepEqual(values(share, "groupShare", "share"), [0.25, 0.5, 0.75, 0.5]);

  const change = source.createNormalizedData({
    id: "groupChange", field: "x", as: "change", groupBy: ["group"],
    method: "change", sortBy: [{ field: "t" }]
  });
  assert.deepEqual(values(change, "groupChange", "change"), [0, 0, 2, 0]);
});

test("createNormalizedData applies explicit zero-denominator policies", () => {
  const source = chart().createData({
    id: "source",
    values: [{ x: 3 }, { x: 3 }]
  });
  const zero = source.createNormalizedData({
    id: "zero", field: "x", as: "result", method: "zscore",
    zeroDenominator: "zero"
  });
  const nullable = source.createNormalizedData({
    id: "nullable", field: "x", as: "result", method: "zscore",
    zeroDenominator: "null"
  });
  const share = source.createNormalizedData({
    id: "share", field: "x", as: "result", method: "share"
  });
  assert.deepEqual(values(zero, "zero", "result"), [0, 0]);
  assert.deepEqual(values(nullable, "nullable", "result"), [null, null]);
  assert.deepEqual(values(share, "share", "result"), [0.5, 0.5]);
  assert.throws(() => source.createNormalizedData({
    id: "error", field: "x", as: "result", method: "minmax"
  }), /denominator is zero/);
});

test("createNormalizedData rejects invalid definitions and source values atomically", () => {
  const source = chart().createData({
    id: "source",
    values: [{ group: "A", t: 1, x: -1 }, { group: "A", t: 2, x: 2 }]
  });
  const snapshot = JSON.stringify(source);
  const cases = [
    [{ id: "share", field: "x", as: "result", method: "share" }, /negative/],
    [{
      id: "sample", field: "x", as: "result", groupBy: "t",
      method: "zscore", variance: "sample"
    }, /at least two/],
    [{ id: "baseline", field: "x", as: "result", method: "index" }, /non-empty sortBy/],
    [{
      id: "baselineModes", field: "x", as: "result", method: "index",
      baseline: { position: "first", value: 1 }, sortBy: [{ field: "t" }]
    }, /exactly one/],
    [{
      id: "sortKey", field: "x", as: "result", method: "index",
      baseline: { position: "first" }, sortBy: [{ field: "t", nulls: "last" }]
    }, /Unknown normalize sortBy/],
    [{
      id: "change", field: "x", as: "result", method: "change",
      sortBy: [{ field: "t" }], zeroDenominator: "zero"
    }, /not available for change/],
    [{
      id: "collision", field: "x", as: "group", method: "minmax"
    }, /already exists/],
    [{
      id: "missing", field: "missing", as: "result", method: "minmax"
    }, /does not contain field/
    ]
  ];
  for (const [options, error] of cases) {
    assert.throws(() => source.createNormalizedData(options), error);
    assert.equal(JSON.stringify(source), snapshot);
  }
});

test("createNormalizedData owns canonical options and rejects overflowing results", () => {
  const groupBy = ["group"];
  const sortBy = [{ field: "t" }];
  const baseline = { position: "first" };
  const program = chart()
    .createData({ id: "source", values: [
      { group: "A", t: 1, x: 2 },
      { group: "A", t: 2, x: 4 }
    ] })
    .createNormalizedData({
      id: "normalized", field: "x", as: "result", groupBy,
      method: "index", sortBy, baseline
    });
  groupBy[0] = "changed";
  sortBy[0].field = "changed";
  baseline.position = "last";
  assert.deepEqual(program.semanticSpec.datasets[1].transform[0], {
    type: "normalize",
    field: "x",
    as: "result",
    groupBy: ["group"],
    method: "index",
    zeroDenominator: "error",
    baseline: { position: "first" },
    sortBy: [{ field: "t", order: "ascending" }]
  });

  const overflow = chart().createData({
    id: "source", values: [{ t: 1, x: Number.MIN_VALUE }, { t: 2, x: Number.MAX_VALUE }]
  });
  assert.throws(() => overflow.createNormalizedData({
    id: "overflow", field: "x", as: "result", method: "index",
    sortBy: [{ field: "t" }]
  }), /outside the finite numeric range/);
});

test("createNormalizedData validates empty-source structure without inventing fields", () => {
  const program = chart()
    .createData({ id: "source", values: [] })
    .createNormalizedData({
      id: "empty", field: "unknown", as: "result", method: "share"
    });
  assert.deepEqual(program.semanticSpec.datasets[1].values, []);
});

test("facets source rows before replaying statistical normalization", () => {
  const base = chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({ id: "source", values: [
      { facet: "left", x: 1 },
      { facet: "left", x: 3 },
      { facet: "right", x: 2 },
      { facet: "right", x: 2 }
    ] })
    .createNormalizedData({
      id: "shares", field: "x", as: "share", method: "share"
    })
    .createPointMark({ id: "points", data: "shares" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "share" });
  const faceted = base.facet({ field: "facet", guides: { legend: false } });
  const expected = new Map([
    ["left", [0.25, 0.75]],
    ["right", [0.5, 0.5]]
  ]);

  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const sourceRows = child.semanticSpec.datasets.find(dataset =>
      dataset.id === `${id}-data`
    ).values;
    const replayed = child.semanticSpec.datasets.find(dataset =>
      dataset.transform?.[0]?.type === "normalize" && dataset.id !== "shares"
    );
    assert.ok(replayed);
    assert.deepEqual(replayed.values.map(row => row.share), expected.get(sourceRows[0].facet));
    assert.equal(child.semanticSpec.layers[0].data, replayed.id);
  }
});
