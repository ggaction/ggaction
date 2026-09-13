import assert from "node:assert/strict";
import test from "node:test";

import { ChartProgram } from "../../../src/core/ChartProgram.js";
import { chart } from "../../../src/index.js";
import {
  canonicalResourcePath,
  collectResourceReferences
} from "../../../src/core/resourceReferences.js";

function referenceProgram() {
  return new ChartProgram({
    semanticSpec: {
      datasets: [
        { id: "rows", values: [{ x: 1 }] },
        { id: "derived", source: "rows", transform: [{ type: "filter" }] }
      ],
      scales: [{ id: "position", type: "linear" }],
      coordinates: [{ id: "plot", type: "cartesian" }],
      layers: [{
        id: "points",
        mark: "point",
        data: "rows",
        coordinate: "plot",
        encoding: {
          x: { field: "x", scale: "position" },
          parallel: { dimensions: [{ field: "x", scale: "position" }] }
        }
      }],
      guides: {
        axis: [{ id: "xAxis", scale: "position", coordinate: "plot" }]
      }
    },
    materializationConfigs: {
      marks: {
        points: {
          regression: {
            source: "rows",
            dataId: "derived",
            coordinate: "plot",
            xScale: "position",
            lineId: "regressionLine"
          },
          labelAuthoring: {
            selection: { kind: "named", id: "selected" },
            text: "rows",
            color: "position"
          }
        }
      },
      guides: {
        axis: {
          x: { scale: "position", coordinate: "plot", target: "points" }
        }
      },
      selections: { selected: { target: "points" } },
      highlights: { glow: { target: "points", selection: "selected" } },
      data: { computed: { logical: { current: "derived", source: "rows" } } }
    },
    context: {
      currentData: "rows",
      currentScale: "position",
      currentCoordinate: "plot",
      currentMark: "points",
      currentSelection: "selected"
    },
    trace: {
      id: "trace",
      op: "root",
      description: "rows position plot points selected",
      args: { data: "rows", scale: "position" },
      children: []
    }
  });
}

test("collects typed references from every persistent owner with canonical paths", () => {
  const program = referenceProgram();
  const data = collectResourceReferences(program, { kind: "data", id: "rows" });
  const scale = collectResourceReferences(program, {
    kind: "scale",
    id: "position"
  });
  const coordinate = collectResourceReferences(program, {
    kind: "coordinate",
    id: "plot"
  });

  assert.deepEqual(data.map(value => [
    value.ownerKind,
    value.ownerId,
    canonicalResourcePath(value.path),
    value.strength
  ]), [
    ["context", "program", ".currentData", "context"],
    ["dataOwner", "logical", ".data.computed.logical.source", "live"],
    ["dataset", "derived", ".source", "live"],
    ["layer", "points", ".data", "live"],
    ["markConfig", "points", ".regression.source", "live"]
  ]);
  assert.deepEqual(scale.map(value => [
    value.ownerKind,
    value.ownerId,
    canonicalResourcePath(value.path)
  ]), [
    ["axis", "x", ".scale"],
    ["context", "program", ".currentScale"],
    ["layer", "points", ".encoding.parallel.dimensions[0].scale"],
    ["layer", "points", ".encoding.x.scale"],
    ["markConfig", "points", ".regression.xScale"],
    ["semanticGuide", "guides", ".axis[0].scale"]
  ]);
  assert.deepEqual(coordinate.map(value => [
    value.ownerKind,
    value.ownerId,
    canonicalResourcePath(value.path)
  ]), [
    ["axis", "x", ".coordinate"],
    ["context", "program", ".currentCoordinate"],
    ["layer", "points", ".coordinate"],
    ["markConfig", "points", ".regression.coordinate"],
    ["semanticGuide", "guides", ".axis[0].coordinate"]
  ]);
  assert.equal(Object.isFrozen(data), true);
  assert.equal(Object.isFrozen(data[0]), true);
  assert.equal(Object.isFrozen(data[0].path), true);
});

test("does not infer references from trace text or unrelated string values", () => {
  const program = referenceProgram();

  assert.deepEqual(
    collectResourceReferences(program, { kind: "data", id: "position" }),
    []
  );
  assert.deepEqual(
    collectResourceReferences(program, { kind: "scale", id: "rows" }),
    []
  );
});

test("collects stored data and mark ownership without treating recipes as IDs", () => {
  const program = new ChartProgram({
    semanticSpec: {
      datasets: [{ id: "rows", values: [{ x: 1 }] }],
      scales: [],
      coordinates: [],
      layers: [
        { id: "owner", mark: "point", data: "rows", encoding: {} },
        { id: "boundary", mark: "line", source: "owner", data: "rows", encoding: {} },
        { id: "span", mark: "rule", data: "rows", encoding: {} },
        { id: "rain", mark: "point", data: "rows", encoding: {} },
        { id: "cloud", mark: "area", data: "rows", encoding: {} },
        { id: "summary", mark: "rule", data: "rows", encoding: {} }
      ]
    },
    materializationConfigs: {
      marks: {
        owner: { markFilter: { source: "rows", selectors: [{ field: "owner" }] } },
        boundary: { errorBandBoundary: { owner: "owner" } },
        span: { boxSpanOwner: "owner" },
        rain: {
          raincloudPlot: {
            ownerId: "rain",
            childIds: { cloud: "cloud", summary: "summary" },
            ownedChildIds: ["cloud", "summary"]
          }
        }
      }
    }
  });

  assert.deepEqual(
    collectResourceReferences(program, { kind: "data", id: "rows" })
      .filter(value => value.ownerKind === "markConfig")
      .map(value => [value.ownerId, canonicalResourcePath(value.path)]),
    [["owner", ".markFilter.source"]]
  );
  assert.deepEqual(
    collectResourceReferences(program, { kind: "mark", id: "owner" })
      .map(value => [value.ownerKind, value.ownerId, canonicalResourcePath(value.path)]),
    [
      ["layer", "boundary", ".source"],
      ["markConfig", "boundary", ".errorBandBoundary.owner"],
      ["markConfig", "span", ".boxSpanOwner"]
    ]
  );
  assert.deepEqual(
    collectResourceReferences(program, { kind: "mark", id: "cloud" })
      .map(value => canonicalResourcePath(value.path)),
    [
      ".raincloudPlot.childIds.cloud",
      ".raincloudPlot.ownedChildIds[0]"
    ]
  );
  assert.deepEqual(
    collectResourceReferences(program, { kind: "mark", id: "rain" })
      .map(value => canonicalResourcePath(value.path)),
    [".raincloudPlot.ownerId"]
  );
});

test("keeps composition child resource namespaces independent", () => {
  const parent = chart()
    .createCanvas({ width: 240, height: 160, margin: 20 })
    .createData({ id: "rows", values: [
      { group: "A", x: 1 },
      { group: "B", x: 2 }
    ] })
    .createPointMark({ id: "points" })
    .encodeX({ field: "x" })
    .encodeY({ field: "x" })
    .facet({ field: "group" });

  assert.deepEqual(
    collectResourceReferences(parent, { kind: "data", id: "rows" }).map(
      value => [value.ownerKind, value.ownerId, canonicalResourcePath(value.path)]
    ),
    [
      ["composition", "facet", ".facet.data"],
      ["context", "program", ".currentData"],
      ["layer", "points", ".data"]
    ]
  );
});

test("canonicalResourcePath validates every path segment", () => {
  assert.equal(canonicalResourcePath(["encoding", "parallel", 2, "scale"]),
    ".encoding.parallel[2].scale");
  assert.throws(() => canonicalResourcePath("data"), /must be an array/);
  assert.throws(() => canonicalResourcePath([""]), /names or indexes/);
  assert.throws(() => canonicalResourcePath([-1]), /names or indexes/);
});
