import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { chart, render } from "../../src/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { resolveArcItems } from
  "../../src/materialization/selection/items/arc.js";
import { createMockCanvasContext } from "../support/canvas.js";

const rows = Object.freeze(["A", "B"].flatMap((panel, panelIndex) =>
  ["X", "Y"].flatMap(column => ["a", "b", "c"].map((angle, index) =>
    Object.freeze({
      panel,
      column,
      angle,
      alternate: ["c", "a", "b"][index],
      radius: 1 + panelIndex * 9 + index,
      distance: 10 + panelIndex * 90 + index * 10,
      value: 1 + panelIndex * index,
      a: index + panelIndex,
      b: (index + panelIndex) * 1000,
      c: index + 5,
      series: column
    })
  ))
));

function source(values = rows) {
  return chart().createCanvas({ width: 280, height: 260, margin: 45 })
    .createData({ id: "values", values });
}

function families(values = rows) {
  const base = () => source(values);
  return {
    polarPoint: base().createPolarScatterPlot({
      id: "mark", theta: { field: "angle", fieldType: "ordinal" },
      radius: { field: "radius", scale: { zero: true, nice: false } }, guides: false
    }),
    polarLine: base().createPolarLinePlot({
      id: "mark", theta: { field: "angle", fieldType: "ordinal" },
      radius: { field: "radius", scale: { zero: true, nice: false } },
      groupBy: ["panel", "series"], line: { closed: true }, guides: false
    }),
    directArc: base().createArcMark({ id: "mark" })
      .encodeTheta({ field: "angle", fieldType: "nominal" })
      .encodeR({ field: "radius", scale: { zero: true, nice: false } }),
    pie: base().createPiePlot({
      id: "mark", category: "angle", value: "value", aggregate: "sum", guides: false
    }),
    rose: base().createRosePlot({
      id: "mark", category: "angle", value: "value", aggregate: "sum", guides: false
    }),
    radar: base().createRadarPlot({
      id: "mark", category: "angle", value: "radius",
      groupBy: ["panel", "series"], order: ["a", "b", "c"], guides: false
    }),
    parallel: base().createParallelCoordinates({
      id: "mark", dimensions: [
        { field: "a", scale: { zero: false, nice: false } },
        { field: "b", scale: { zero: false, nice: false } }
      ], guides: false
    })
  };
}

test("locks Polar and Parallel shared-domain and local-denominator numeric oracles", () => {
  const radialRows = [
    { panel: "A", angle: "a", radius: 1 },
    { panel: "A", angle: "b", radius: 2 },
    { panel: "B", angle: "b", radius: 10 },
    { panel: "B", angle: "c", radius: 20 }
  ];
  const radial = source(radialRows).createPolarScatterPlot({
    id: "mark", theta: { field: "angle", fieldType: "nominal" },
    radius: { field: "radius", scale: { zero: false, nice: false } }, guides: false
  });
  const shared = radial.facet({ field: "panel" });
  const independent = radial.facet({
    field: "panel", scales: { theta: "independent", r: "independent" }
  });
  assert.deepEqual(Object.values(shared.children).map(child =>
    child.resolvedScales.radius.domain), [[1, 20], [1, 20]]);
  assert.deepEqual(Object.values(shared.children).map(child =>
    child.resolvedScales.theta.domain), [["a", "b", "c"], ["a", "b", "c"]]);
  assert.deepEqual(Object.values(independent.children).map(child =>
    child.resolvedScales.radius.domain), [[1, 2], [10, 20]]);

  const pieRows = [
    { panel: "A", angle: "a", value: 1 }, { panel: "A", angle: "b", value: 1 },
    { panel: "B", angle: "a", value: 1 }, { panel: "B", angle: "b", value: 3 }
  ];
  const pie = source(pieRows).createPiePlot({
    id: "mark", category: "angle", value: "value", aggregate: "sum", guides: false
  }).facet({ field: "panel" });
  const spans = Object.values(pie.children).map(child => {
    const layer = child.semanticSpec.layers[0];
    const data = child.semanticSpec.datasets.find(value => value.id === layer.data);
    return resolveArcItems(child, layer, data).map(item =>
      item.geometry.endTheta - item.geometry.startTheta);
  });
  assert.deepEqual(spans, [[180, 180], [90, 270]]);

  const parallel = families().parallel.facet({ field: "panel" });
  const dimensionScales = families().parallel.semanticSpec.layers[0]
    .encoding.parallel.dimensions.map(dimension => dimension.scale);
  assert.notDeepEqual(
    parallel.children["facet-cell-1"].resolvedScales[dimensionScales[0]].domain,
    parallel.children["facet-cell-1"].resolvedScales[dimensionScales[1]].domain
  );
});

test("renders all seven non-Cartesian facet families through every backend", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-r43-render-"));
  try {
    for (const [name, unit] of Object.entries(families())) {
      const faceted = unit.facet({ field: "panel" });
      const grid = unit.facetGrid({
        rows: { field: "panel" }, columns: { field: "column" }
      });
      for (const [kind, program] of [["facet", faceted], ["grid", grid]]) {
        render(program, createMockCanvasContext());
        assert.match(renderToSVG(program), /<svg/u, `${name} ${kind}`);
        const png = path.join(directory, `${name}-${kind}.png`);
        const pdf = path.join(directory, `${name}-${kind}.pdf`);
        await renderToPNG(program, { output: png });
        await renderToPDF(program, { output: pdf });
        assert.equal((await readFile(png)).subarray(1, 4).toString(), "PNG");
        assert.equal((await readFile(pdf)).subarray(0, 4).toString(), "%PDF");
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("replays non-Cartesian source, scale, headers, theme, selection, and style state", () => {
  const originalUnit = families().polarPoint
    .highlightMarks({
      target: "mark", select: { field: "panel", op: "eq", value: "A" },
      fill: "#ff0066", bringToFront: false
    })
    .editPointMark({ stroke: "#123456", strokeWidth: 2 });
  const faceted = originalUnit.facet({ field: "panel" })
    .editFacetHeaders({ color: "#345678", labelMap: [
      { value: "A", label: "Alpha" }, { value: "B", label: "Beta" }
    ] })
    .applyTheme({ theme: "dark", scope: "descendants" })
    .editFacetScales({ r: "independent" });
  const revisedValues = rows.map(row => Object.freeze({
    ...row, radius: row.radius * 2
  }));
  const revisedUnit = families(revisedValues).polarPoint.editCanvas({
    width: 320, height: 300
  });
  const replayed = faceted.editFacetSource({ program: revisedUnit });

  assert.deepEqual(Object.values(replayed.children).map(child =>
    child.resolvedScales.radius.domain), [[0, 6], [0, 24]]);
  assert.deepEqual(replayed.graphicSpec.objects["facet-headers"].items.map(item =>
    item.properties.text), ["Alpha", "Beta"]);
  for (const child of Object.values(replayed.children)) {
    assert.equal(child.materializationConfigs.theme.frames.length > 0, true);
    assert.equal(child.materializationConfigs.selections.markSelection !== undefined, true);
    assert.equal(child.markConfigs.mark.stroke, "#123456");
    assert.equal(child.markConfigs.mark.strokeWidth, 2);
    assert.equal(child.graphicSpec.objects.canvas.properties.width, 320);
  }
  assert.equal(originalUnit.graphicSpec.objects.canvas.properties.width, 280);
});

test("rejects unsupported non-Cartesian policies without changing caller state", () => {
  const { pie, radar, parallel, polarPoint } = families();
  for (const [program, operation, pattern] of [
    [polarPoint, () => polarPoint.facet({ field: "panel", guides: { axes: "outer" } }),
      /do not support outer axes/],
    [pie, () => pie.repeatCharts({ channel: "theta", fields: ["angle", "alternate"] }),
      /eligible complete mark/],
    [radar, () => radar.repeatCharts({ channel: "r", fields: ["radius", "distance"] }),
      /eligible complete mark/],
    [parallel, () => parallel.repeatCharts({
      channel: { parallelDimension: "a" }, fields: ["b"]
    }), /unique fields/]
  ]) {
    const before = JSON.stringify(program);
    assert.throws(operation, pattern);
    assert.equal(JSON.stringify(program), before);
  }
});

test("preserves canonical empty graphics for every non-Cartesian full-grid family", () => {
  const missingRows = rows.filter(row => !(
    row.panel === "B" && row.column === "Y"
  ));
  for (const [name, unit] of Object.entries(families(missingRows))) {
    const before = unit.graphicSpec;
    const grid = unit.facetGrid({
      id: "matrix",
      rows: { field: "panel" },
      columns: { field: "column" },
      combinations: "full"
    });
    const empty = grid.children["matrix-row-2-column-2"];
    const graphic = empty.graphicSpec.objects.mark;

    assert.equal(grid.compositionSpec.children.length, 4, name);
    assert.equal(grid.compositionSpec.facet.grid.cells.at(-1).empty, true, name);
    assert.equal(empty.semanticSpec.layers.length, unit.semanticSpec.layers.length, name);
    assert.equal(empty.semanticSpec.coordinates[0].type,
      unit.semanticSpec.coordinates[0].type, name);
    assert.deepEqual(graphic.items, [], name);
    assert.equal(grid.graphicSpec.objects["matrix-headers"].items.length, 4, name);
    assert.equal(unit.graphicSpec, before, name);
  }
});

test("replays selected Polar labels, placement, leaders, theme, and revised Canvas per child", () => {
  const values = [
    { panel: "A", angle: 0, radius: 1 },
    { panel: "A", angle: 90, radius: 2 },
    { panel: "B", angle: 0, radius: 10 },
    { panel: "B", angle: 90, radius: 20 }
  ];
  const labeledUnit = (sourceValues = values) => chart()
    .createCanvas({ width: 340, height: 320, margin: 70 })
    .createData({ id: "values", values: sourceValues })
    .createPolarScatterPlot({
      id: "points",
      theta: { field: "angle", scale: { nice: false, zero: false } },
      radius: { field: "radius", scale: { nice: false, zero: false } },
      guides: false
    })
    .createMarkLabels({
      id: "labels",
      source: "points",
      field: "radius",
      select: { field: "radius", op: "max", count: 1 },
      placement: {
        anchor: "outsideEnd",
        gap: 5,
        overflow: "allow",
        leader: { stroke: "#ff0000" }
      }
    });
  const base = labeledUnit();
  const before = base.graphicSpec;
  const faceted = base.facet({ field: "panel" })
    .editFacetScales({ r: "independent" })
    .applyTheme({ theme: "dark", scope: "descendants" });

  assert.deepEqual(Object.values(faceted.children).map(child =>
    child.graphicSpec.objects.labels.items.map(item => item.properties.text)), [
    ["2"], ["20"]
  ]);
  for (const child of Object.values(faceted.children)) {
    assert.equal(child.markConfigs.labels.labelAuthoring.selection.kind, "inline");
    assert.equal(child.markConfigs.labels.labelAuthoring.placement.anchor, "outsideEnd");
    assert.equal(child.graphicSpec.objects["labels-placement-leaders"].items.length, 1);
    assert.equal(child.materializationConfigs.theme.frames.at(-1).name, "dark");
  }

  const revisedValues = values.map(row => ({ ...row, radius: row.radius * 2 }));
  const replayed = faceted.editFacetSource({
    program: labeledUnit(revisedValues).editCanvas({ width: 380, height: 360 })
  });
  assert.deepEqual(Object.values(replayed.children).map(child =>
    child.graphicSpec.objects.labels.items.map(item => item.properties.text)), [
    ["4"], ["40"]
  ]);
  assert.equal(Object.values(replayed.children).every(child =>
    child.graphicSpec.objects.canvas.properties.width === 380 &&
    child.graphicSpec.objects.canvas.properties.height === 360), true);
  assert.equal(base.graphicSpec, before);
});

test("does not resurrect removed Polar labels in facet or repeat replay", () => {
  const values = [
    { panel: "A", angle: 0, radius: 1, distance: 10 },
    { panel: "A", angle: 90, radius: 2, distance: 20 },
    { panel: "B", angle: 0, radius: 10, distance: 100 },
    { panel: "B", angle: 90, radius: 20, distance: 200 }
  ];
  const removed = source(values).createPolarScatterPlot({
    id: "points",
    theta: "angle",
    radius: { field: "radius", scale: { nice: false, zero: false } },
    guides: false
  }).createMarkLabels({
    id: "labels", source: "points", field: "radius"
  }).removeMarkLabels({ source: "points" });
  const faceted = removed.facet({ field: "panel" });
  const repeated = removed.repeatCharts({
    target: "points", channel: "r", fields: ["radius", "distance"]
  });

  for (const child of [
    ...Object.values(faceted.children),
    ...Object.values(repeated.children)
  ]) {
    assert.equal(child.semanticSpec.layers.some(layer => layer.id === "labels"), false);
    assert.equal(child.graphicSpec.objects.labels, undefined);
    assert.equal(child.markConfigs.labels, undefined);
  }
});
