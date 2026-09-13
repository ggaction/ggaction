import assert from "node:assert/strict";
import test from "node:test";

import { chart, hconcat, vconcat } from "../../../src/index.js";

function pointChart(options = {}) {
  const program = chart()
    .createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({ values: [{ x: 1, y: 2 }] })
    .createPointMark(options)
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  return program;
}

function facetSource() {
  return chart()
    .createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({
      id: "data",
      values: [
        { group: "a", x: 1, y: 2 },
        { group: "b", x: 2, y: 3 }
      ]
    })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
}

test("applies a descendant theme without mutating composition inputs", () => {
  const left = pointChart();
  const right = pointChart({ fill: "#0000ff" });
  const leftSnapshot = JSON.stringify(left);
  const rightSnapshot = JSON.stringify(right);
  const pair = hconcat({
    id: "pair",
    programs: [{ id: "left", program: left }, { id: "right", program: right }]
  });
  const themed = pair.applyTheme({
    theme: {
      base: "light",
      tokens: { mark: "#ff0000", background: "#eeeeee" }
    },
    scope: "descendants"
  });

  assert.equal(themed.graphicSpec.objects.canvas.properties.background, "#eeeeee");
  assert.equal(
    themed.children.left.graphicSpec.objects.point.items[0].properties.fill,
    "#ff0000"
  );
  assert.equal(
    themed.children.right.graphicSpec.objects.point.items[0].properties.fill,
    "#0000ff"
  );
  assert.deepEqual(
    themed.materializationConfigs.theme.descendantFrames.map(frame => frame.owner),
    ["composition:pair"]
  );
  assert.equal(JSON.stringify(left), leftSnapshot);
  assert.equal(JSON.stringify(right), rightSnapshot);
});

test("limits composition self themes to the root Canvas", () => {
  const pair = hconcat({ programs: [pointChart(), pointChart()] });
  const children = pair.children;
  const themed = pair.applyTheme({
    theme: { base: "dark", tokens: { background: "#010203" } },
    scope: "self"
  });

  assert.equal(themed.graphicSpec.objects.canvas.properties.background, "#010203");
  assert.strictEqual(themed.children["view-1"], children["view-1"]);
  assert.strictEqual(themed.children["view-2"], children["view-2"]);
  assert.deepEqual(themed.materializationConfigs.theme.descendantFrames, []);
});

test("removes only the parent frame and restores nested child themes", () => {
  const local = pointChart().applyTheme({ theme: "dark" });
  const plain = pointChart();
  const inner = hconcat({
    id: "inner",
    programs: [{ id: "local", program: local }, { id: "plain", program: plain }]
  });
  const outer = vconcat({
    id: "outer",
    programs: [{ id: "inner", program: inner }, { id: "other", program: plain }]
  });
  const themed = outer.applyTheme({
    theme: { base: "light", tokens: { mark: "red" } },
    scope: "descendants"
  });
  const restored = themed.removeTheme();

  assert.equal(
    themed.children.inner.children.local.graphicSpec.objects.point.items[0]
      .properties.fill,
    "red"
  );
  assert.equal(
    restored.children.inner.children.local.graphicSpec.objects.point.items[0]
      .properties.fill,
    "#60a5fa"
  );
  assert.equal(
    restored.children.inner.children.plain.graphicSpec.objects.point.items[0]
      .properties.fill,
    "#4c78a8"
  );
  assert.equal(restored.materializationConfigs.theme, undefined);
});

test("removes the most recent direct composition scope first", () => {
  const pair = hconcat({ programs: [pointChart(), pointChart()] })
    .applyTheme({ theme: "dark", scope: "descendants" })
    .applyTheme({
      theme: { base: "light", tokens: { background: "pink" } },
      scope: "self"
    });
  const descendantsOnly = pair.removeTheme();
  const removed = descendantsOnly.removeTheme();

  assert.equal(
    descendantsOnly.graphicSpec.objects.canvas.properties.background,
    "#0f172a"
  );
  assert.equal(
    descendantsOnly.children["view-1"].graphicSpec.objects.point.items[0]
      .properties.fill,
    "#60a5fa"
  );
  assert.equal(removed.graphicSpec.objects.canvas.properties.background, "white");
  assert.equal(removed.materializationConfigs.theme, undefined);
});

test("replays descendant themes after editing a facet source", () => {
  const faceted = facetSource()
    .facet({ id: "fac", data: "data", field: "group" })
    .applyTheme({
      theme: {
        base: "light",
        tokens: { mark: "#ff0000", background: "#ffeeee" }
      },
      scope: "descendants"
    });
  const revised = facetSource().createData({
    id: "extra",
    values: [{ group: "c", x: 3, y: 4 }]
  });
  const edited = faceted.editFacetSource({ program: revised });

  assert.equal(
    edited.graphicSpec.objects.canvas.properties.background,
    "#ffeeee"
  );
  assert.deepEqual(edited.compositionSpec.facet.values, ["a", "b"]);
  for (const child of Object.values(edited.children)) {
    assert.equal(
      child.graphicSpec.objects.point.items[0].properties.fill,
      "#ff0000"
    );
    assert.deepEqual(
      child.materializationConfigs.theme.frames.map(frame => frame.owner),
      ["composition:fac"]
    );
  }
});

test("replays descendant themes after editing a repeat source", () => {
  const repeated = facetSource()
    .repeatCharts({
      id: "metrics",
      channel: "x",
      fields: ["x", "y"]
    })
    .applyTheme({
      theme: { base: "light", tokens: { mark: "#ff0000" } },
      scope: "descendants"
    });
  const revised = chart()
    .createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({
      id: "data",
      values: [
        { group: "a", x: 10, y: 20 },
        { group: "b", x: 30, y: 40 }
      ]
    })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" });
  const edited = repeated.editFacetSource({ program: revised });

  assert.deepEqual(edited.compositionSpec.facet.repeat.fields, ["x", "y"]);
  for (const child of Object.values(edited.children)) {
    assert.equal(
      child.graphicSpec.objects.point.items[0].properties.fill,
      "#ff0000"
    );
    assert.deepEqual(
      child.materializationConfigs.theme.frames.map(frame => frame.owner),
      ["composition:metrics"]
    );
  }
});

test("propagates one ancestor theme through nested facet and repeat compositions", () => {
  const faceted = facetSource().facet({
    id: "fac",
    data: "data",
    field: "group"
  });
  const repeated = facetSource().repeatCharts({
    id: "metrics",
    channel: "x",
    fields: ["x", "y"]
  });
  const nested = hconcat({
    id: "nested",
    programs: [
      { id: "faceted", program: faceted },
      { id: "repeated", program: repeated }
    ]
  }).applyTheme({
    theme: { base: "dark", tokens: { mark: "#ff0000" } },
    scope: "descendants"
  });

  for (const composition of Object.values(nested.children)) {
    for (const child of Object.values(composition.children)) {
      assert.equal(
        child.graphicSpec.objects.point.items[0].properties.fill,
        "#ff0000"
      );
      assert.deepEqual(
        child.materializationConfigs.theme.frames.map(frame => frame.owner),
        ["composition:nested"]
      );
    }
  }
});

test("themes default facet headers and preserves explicit header styles", () => {
  const defaultHeaders = facetSource()
    .facet({ id: "fac", data: "data", field: "group" })
    .applyTheme({
      theme: {
        base: "dark",
        tokens: { strongText: "#abcdef", fontFamily: "Theme Mono" }
      }
    });
  const explicitHeaders = facetSource()
    .facet({ id: "explicit", data: "data", field: "group" })
    .editFacetHeaders({ color: "#0f172a", fontFamily: "Explicit Serif" })
    .applyTheme({
      theme: {
        base: "dark",
        tokens: { strongText: "#abcdef", fontFamily: "Theme Mono" }
      }
    });

  assert.equal(
    defaultHeaders.graphicSpec.objects["fac-headers"].items[0].properties.fill,
    "#abcdef"
  );
  assert.equal(
    defaultHeaders.graphicSpec.objects["fac-headers"].items[0].properties.fontFamily,
    "Theme Mono"
  );
  assert.equal(
    explicitHeaders.graphicSpec.objects["explicit-headers"].items[0].properties.fill,
    "#0f172a"
  );
  assert.equal(
    explicitHeaders.graphicSpec.objects["explicit-headers"].items[0].properties.fontFamily,
    "Explicit Serif"
  );
});

test("keeps facet-owned headers unchanged for a self theme", () => {
  const faceted = facetSource()
    .facet({ id: "fac", data: "data", field: "group" });
  const headers = faceted.graphicSpec.objects["fac-headers"];
  const config = faceted.materializationConfigs.facets.fac.headers;
  const themed = faceted.applyTheme({
    theme: {
      base: "dark",
      tokens: { strongText: "#abcdef", fontFamily: "Theme Mono" }
    },
    scope: "self"
  });

  assert.strictEqual(themed.graphicSpec.objects["fac-headers"], headers);
  assert.strictEqual(themed.materializationConfigs.facets.fac.headers, config);
  assert.equal(themed.graphicSpec.objects.canvas.properties.background, "#0f172a");
});

test("applies stored descendant policy to inserted and replaced concat children", () => {
  const source = pointChart();
  const parent = hconcat({
    id: "pair",
    programs: [
      { id: "left", program: source },
      { id: "right", program: source }
    ]
  }).applyTheme({
    theme: { base: "light", tokens: { mark: "#ff0000" } },
    scope: "descendants"
  });
  const insertedInput = pointChart();
  const replacementInput = pointChart({ fill: "#0000ff" });
  const inserted = parent.insertCompositionChild({
    id: "third",
    program: insertedInput
  });
  const replaced = inserted.replaceCompositionChild({
    target: "right",
    program: replacementInput
  });

  assert.equal(
    replaced.children.third.graphicSpec.objects.point.items[0].properties.fill,
    "#ff0000"
  );
  assert.equal(
    replaced.children.right.graphicSpec.objects.point.items[0].properties.fill,
    "#0000ff"
  );
  assert.deepEqual(
    replaced.children.third.materializationConfigs.theme.frames.map(
      frame => frame.owner
    ),
    ["composition:pair"]
  );
  assert.equal(insertedInput.materializationConfigs.theme, undefined);
  assert.equal(replacementInput.materializationConfigs.theme, undefined);
});
