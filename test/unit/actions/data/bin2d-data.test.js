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

test("partially edits the unique logical owner and preserves omitted provenance", () => {
  const before = sourceProgram().createBin2DData(binOptions());
  const options = Object.freeze({ bins: 1 });
  const after = before.editBin2DData(options);
  const currentId = after.materializationConfigs.data.bin2d.cells.current;
  const current = after.semanticSpec.datasets.find(({ id }) => id === currentId);
  const transform = current.transform[0];

  assert.equal(currentId, "cellsBin2DDataRevision1");
  assert.equal(current.source, "source");
  assert.deepEqual(transform.bins, { x: 1, y: 1 });
  assert.equal(transform.x, "x");
  assert.equal(transform.y, "y");
  assert.deepEqual(transform.extent, { x: [0, 3], y: [0, 3] });
  assert.equal(transform.includeEmpty, true);
  assert.equal(transform.members, true);
  assert.deepEqual(transform.as, binOptions().as);
  assert.equal(before.semanticSpec.datasets.at(-1).id, "cells");
  assert.deepEqual(options, { bins: 1 });
  assert.deepEqual(
    after.semanticSpec,
    before.createBin2DData(binOptions({ bins: 1 })).semanticSpec
  );
});

test("resolves the current owner before unique inference and rejects ambiguity", () => {
  const twoOwners = sourceProgram()
    .createBin2DData(binOptions({ id: "first", source: "source" }))
    .createBin2DData(binOptions({ id: "second", source: "source" }));
  const current = twoOwners.editBin2DData({ includeEmpty: false });

  assert.equal(
    current.materializationConfigs.data.bin2d.first.current,
    "first"
  );
  assert.equal(
    current.materializationConfigs.data.bin2d.second.current,
    "secondBin2DDataRevision1"
  );

  const noCurrentOwner = twoOwners.createData({
    id: "otherSource",
    values: rows
  });
  assert.throws(
    () => noCurrentOwner.editBin2DData({ bins: 1 }),
    /owner is ambiguous; provide target/
  );
  assert.throws(
    () => twoOwners.editBin2DData({ target: "missing", bins: 1 }),
    /Unknown 2D bin owner "missing"/
  );
  assert.throws(
    () => sourceProgram().editBin2DData({ bins: 1 }),
    /No 2D bin owner is available/
  );
});

test("edits source, fields, grid, extent, policies and complete output names", () => {
  const before = sourceProgram()
    .createData({
      id: "replacement",
      values: rows.map(row => ({ u: row.x + 10, v: row.y + 20 }))
    })
    .createBin2DData(binOptions({ source: "source" }));
  const after = before.editBin2DData({
    target: "cells",
    source: "replacement",
    x: "u",
    y: "v",
    bins: { x: 1, y: 2 },
    extent: { x: [10, 13], y: [20, 23] },
    includeEmpty: false,
    members: false,
    as: {
      x0: "u0", x1: "u1", y0: "v0", y1: "v1", count: "n"
    }
  });
  const currentId = after.materializationConfigs.data.bin2d.cells.current;
  const current = after.semanticSpec.datasets.find(({ id }) => id === currentId);

  assert.equal(current.source, "replacement");
  assert.deepEqual(current.transform[0], {
    type: "bin2d",
    x: "u",
    y: "v",
    bins: { x: 1, y: 2 },
    extent: { x: [10, 13], y: [20, 23] },
    includeEmpty: false,
    members: false,
    as: { x0: "u0", x1: "u1", y0: "v0", y1: "v1", count: "n" },
    resolved: {
      extent: { x: [10, 13], y: [20, 23] },
      edges: { x: [10, 13], y: [20, 21.5, 23] },
      eligibleCount: 4,
      occupiedCount: 2
    }
  });
});

test("normalizes the members output when members is toggled without as", () => {
  const withoutMembers = sourceProgram().createBin2DData(binOptions({
    members: false,
    as: { x0: "x0", x1: "x1", y0: "y0", y1: "y1", count: "count" }
  }));
  const enabled = withoutMembers.editBin2DData({ members: true });
  const enabledId = enabled.materializationConfigs.data.bin2d.cells.current;
  const enabledDataset = enabled.semanticSpec.datasets.find(
    ({ id }) => id === enabledId
  );
  const enabledTransform = enabledDataset.transform[0];
  const disabled = enabled.editBin2DData({ members: false });
  const disabledId = disabled.materializationConfigs.data.bin2d.cells.current;
  const disabledTransform = disabled.semanticSpec.datasets.find(
    ({ id }) => id === disabledId
  ).transform[0];

  assert.equal(enabledTransform.as.members, "__cells_members");
  assert.equal(
    enabledDataset.values.every(row => Array.isArray(row.__cells_members)),
    true
  );
  assert.equal(Object.hasOwn(disabledTransform.as, "members"), false);
});

test("preserves a prior revision when the new revision uses it as source", () => {
  const before = sourceProgram().createBin2DData(binOptions());
  const after = before.editBin2DData({
    source: "cells",
    x: "x0",
    y: "y0",
    bins: 1,
    extent: { x: [0, 1.5], y: [0, 1.5] }
  });
  const current = after.materializationConfigs.data.bin2d.cells.current;
  const revision = after.semanticSpec.datasets.find(({ id }) => id === current);

  assert.equal(current, "cellsBin2DDataRevision1");
  assert.equal(revision.source, "cells");
  assert.equal(after.semanticSpec.datasets.some(({ id }) => id === "cells"), true);
  assert.equal(after.semanticSpec.datasets.length, 3);
});

test("rebinds and rematerializes every direct consumer exactly once", () => {
  const before = sourceProgram()
    .createBin2DData(binOptions())
    .createPointMark({ id: "lower", data: "cells" })
    .encodeX({ target: "lower", field: "x0" })
    .encodeY({ target: "lower", field: "y0" })
    .createPointMark({ id: "upper", data: "cells" })
    .encodeX({ target: "upper", field: "x1" })
    .encodeY({ target: "upper", field: "y1" });
  const after = before.editBin2DData({ target: "cells", bins: 1 });
  const action = after.trace.children.at(-1);
  const current = after.materializationConfigs.data.bin2d.cells.current;

  assert.equal(action.op, "editBin2DData");
  assert.equal(
    action.children.filter(({ op }) => op === "createDerivedData").length,
    1
  );
  assert.deepEqual(
    action.children.filter(({ op }) => op === "rebindLayerData")
      .map(node => node.args.id),
    ["lower", "upper"]
  );
  assert.equal(
    action.children.filter(({ op }) => op === "releaseDerivedData").length,
    1
  );
  assert.equal(after.semanticSpec.layers.every(layer => layer.data === current), true);
  assert.equal(after.graphicSpec.objects.lower.items.length, 1);
  assert.equal(after.graphicSpec.objects.upper.items.length, 1);
  assert.equal(after.semanticSpec.datasets.some(({ id }) => id === "cells"), false);
  assert.equal(before.semanticSpec.layers.every(layer => layer.data === "cells"), true);
  assert.equal(before.graphicSpec.objects.lower.items.length, 4);
});

test("rejects empty, no-op, incomplete-output and invalid edits atomically", () => {
  const before = sourceProgram()
    .createBin2DData(binOptions())
    .createPointMark({ id: "cellsMark", data: "cells" })
    .encodeX({ target: "cellsMark", field: "x0" })
    .encodeY({ target: "cellsMark", field: "y0" });
  const datasets = before.semanticSpec.datasets;
  const graphics = before.graphicSpec;
  const config = before.materializationConfigs.data.bin2d;

  assert.throws(
    () => before.editBin2DData({ target: "cells" }),
    /requires at least one transform or source option/
  );
  assert.throws(
    () => before.editBin2DData({ target: "cells", bins: { x: 2, y: 2 } }),
    /requires an actual transform or source change/
  );
  assert.throws(
    () => before.editBin2DData({ target: "cells", as: { count: "n" } }),
    /requires the complete "x0" output field/
  );
  assert.throws(
    () => before.editBin2DData({ target: "cells", x: "missing" }),
    /requires at least one row with finite x and y values/
  );
  assert.throws(
    () => before.editBin2DData({
      target: "cells",
      members: false,
      as: { x0: "u0", x1: "u1", y0: "v0", y1: "v1", count: "n", members: "m" }
    }),
    /requires members: true/
  );
  assert.throws(
    () => before.editBin2DData({ target: "cells", extra: true }),
    /Unknown editBin2DData option "extra"/
  );
  assert.throws(
    () => before.editBin2DData({
      target: "cells",
      as: { x0: "u0", x1: "u1", y0: "v0", y1: "v1", count: "n", members: "m" },
      members: true
    }),
    /[Ff]ield "x0"/
  );

  assert.equal(before.semanticSpec.datasets, datasets);
  assert.equal(before.graphicSpec, graphics);
  assert.equal(before.materializationConfigs.data.bin2d, config);
});

test("rejects a derived consumer before editing its logical owner", () => {
  const dependent = sourceProgram()
    .createBin2DData(binOptions())
    .filterData({
      id: "occupiedCells",
      source: "cells",
      field: "count",
      predicate: { op: "gt", value: 0 }
    });

  assert.throws(
    () => dependent.editBin2DData({ target: "cells", bins: 1 }),
    /while derived dataset "occupiedCells" depends on it/
  );
  assert.equal(dependent.materializationConfigs.data.bin2d.cells.current, "cells");
  assert.equal(dependent.semanticSpec.datasets.at(-1).id, "occupiedCells");
});
