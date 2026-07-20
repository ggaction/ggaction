import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";

const rows = Object.freeze([
  Object.freeze({ facet: "A", x: 0, y: 0 }),
  Object.freeze({ facet: "A", x: 1, y: 1 }),
  Object.freeze({ facet: "B", x: 2, y: 2 }),
  Object.freeze({ facet: "B", x: 3, y: 3 })
]);

function sourceProgram() {
  return chart()
    .createCanvas({ width: 320, height: 240, margin: 30 })
    .createData({ id: "source", values: rows });
}

function binOptions(overrides = {}) {
  return {
    id: "cells",
    x: "x",
    y: "y",
    bins: { x: 2, y: 2 },
    extent: { x: [0, 3], y: [0, 3] },
    includeEmpty: true,
    members: true,
    as: {
      x0: "x0", x1: "x1", y0: "y0", y1: "y1",
      count: "count", members: "members"
    },
    ...overrides
  };
}

test("creates immutable 2D-bin provenance and concrete values", () => {
  const source = sourceProgram();
  const program = source.createBin2DData(binOptions());
  const dataset = program.semanticSpec.datasets[1];

  assert.equal(dataset.id, "cells");
  assert.equal(dataset.source, "source");
  assert.deepEqual(dataset.transform[0].resolved, {
    extent: { x: [0, 3], y: [0, 3] },
    edges: { x: [0, 1.5, 3], y: [0, 1.5, 3] },
    eligibleCount: 4,
    occupiedCount: 2
  });
  assert.equal(dataset.values.length, 4);
  assert.equal(dataset.values.reduce((sum, row) => sum + row.count, 0), 4);
  assert.equal(source.semanticSpec.datasets.length, 1);
  assert.deepEqual(
    program.trace.children.at(-1).children.map(node => node.op),
    ["createDerivedData", "materializeBin2DData"]
  );
  assert.equal(program.materializationConfigs.data.bin2d.cells.current, "cells");
});

test("uses an explicit source or the current dataset", () => {
  const inferred = sourceProgram().createBin2DData(binOptions());
  const explicit = sourceProgram().createBin2DData(binOptions({
    id: "explicitCells",
    source: "source"
  }));

  assert.equal(inferred.semanticSpec.datasets[1].source, "source");
  assert.equal(explicit.semanticSpec.datasets[1].source, "source");
});

test("replaces one logical owner with immutable revisions and rematerializes layers", () => {
  const first = sourceProgram()
    .createBin2DData(binOptions())
    .createPointMark({ id: "cellsMark", data: "cells" })
    .encodeX({ target: "cellsMark", field: "x0" })
    .encodeY({ target: "cellsMark", field: "y0" });
  const withoutMembers = {
    includeEmpty: false,
    members: false,
    as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
  };
  const second = first.createBin2DData(binOptions({
    bins: 1,
    ...withoutMembers
  }));
  const third = second.createBin2DData(binOptions({
    bins: { x: 2, y: 1 },
    ...withoutMembers
  }));

  assert.equal(first.graphicSpec.objects.cellsMark.items.length, 4);
  assert.equal(second.graphicSpec.objects.cellsMark.items.length, 1);
  assert.equal(third.graphicSpec.objects.cellsMark.items.length, 2);
  assert.equal(first.semanticSpec.layers[0].data, "cells");
  assert.equal(second.semanticSpec.layers[0].data, "cellsBin2DDataRevision1");
  assert.equal(third.semanticSpec.layers[0].data, "cellsBin2DDataRevision2");
  assert.equal(second.semanticSpec.datasets.some(({ id }) => id === "cells"), false);
  assert.equal(
    third.materializationConfigs.data.bin2d.cells.current,
    "cellsBin2DDataRevision2"
  );
  assert.equal(
    second.trace.children.at(-1).children.some(node => node.op === "rebindLayerData"),
    true
  );
  assert.equal(
    second.trace.children.at(-1).children.some(node => node.op === "releaseDerivedData"),
    true
  );
});

test("accepts a filtered source and rejects unsupported dependent replacement", () => {
  const filtered = sourceProgram().filterData({
    id: "groupA",
    field: "facet",
    oneOf: ["A"]
  });
  const binned = filtered.createBin2DData(binOptions({
    source: "groupA",
    extent: { x: [0, 1], y: [0, 1] }
  }));
  const dependent = binned.filterData({
    id: "occupiedCells",
    source: "cells",
    field: "count",
    predicate: { op: "gt", value: 0 }
  });

  assert.equal(binned.semanticSpec.datasets[2].values.length, 4);
  assert.throws(
    () => dependent.createBin2DData(binOptions({
      source: "groupA",
      extent: { x: [0, 1], y: [0, 1] }
    })),
    /while derived dataset "occupiedCells" depends on it/
  );
  assert.equal(dependent.semanticSpec.datasets.at(-1).id, "occupiedCells");
});

test("replays automatic extents independently inside facet children", () => {
  const base = sourceProgram()
    .createBin2DData(binOptions({
      bins: 1,
      extent: undefined,
      includeEmpty: false,
      members: false,
      as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
    }))
    .createPointMark({ id: "cellsMark", data: "cells" })
    .encodeX({ target: "cellsMark", field: "x0" })
    .encodeY({ target: "cellsMark", field: "y0" });
  const faceted = base.facet({ field: "facet", guides: { legend: false } });
  const extents = faceted.compositionSpec.children.map(id => {
    const child = faceted.children[id];
    const replayed = child.semanticSpec.datasets.find(dataset =>
      dataset.transform?.[0]?.type === "bin2d" && dataset.id !== "cells"
    );
    assert.equal(child.semanticSpec.layers[0].data, replayed.id);
    return replayed.transform[0].resolved.extent;
  });

  assert.deepEqual(extents, [
    { x: [0, 1], y: [0, 1] },
    { x: [2, 3], y: [2, 3] }
  ]);
});

test("rejects invalid calls before creating state", () => {
  const source = sourceProgram();
  assert.throws(
    () => source.createBin2DData(binOptions({ id: "invalid", bins: 0 })),
    /positive integer/
  );
  assert.throws(
    () => source.createBin2DData(binOptions({
      id: "outside",
      extent: { x: [0, 2], y: [0, 3] }
    })),
    /x extent must contain every eligible value/
  );
  assert.throws(
    () => chart().createBin2DData(binOptions()),
    /Source dataset id/
  );
  assert.equal(source.semanticSpec.datasets.length, 1);
});
