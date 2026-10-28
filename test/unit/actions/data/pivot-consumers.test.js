import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat, render } from "../../../../src/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../../src/scene.js";
import { resolveMarkItems } from "../../../../src/materialization/selection/policies/index.js";
import { createMockCanvasContext } from "../../../support/canvas.js";

const values = [{ panel: "P", group: "A", key: "x", value: 1 }, { panel: "P", group: "A", key: "x", value: 2 },
  { panel: "Q", group: "B", key: "x", value: 7 }, { panel: "Q", group: "C", key: "x", value: 4 }];
const make = () => chart().createCanvas({ width: 400, height: 300, margin: 50 })
  .createData({ id: "raw", values })
  .createPivotData({ id: "wide", field: "key", groupBy: ["panel", "group"], value: "value", op: "sum" })
  .createPointMark({ id: "points", data: "wide" })
  .encodeX({ target: "points", field: "group", fieldType: "nominal" })
  .encodeY({ target: "points", field: "x", fieldType: "quantitative" });

test("pivot facets recompute source partitions while repeat rejects statistical topology", () => {
  const source = make(), faceted = source.facet({ field: "panel", columns: 2, guides: { legend: false } });
  const actual = [];
  for (const id of faceted.compositionSpec.children) {
    const child = faceted.children[id];
    const derived = child.semanticSpec.datasets.find(d => d.id.startsWith(id) && d.transform?.[0]?.type === "pivot");
    assert.ok(derived);
    actual.push(...derived.values);
    assert.deepEqual(derived.transform[0].columns, [{ value: "x", as: "x" }]);
  }
  assert.deepEqual(actual, [{ panel: "P", group: "A", x: 3 }, { panel: "Q", group: "B", x: 7 }, { panel: "Q", group: "C", x: 4 }]);
  assert.throws(() => source.repeatCharts({ channel: "y", fields: ["x"] }), /source dataset|derived|transform|repeat/i);
});

test("pivot item selections retain actual input membership through edits and composition", () => {
  const p = make().selectMarks({ id: "largest", target: "points", field: "x", op: "max" })
    .highlightMarks({ selection: "largest", target: "points", fill: "#ff0000" });
  const items = resolveMarkItems(p, "points");
  assert.deepEqual(items.map(item => item.rows.filter(r => r.data === "raw").length), [2, 1, 1]);
  const next = p.editPivotData({ target: "wide", op: "count" });
  const highlighted = program => resolveMarkItems(program, "points").filter(item =>
    item.graphicIds.some(id => program.graphicSpec.objects.points.items.find(graphic => graphic.id === id).properties.fill === "#ff0000"))
    .map(item => item.fields.group);
  assert.deepEqual(highlighted(next), ["A"]);
  assert.deepEqual(highlighted(p), ["B"]);
  const combined = hconcat({ programs: [p, next] });
  assert.equal(combined.compositionSpec.children.length, 2);
  assert.match(renderToSVG(combined), /<svg/);
  const scene = createTransitionScene(p), changedScene = createTransitionScene(next);
  assert.equal(scene.nodes.filter(node => node.type === "circle").length, 3);
  assert.notDeepEqual(changedScene, scene);
});

test("pivot ordinary marks feed Canvas and SVG without renderer-side computation", () => {
  const p = make(), before = JSON.stringify(p);
  render(p, createMockCanvasContext());
  assert.match(renderToSVG(p), /<svg/);
  assert.equal(p.graphicSpec.objects.points.items.length, 3);
  assert.equal(JSON.stringify(p), before);
});
