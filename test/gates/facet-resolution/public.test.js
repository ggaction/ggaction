import assert from "node:assert/strict";
import test from "node:test";

import { loadGapminder } from "../../support/data.js";
import { namespaceGraphicId } from
  "../../../src/materialization/compositionSnapshot.js";

import {
  createGapminderOuterGuideFacet,
  createGapminderRegressionFacet
} from "./public.program.js";
import { createGapminderRegressionFacetValues } from
  "./reference-values.js";

function regressionValues(child) {
  const line = child.semanticSpec.layers.find(
    layer => layer.id === "pointRegressionLines"
  );
  return child.semanticSpec.datasets.find(dataset => dataset.id === line.data).values;
}

function numericRegressionRows(rows) {
  return rows.map(row => ({
    fertility: row.fertility,
    life_expect: row.life_expect,
    lower: row.__regression_ci_lower,
    upper: row.__regression_ci_upper
  }));
}

test("replays regression data independently in every shared-scale facet cell", () => {
  const rows = loadGapminder();
  const expected = createGapminderRegressionFacetValues(rows);
  const program = createGapminderRegressionFacet(rows);

  assert.deepEqual(program.compositionSpec.facet.scales, {
    x: "shared",
    y: "shared",
    xOffset: "shared",
    yOffset: "shared",
    color: "shared",
    size: "shared",
    shape: "shared",
    opacity: "shared",
    strokeDash: "shared"
  });
  expected.cells.forEach((cell, index) => {
    const child = program.children[`facet-cell-${index + 1}`];
    assert.equal(
      child.semanticSpec.layers.find(layer => layer.id === "point").data,
      `facet-cell-${index + 1}-data`
    );
    assert.deepEqual(child.resolvedScales.x.domain, expected.shared.x);
    assert.deepEqual(child.resolvedScales.y.domain, expected.shared.y);
    assert.deepEqual(child.resolvedScales.color.domain, expected.shared.color);
    assert.deepEqual(
      numericRegressionRows(regressionValues(child)),
      numericRegressionRows(cell.regressionRows)
    );
  });

  const operations = program.children["facet-cell-1"].trace.children.at(-1)
    .children.map(node => node.op);
  assert.equal(operations.filter(op => op === "replayDerivedData").length, 1);
  assert.equal(operations.filter(op => op === "rebindLayerData").length, 3);
  assert.deepEqual(
    operations.filter(op => op.startsWith("rematerialize") && op.endsWith("Mark")),
    ["rematerializePointMark", "rematerializeAreaMark", "rematerializeLineMark"]
  );
});

test("keeps independent x domains while sharing y and color", () => {
  const rows = loadGapminder();
  const expected = createGapminderRegressionFacetValues(rows, {
    xResolution: "independent"
  });
  const program = createGapminderRegressionFacet(rows, {
    xResolution: "independent"
  });

  assert.equal(program.compositionSpec.facet.scales.x, "independent");
  expected.cells.forEach((cell, index) => {
    const child = program.children[`facet-cell-${index + 1}`];
    assert.deepEqual(child.resolvedScales.x.domain, cell.localDomains.x);
    assert.deepEqual(child.resolvedScales.y.domain, expected.shared.y);
    assert.deepEqual(child.resolvedScales.color.domain, expected.shared.color);
  });
  assert.notDeepEqual(
    program.children["facet-cell-1"].resolvedScales.x.domain,
    program.children["facet-cell-2"].resolvedScales.x.domain
  );
});

test("keeps axes on occupied outer cells and promotes one shared gradient", () => {
  const program = createGapminderOuterGuideFacet(loadGapminder());
  const childIds = program.compositionSpec.children;
  const hasAxis = (id, channel) =>
    program.graphicSpec.objects[namespaceGraphicId(
      `facet-${id}`,
      `${channel}AxisTitle`
    )] !== undefined;

  assert.deepEqual(
    childIds.map(id => ({ x: hasAxis(id, "x"), y: hasAxis(id, "y") })),
    [
      { x: false, y: true },
      { x: false, y: false },
      { x: true, y: false },
      { x: true, y: true },
      { x: true, y: false }
    ]
  );
  assert.equal(program.compositionSpec.facet.guides.axes, "outer");
  assert.equal(program.compositionSpec.facet.guides.legend, "shared");
  assert.equal(
    program.graphicSpec.objects["facet-shared-legend"].type,
    "canvas"
  );
  assert.equal(
    program.graphicSpec.objects["facet-shared-legend"].children.includes(
      "colorGradientStrips"
    ),
    true
  );
  assert.equal(
    Object.keys(program.graphicSpec.objects).filter(id =>
      id.includes("colorGradientStrips")
    ).length,
    1
  );
  assert.equal(program.graphicSpec.objects.canvas.properties.width, 1044);
  assert.equal(program.graphicSpec.objects.canvas.properties.height, 588);
});

test("recomposes outer guides without changing retained facet children", () => {
  const program = createGapminderOuterGuideFacet(loadGapminder());
  const children = program.children;
  const edited = program.editCompositionLayout({
    gap: 12,
    padding: { top: 20, right: 18, bottom: 10, left: 18 }
  });

  assert.equal(edited.children, children);
  assert.equal(edited.compositionSpec.gap, 12);
  assert.equal(
    edited.graphicSpec.objects.canvas.children.filter(
      id => id === "facet-shared-legend"
    ).length,
    1
  );
  assert.equal(
    edited.graphicSpec.objects["facet-shared-legend"].children.includes(
      "colorGradientStrips"
    ),
    true
  );
  assert.notEqual(
    edited.graphicSpec.objects.canvas.properties.width,
    program.graphicSpec.objects.canvas.properties.width
  );
  assert.equal(program.compositionSpec.gap, 20);
});
