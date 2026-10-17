import assert from "node:assert/strict";
import test from "node:test";

import {
  planFacetGuideOwnership,
  resolveFacetOuterAxes,
  resolveSharedFacetLegends
} from "../../../src/grammar/facets/guides.js";

const placements = [
  { id: "a", row: 0, column: 0, x: 10, y: 20 },
  { id: "b", row: 0, column: 1, x: 220, y: 20 },
  { id: "c", row: 0, column: 2, x: 430, y: 20 },
  { id: "d", row: 1, column: 0, x: 10, y: 190 },
  { id: "e", row: 1, column: 1, x: 220, y: 190 }
];

test("selects actual occupied outer edges for an incomplete final row", () => {
  const result = resolveFacetOuterAxes({ placements });
  assert.deepEqual(result.x, ["c", "d", "e"]);
  assert.deepEqual(result.y, ["a", "d"]);
  assert.deepEqual(result.children.b, { x: false, y: false, bounds: {} });
  assert.equal(Object.isFrozen(result.children), true);
});

test("translates retained concrete axis bounds into parent coordinates", () => {
  const result = resolveFacetOuterAxes({
    placements,
    axisBounds: {
      a: { y: { x: 2, y: 12, width: 30, height: 130 } },
      c: { x: { x: 40, y: 142, width: 150, height: 28 } },
      d: {
        x: { x: 40, y: 142, width: 150, height: 28 },
        y: { x: 2, y: 12, width: 30, height: 130 }
      },
      e: { x: { x: 40, y: 142, width: 150, height: 28 } }
    }
  });
  assert.deepEqual(result.children.c.bounds.x, {
    x: 470,
    y: 162,
    width: 150,
    height: 28
  });
  assert.deepEqual(result.children.d.bounds.y, {
    x: 12,
    y: 202,
    width: 30,
    height: 130
  });
});

function legendChild(id, overrides = {}) {
  const config = {
    target: `${id}-points`,
    kind: "color",
    scales: ["color"],
    field: "Origin",
    title: "Origin",
    symbol: { layers: [{ type: "swatch" }] },
    position: "right"
  };
  return {
    id,
    guideConfigs: {
      legend: { color: { ...config, ...(overrides.config ?? {}) } }
    },
    resolvedScales: {
      color: {
        type: "ordinal",
        domain: ["USA", "Japan"],
        range: ["#1f77b4", "#d62728"],
        ...(overrides.scale ?? {})
      }
    }
  };
}

test("promotes compatible categorical legend recipes from one child", () => {
  const children = placements.map(cell => legendChild(cell.id));
  const shared = resolveSharedFacetLegends(children);
  assert.equal(shared.source, "a");
  assert.equal(shared.entries[0].family, "categorical");
  assert.deepEqual(shared.entries[0].scales, ["color"]);

  const ownership = planFacetGuideOwnership({
    placements,
    children: placements.map(cell => ({
      id: cell.id,
      axes: ["x", "y"],
      legendKinds: ["color"]
    })),
    sharedLegends: shared
  });
  assert.deepEqual(ownership.children.a.keepAxes, ["y"]);
  assert.deepEqual(ownership.children.a.removeAxes, ["x"]);
  assert.deepEqual(ownership.children.c.keepAxes, ["x"]);
  assert.deepEqual(ownership.children.d.keepAxes, ["x", "y"]);
  assert.deepEqual(ownership.children.e.removeLegends, ["color"]);
  assert.equal(ownership.parent.promoteFrom, "a");
});

test("recognizes every approved shared legend family", () => {
  const cases = [
    ["series", "categorical"],
    ["color", "categorical"],
    ["gradient", "gradient"],
    ["interval", "discretized"],
    ["size", "size"],
    ["opacity", "opacity"]
  ];
  for (const [kind, family] of cases) {
    const child = id => ({
      id,
      guideConfigs: {
        legend: {
          [kind]: {
            target: `${id}-mark`,
            kind,
            scale: "scale",
            title: "Value"
          }
        }
      },
      resolvedScales: {
        scale: { type: "linear", domain: [0, 1], range: [2, 12] }
      }
    });
    assert.equal(
      resolveSharedFacetLegends([child("a"), child("b")]).entries[0].family,
      family
    );
  }
});

test("rejects incompatible legend definitions and resolved scales", () => {
  assert.throws(
    () => resolveSharedFacetLegends([
      legendChild("a"),
      legendChild("b", { config: { title: "Region" } })
    ]),
    /incompatible color legend config/
  );
  assert.throws(
    () => resolveSharedFacetLegends([
      legendChild("a"),
      legendChild("b", { scale: { domain: ["USA", "Europe"] } })
    ]),
    /incompatible resolved legend scale/
  );
  assert.throws(
    () => resolveFacetOuterAxes({
      placements: [...placements, { ...placements[0], id: "duplicate-slot" }]
    }),
    /occupied more than once/
  );
});

test("shared color-size legends compare both scale owners without mutating their inputs", () => {
  const child = id => ({ id, guideConfigs: { legend: { colorSize: {
    target: `${id}-points`, colorScale: "color", sizeScale: "size", field: "amount",
    domain: [0, 10], combine: "color-size", sampling: { mode: "count", count: 3 }
  } } }, resolvedScales: {
    color: { type: "sequential", domain: [0, 10], range: ["#fff", "#06f"] },
    size: { type: "linear", domain: [0, 10], range: [100, 900] }
  } });
  const children = [child("a"), child("b")], original = structuredClone(children);
  const result = resolveSharedFacetLegends(children);
  assert.equal(result.entries[0].family, "color-size");
  assert.deepEqual(result.entries[0].scales, ["color", "size"]);
  assert.deepEqual(result.entries[0].resolvedScales, children[0].resolvedScales);
  assert.ok(Object.isFrozen(result.entries[0].resolvedScales.size));
  assert.deepEqual(children, original);
  for (const scale of ["color", "size"]) {
    const missing = child("b"); delete missing.resolvedScales[scale];
    assert.throws(() => resolveSharedFacetLegends([child("a"), missing]), /incompatible resolved legend scale/u);
    const changed = child("b"); changed.resolvedScales[scale].domain = [0, 11];
    assert.throws(() => resolveSharedFacetLegends([child("a"), changed]), /incompatible resolved legend scale/u);
  }
  const noSizeOwner = child("a"); delete noSizeOwner.guideConfigs.legend.colorSize.sizeScale;
  assert.throws(() => resolveSharedFacetLegends([noSizeOwner]), /requires resolved scale ids/u);
  const changedDomain = child("b"); changedDomain.guideConfigs.legend.colorSize.domain = [0, 11];
  assert.throws(() => resolveSharedFacetLegends([child("a"), changedDomain]), /incompatible colorSize legend config/u);
});
