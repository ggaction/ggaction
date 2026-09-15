import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({
    group: "A", category: "c1", x: 1, y: 2, value: 1,
    a: 1, b: 2, when: "2024-01-01T00:00:00Z", order: 1,
    missing: null, weight: 1
  }),
  Object.freeze({
    group: "A", category: "c2", x: 2, y: 4, value: 2,
    a: 2, b: 3, when: "2024-01-02T00:00:00Z", order: 2,
    missing: 2, weight: 2
  }),
  Object.freeze({
    group: "B", category: "c1", x: 3, y: 6, value: 3,
    a: 3, b: 4, when: "2024-01-03T00:00:00Z", order: 3,
    missing: null, weight: 1
  }),
  Object.freeze({
    group: "B", category: "c2", x: 4, y: 8, value: 4,
    a: 4, b: 5, when: "2024-01-04T00:00:00Z", order: 4,
    missing: 4, weight: 2
  })
]);

function source() {
  return chart().createData({ id: "raw", values: rows });
}

function multiply(field, constant) {
  return {
    op: "multiply",
    left: { field },
    right: { constant }
  };
}

function dataset(program, id) {
  return program.semanticSpec.datasets.find(candidate => candidate.id === id);
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

test("edits a derived dependency closure only when recompute is explicit", () => {
  const before = chart()
    .createData({ id: "raw", values: [{ x: 1 }, { x: 2 }, { x: 3 }] })
    .createComputedData({
      id: "twice",
      source: "raw",
      as: "z",
      expression: multiply("x", 2)
    })
    .createSummaryData({
      id: "average",
      source: "twice",
      aggregates: [{ op: "mean", field: "z", as: "mean" }]
    });
  const snapshot = JSON.stringify(before);

  assert.throws(
    () => before.editComputedData({
      target: "twice",
      expression: multiply("x", 3)
    }),
    /average.*depends.*recompute/
  );
  assert.equal(JSON.stringify(before), snapshot);

  const after = before.editComputedData({
    target: "twice",
    expression: multiply("x", 3),
    dependents: "recompute"
  });
  const computedId = after.materializationConfigs.data.computed.twice.current;
  const summaryId = after.materializationConfigs.data.summary.average.current;

  assert.deepEqual(
    dataset(after, computedId).values.map(row => row.z),
    [3, 6, 9]
  );
  assert.deepEqual(dataset(after, summaryId).values, [{ mean: 6 }]);
  assert.equal(dataset(after, summaryId).source, computedId);
  assert.equal(dataset(before, "average").values[0].mean, 4);
  assert.equal(JSON.stringify(before), snapshot);

  const reused = after.createSummaryData({
    id: "reused",
    source: "twice",
    aggregates: [{ op: "mean", field: "z", as: "mean" }]
  });
  assert.equal(dataset(reused, "reused").source, computedId);
  assert.deepEqual(dataset(reused, "reused").values, [{ mean: 6 }]);
});

test("rebinds every direct consumer output role and preserves unrelated branches", () => {
  const before = chart()
    .createCanvas()
    .createData({ id: "raw", values: rows })
    .createComputedData({
      id: "twice", source: "raw", as: "z", expression: multiply("x", 2)
    })
    .createComputedData({
      id: "sibling", source: "raw", as: "other", expression: { field: "y" }
    })
    .createPointMark({ id: "first", data: "twice" })
    .encodeX({ target: "first", field: "x", fieldType: "quantitative" })
    .encodeY({ target: "first", field: "z", fieldType: "quantitative" })
    .createPointMark({ id: "second", data: "twice" })
    .encodeX({ target: "second", field: "x", fieldType: "quantitative" })
    .encodeY({ target: "second", field: "z", fieldType: "quantitative" });
  const siblingId = before.materializationConfigs.data.computed.sibling.current;
  const after = before.editComputedData({ target: "twice", as: "w" });
  const current = after.materializationConfigs.data.computed.twice.current;

  for (const id of ["first", "second"]) {
    const layer = after.semanticSpec.layers.find(candidate => candidate.id === id);
    assert.equal(layer.data, current);
    assert.equal(layer.encoding.y.field, "w");
    assert.equal(after.graphicSpec.objects[id].items.length, rows.length);
  }
  assert.equal(
    after.materializationConfigs.data.computed.sibling.current,
    siblingId
  );
  assert.ok(dataset(after, siblingId));
});

test("rejects unsafe downstream field renames and invalid targets atomically", () => {
  const chained = source()
    .createComputedData({
      id: "twice", source: "raw", as: "z", expression: multiply("x", 2)
    })
    .createComputedData({
      id: "plusOne",
      source: "twice",
      as: "result",
      expression: {
        op: "add", left: { field: "z" }, right: { constant: 1 }
      }
    });
  const snapshot = JSON.stringify(chained);
  assert.throws(
    () => chained.editComputedData({
      target: "twice", as: "w", dependents: "recompute"
    }),
    /does not contain field "z"/
  );
  assert.equal(JSON.stringify(chained), snapshot);

  const sourceOnly = source();
  assert.throws(
    () => sourceOnly.editComputedData({ target: "raw", as: "z" }),
    /source dataset.*cannot be edited/
  );
  assert.throws(
    () => sourceOnly.editComputedData({ target: "missing", as: "z" }),
    /Unknown derived dataset owner/
  );

  const chartOwned = chart()
    .createCanvas()
    .createData({ id: "raw", values: rows })
    .createECDFPlot({ data: "raw", field: "value" });
  assert.equal(chartOwned.materializationConfigs.data, undefined);
  assert.throws(
    () => chartOwned.editECDFData({
      target: "ecdfPlotECDFData", missing: "error"
    }),
    /chart-owned/
  );
});

const familyCases = Object.freeze([
  {
    family: "computed", edit: "editComputedData",
    create: program => program.createComputedData({
      id: "owner", source: "raw", as: "z", expression: { field: "x" }
    }),
    first: { expression: multiply("x", 2) },
    second: { expression: multiply("x", 3) }
  },
  {
    family: "filter", edit: "editFilteredData",
    create: program => program.filterData({
      id: "owner", source: "raw", field: "group", oneOf: ["A"]
    }),
    first: { oneOf: ["B"] }, second: { oneOf: ["A"] }
  },
  {
    family: "fold", edit: "editFoldData",
    create: program => program.createFoldData({
      id: "owner", source: "raw", fields: ["a", "b"],
      as: { key: "metric", value: "folded" }
    }),
    first: { fields: ["a"] }, second: { fields: ["b"] }
  },
  {
    family: "summary", edit: "editSummaryData",
    create: program => program.createSummaryData({
      id: "owner", source: "raw", groupBy: "group",
      aggregates: [{ op: "mean", field: "value", as: "result" }]
    }),
    first: { aggregates: [{ op: "sum", field: "value", as: "result" }] },
    second: { aggregates: [{ op: "max", field: "value", as: "result" }] }
  },
  {
    family: "bin", edit: "editBinData",
    create: program => program.createBinData({
      id: "owner", source: "raw", field: "value", boundaries: [0, 2, 5]
    }),
    first: { boundaries: [0, 3, 5] },
    second: { boundaries: [0, 1, 5] }
  },
  {
    family: "timeUnit", edit: "editTimeUnitData",
    create: program => program.createTimeUnitData({
      id: "owner", source: "raw", field: "when", unit: "day", as: "bucket"
    }),
    first: { unit: "month" }, second: { unit: "year" }
  },
  {
    family: "window", edit: "editWindowData",
    create: program => program.createWindowData({
      id: "owner", source: "raw", sortBy: [{ field: "order" }],
      operations: [{ op: "rowNumber", as: "rank" }]
    }),
    first: { operations: [{ op: "rank", as: "rank" }] },
    second: { operations: [{ op: "denseRank", as: "rank" }] }
  },
  {
    family: "density", edit: "editDensityData",
    create: program => program.createDensityData({
      id: "owner", source: "raw", field: "value", steps: 8
    }),
    first: { steps: 10 }, second: { steps: 12 }
  },
  {
    family: "stack", edit: "editStackData",
    create: program => program.createStackData({
      id: "owner", source: "raw", category: "category",
      group: "group", value: "value"
    }),
    first: { mode: "fill" }, second: { mode: "center" }
  },
  {
    family: "regression", edit: "editRegressionData",
    create: program => program.createRegressionData({
      id: "owner", source: "raw", x: "x", y: "y"
    }),
    first: { method: "polynomial" }, second: { method: "linear" }
  },
  {
    family: "interval", edit: "editIntervalData",
    create: program => program.createIntervalData({
      id: "owner", source: "raw", field: "value", groupBy: "group"
    }),
    first: { center: "median", extent: "iqr" },
    second: { center: "mean", extent: "stderr" }
  },
  {
    family: "ecdf", edit: "editECDFData",
    create: program => program.createECDFData({
      id: "owner", source: "raw", field: "value"
    }),
    first: { missing: "error" }, second: { missing: "drop" }
  },
  {
    family: "normalize", edit: "editNormalizedData",
    create: program => program.createNormalizedData({
      id: "owner", source: "raw", field: "value", as: "normalized",
      groupBy: "group", method: "share"
    }),
    first: { method: "minmax" }, second: { method: "zscore" }
  },
  {
    family: "complete", edit: "editCompleteData",
    create: program => program.createCompleteData({
      id: "owner", source: "raw", key: "category", groupBy: "group",
      values: ["c1", "c2", "c3"], fill: { value: 0 }
    }),
    first: { values: ["c1", "c2"] },
    second: { values: ["c1", "c2", "c3"] }
  },
  {
    family: "impute", edit: "editImputedData",
    create: program => program.createImputedData({
      id: "owner", source: "raw", fields: "missing",
      method: "constant", value: 0
    }),
    first: { value: 5 }, second: { value: 6 }
  }
]);

test("every focused standalone family supports create, edit, edit, no-op, and logical reuse", () => {
  for (const entry of familyCases) {
    const created = entry.create(source());
    assert.equal(
      created.materializationConfigs.data[entry.family].owner.current,
      "owner",
      `${entry.family} must register its logical owner`
    );

    const firstOptions = deepFreeze({ target: "owner", ...entry.first });
    const first = created[entry.edit](firstOptions);
    const firstId = first.materializationConfigs.data[entry.family].owner.current;
    assert.match(firstId, /Revision1$/, `${entry.family} first revision`);
    assert.equal(dataset(created, "owner").id, "owner");

    const secondOptions = deepFreeze({ target: firstId, ...entry.second });
    const second = first[entry.edit](secondOptions);
    const secondId = second.materializationConfigs.data[entry.family].owner.current;
    assert.match(secondId, /Revision2$/, `${entry.family} second revision`);
    assert.notEqual(secondId, firstId);

    const noOp = second[entry.edit](deepFreeze({
      target: "owner", ...entry.second
    }));
    assert.equal(
      noOp.materializationConfigs.data[entry.family].owner.current,
      secondId,
      `${entry.family} no-op must not allocate a revision`
    );
    assert.deepEqual(noOp.semanticSpec.datasets, second.semanticSpec.datasets);

    const reused = second.createSummaryData({
      id: "probe", source: "owner",
      aggregates: [{ op: "count", as: "count" }]
    });
    assert.equal(
      dataset(reused, "probe").source,
      secondId,
      `${entry.family} logical source must resolve to current`
    );
  }
});

test("supports full definitions, lazy legacy ownership, weight removal, and stale rejection", () => {
  const created = source().createComputedData({
    id: "computed", source: "raw", as: "z", expression: { field: "x" }
  });
  const generic = created.editDerivedData({
    target: "computed",
    definition: {
      type: "computed", as: "z", expression: multiply("x", 2)
    }
  });
  assert.deepEqual(
    dataset(
      generic,
      generic.materializationConfigs.data.computed.computed.current
    ).values.map(row => row.z),
    [2, 4, 6, 8]
  );
  for (const definition of [
    { type: "computed", source: "raw", as: "z", expression: { field: "x" } },
    { type: "computed", resolved: {}, as: "z", expression: { field: "x" } },
    { type: "filter", field: "x", oneOf: [1] }
  ]) {
    assert.throws(
      () => created.editDerivedData({ target: "computed", definition }),
      /cannot include|computed, not filter/
    );
  }

  const weighted = source().createSummaryData({
    id: "weighted", source: "raw",
    aggregates: [{ op: "mean", field: "value", as: "mean" }],
    weight: { field: "weight", kind: "frequency" }
  });
  const unweighted = weighted.editSummaryData({
    target: "weighted", weight: false
  });
  const unweightedId = unweighted.materializationConfigs.data.summary.weighted.current;
  assert.equal(dataset(unweighted, unweightedId).transform[0].weight, undefined);
  assert.throws(
    () => weighted.editSummaryData({ target: "weighted", weight: undefined }),
    /cannot be undefined/
  );
  assert.throws(
    () => weighted.editSummaryData({ target: "weighted" }),
    /at least one transform option/
  );

  const withoutOwner = created._clone({
    materializationConfigs: Object.fromEntries(
      Object.entries(created.materializationConfigs).filter(([key]) => key !== "data")
    )
  });
  const migrated = withoutOwner.editComputedData({
    target: "computed", expression: multiply("x", 2)
  });
  assert.match(
    migrated.materializationConfigs.data.computed.computed.current,
    /Revision1$/
  );

  const first = created.editComputedData({ target: "computed", as: "first" });
  const stale = first.materializationConfigs.data.computed.computed.current;
  const second = first.editComputedData({ target: stale, as: "second" });
  assert.throws(
    () => second.editComputedData({ target: stale, as: "third" }),
    /stale/
  );

  assert.throws(
    () => first.createData({ id: "computed", values: [] }),
    /already exists/
  );
  assert.throws(
    () => first.createComputedData({
      id: "computed", source: "raw", as: "again", expression: { field: "x" }
    }),
    /already exists/
  );
});

test("clears stale mode fields before normalizing the replacement mode", () => {
  const complete = source()
    .createCompleteData({
      id: "complete", source: "raw", key: "value", values: [1, 2, 3, 4]
    })
    .editCompleteData({
      target: "complete", sequence: { start: 1, end: 4, step: 1 }
    });
  const completeTransform = dataset(
    complete,
    complete.materializationConfigs.data.complete.complete.current
  ).transform[0];
  assert.equal(Object.hasOwn(completeTransform, "values"), false);
  assert.deepEqual(completeTransform.sequence, { start: 1, end: 4, step: 1 });

  const filtered = source()
    .filterData({ id: "filtered", source: "raw", field: "group", oneOf: ["A"] })
    .editFilteredData({
      target: "filtered", field: "value", range: { min: 2, max: 4 }
    });
  const filterTransform = dataset(
    filtered,
    filtered.materializationConfigs.data.filter.filtered.current
  ).transform[0];
  assert.equal(Object.hasOwn(filterTransform, "oneOf"), false);
  assert.deepEqual(filterTransform.range, {
    min: 2, minInclusive: true, max: 4, maxInclusive: true
  });

  const imputed = source()
    .createImputedData({
      id: "imputed", source: "raw", fields: "missing",
      method: "constant", value: 0
    })
    .editImputedData({
      target: "imputed", method: "forward", sortBy: [{ field: "order" }]
    });
  const imputeTransform = dataset(
    imputed,
    imputed.materializationConfigs.data.impute.imputed.current
  ).transform[0];
  assert.equal(Object.hasOwn(imputeTransform, "value"), false);
  assert.equal(imputeTransform.method, "forward");

  const normalized = source()
    .createNormalizedData({
      id: "normalized", source: "raw", field: "value", as: "n",
      method: "zscore", variance: "sample"
    })
    .editNormalizedData({
      target: "normalized", method: "change", baseline: { value: 1 }
    });
  const normalizeTransform = dataset(
    normalized,
    normalized.materializationConfigs.data.normalize.normalized.current
  ).transform[0];
  assert.equal(Object.hasOwn(normalizeTransform, "variance"), false);
  assert.equal(Object.hasOwn(normalizeTransform, "zeroDenominator"), false);
  assert.deepEqual(normalizeTransform.baseline, { value: 1 });

  const regression = source()
    .createRegressionData({ id: "regression", source: "raw", x: "x", y: "y" })
    .editRegressionData({ target: "regression", method: "loess" });
  const regressionTransform = dataset(
    regression,
    regression.materializationConfigs.data.regression.regression.current
  ).transform[0];
  assert.deepEqual(
    regressionTransform,
    { type: "regression", method: "loess", x: "x", y: "y", span: 0.75 }
  );

  const interval = source()
    .createIntervalData({ id: "interval", source: "raw", field: "value" })
    .editIntervalData({ target: "interval", center: "median", extent: "iqr" });
  const intervalTransform = dataset(
    interval,
    interval.materializationConfigs.data.interval.interval.current
  ).transform[0];
  assert.equal(Object.hasOwn(intervalTransform, "method"), false);
  assert.equal(Object.hasOwn(intervalTransform, "level"), false);

  const weekly = source()
    .createTimeUnitData({
      id: "bucket", source: "raw", field: "when", unit: "week", as: "bucket"
    })
    .editTimeUnitData({ target: "bucket", unit: "month" });
  const timeTransform = dataset(
    weekly,
    weekly.materializationConfigs.data.timeUnit.bucket.current
  ).transform[0];
  assert.equal(Object.hasOwn(timeTransform, "weekStartsOn"), false);
  assert.equal(Object.hasOwn(timeTransform, "weekRule"), false);
});

test("shares the revision executor with Bin2D and replays an edited definition in facets", () => {
  const binned = source()
    .createBin2DData({
      id: "cells", source: "raw", x: "x", y: "y", bins: 2,
      as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
    })
    .createSummaryData({
      id: "total", source: "cells",
      aggregates: [{ op: "sum", field: "count", as: "count" }]
    });
  assert.throws(
    () => binned.editBin2DData({ target: "cells", bins: 1 }),
    /total.*depends.*recompute/
  );
  const revisedBins = binned.editBin2DData({
    target: "cells", bins: 1, dependents: "recompute"
  });
  const totalId = revisedBins.materializationConfigs.data.summary.total.current;
  assert.deepEqual(dataset(revisedBins, totalId).values, [{ count: 4 }]);

  const unit = chart()
    .createCanvas()
    .createData({ id: "raw", values: rows })
    .createComputedData({
      id: "scaled", source: "raw", as: "scaled", expression: multiply("x", 2)
    })
    .createPointMark({ id: "points", data: "scaled" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "scaled" })
    .editComputedData({ target: "scaled", expression: multiply("x", 3) })
    .editCanvas({ width: 520, height: 360 });
  const faceted = unit.facet({
    field: "group", columns: 1, guides: { legend: false }
  });
  for (const childId of faceted.compositionSpec.children) {
    const child = faceted.children[childId];
    const requested = child.semanticSpec.datasets.find(candidate =>
      candidate.transform?.[0]?.type === "computed"
    );
    const partition = child.semanticSpec.datasets.find(candidate =>
      candidate.id === `${childId}-data`
    );
    assert.ok(requested);
    assert.equal(requested.transform[0].expression.right.constant, 3);
    assert.ok(partition);
    assert.deepEqual(
      partition.values.map(row => row.scaled),
      partition.values.map(row => row.x * 3)
    );
    assert.equal(child.semanticSpec.layers[0].data, partition.id);
  }
});

test("refreshes attached labels and selection highlights from revised rows", () => {
  const before = chart()
    .createCanvas()
    .createData({ id: "raw", values: [
      { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }
    ] })
    .filterData({
      id: "visible", source: "raw", field: "x", range: { min: 1, max: 3 }
    })
    .createPointMark({ id: "points", data: "visible" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" })
    .createMarkLabels({ id: "labels", source: "points", field: "x" })
    .selectMarks({
      id: "largest", target: "points", field: "x", op: "max", count: 1
    })
    .highlightMarks({
      selection: "largest", target: "points", fill: "#ff0000",
      dimOthers: { opacity: 0.2 }
    });
  const after = before.editFilteredData({
    target: "visible", range: { min: 1, max: 2 }
  });
  const pointItems = after.graphicSpec.objects.points.items;
  const labelItems = after.graphicSpec.objects.labels.items;

  assert.equal(pointItems.length, 2);
  assert.equal(labelItems.length, 2);
  assert.deepEqual(labelItems.map(item => item.properties.text), ["1", "2"]);
  assert.equal(pointItems[0].properties.opacity, 0.2);
  assert.equal(pointItems[1].properties.fill, "#ff0000");
  assert.equal(before.graphicSpec.objects.points.items.length, 3);
  assert.equal(before.graphicSpec.objects.labels.items.length, 3);
});

test("replays edited string computations and timezone buckets from requested definitions", () => {
  const classified = chart()
    .createCanvas()
    .createData({ id: "raw", values: [
      { group: "A", x: 1, y: 1, when: "2024-01-01T23:30:00Z" },
      { group: "A", x: 2, y: 2, when: "2024-01-01T23:30:00Z" },
      { group: "B", x: 3, y: 3, when: "2024-01-01T23:30:00Z" },
      { group: "B", x: 4, y: 4, when: "2024-01-01T23:30:00Z" }
    ] })
    .createComputedData({
      id: "classified", source: "raw", as: "class",
      expression: { constant: "positive" }
    })
    .editComputedData({
      target: "classified",
      expression: {
        op: "if",
        condition: {
          op: "gt", left: { field: "x" }, right: { constant: 2 }
        },
        then: { constant: "high" },
        else: { constant: "low" }
      }
    })
    .createTimeUnitData({
      id: "bucketed", source: "classified", field: "when",
      unit: "day", as: "day"
    })
    .editTimeUnitData({ target: "bucketed", timeZone: "Asia/Seoul" })
    .createPointMark({ id: "points", data: "bucketed" })
    .encodeX({ target: "points", field: "class", fieldType: "nominal" })
    .encodeY({ target: "points", field: "y" });
  const classifiedId = classified.materializationConfigs.data.computed.classified.current;
  const bucketedId = classified.materializationConfigs.data.timeUnit.bucketed.current;

  assert.deepEqual(
    dataset(classified, classifiedId).values.map(row => row.class),
    ["low", "low", "high", "high"]
  );
  assert.deepEqual(
    dataset(classified, bucketedId).values.map(row => row.day),
    Array(4).fill(Date.parse("2024-01-01T15:00:00Z"))
  );

  const faceted = classified.facet({
    field: "group", columns: 1, guides: { legend: false }
  });
  for (const childId of faceted.compositionSpec.children) {
    const child = faceted.children[childId];
    const partition = dataset(child, `${childId}-data`);
    assert.ok(partition);
    assert.deepEqual(
      partition.values.map(row => row.class),
      partition.values.map(row => row.x > 2 ? "high" : "low")
    );
    assert.deepEqual(
      partition.values.map(row => row.day),
      partition.values.map(() => Date.parse("2024-01-01T15:00:00Z"))
    );
  }
});

test("replays edited closed duration windows independently in facets", () => {
  const day = 86_400_000;
  const before = chart()
    .createCanvas()
    .createData({ id: "raw", values: [
      { group: "A", t: 0, x: 2 },
      { group: "A", t: 7 * day, x: 4 },
      { group: "B", t: 0, x: 10 },
      { group: "B", t: 7 * day, x: 20 }
    ] })
    .createWindowData({
      id: "moving", source: "raw", temporalUnit: "timestamp",
      partitionBy: "group", sortBy: [{ field: "t" }],
      operations: [{
        op: "movingMean", field: "x", as: "mean",
        frame: { duration: { preceding: 0, unit: "day" } }
      }]
    })
    .createPointMark({ id: "points", data: "moving" })
    .encodeX({ target: "points", field: "t" })
    .encodeY({ target: "points", field: "mean" });
  const after = before.editWindowData({
    target: "moving",
    operations: [{
      op: "movingMean", field: "x", as: "mean",
      frame: { duration: { preceding: 7, unit: "day" } }
    }]
  });
  const current = after.materializationConfigs.data.window.moving.current;

  assert.deepEqual(
    dataset(after, current).values.map(row => row.mean),
    [2, 3, 10, 15]
  );
  assert.deepEqual(dataset(before, "moving").values.map(row => row.mean), [2, 4, 10, 20]);

  const faceted = after.facet({ field: "group", guides: { legend: false } });
  const expected = new Map([["A", [2, 3]], ["B", [10, 15]]]);
  for (const childId of faceted.compositionSpec.children) {
    const child = faceted.children[childId];
    const partition = dataset(child, `${childId}-data`);
    const replayed = child.semanticSpec.datasets.find(candidate =>
      candidate.id.startsWith(childId) && candidate.transform?.[0]?.type === "window"
    );
    assert.ok(partition);
    assert.ok(replayed);
    assert.deepEqual(
      replayed.values.map(row => row.mean),
      expected.get(partition.values[0].group)
    );
  }
});
