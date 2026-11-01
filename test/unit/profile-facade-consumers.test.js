import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { exportAccessibleData } from "../../src/accessibility.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";

const rows = Object.freeze([
  { id: "a0", series: "A", x: 0, value: 1 }, { id: "a1", series: "A", x: 1, value: 3 }, { id: "a2", series: "A", x: 2, value: 2 },
  { id: "b0", series: "B", x: 0, value: 2 }, { id: "b1", series: "B", x: 1, value: 4 }, { id: "b2", series: "B", x: 2, value: 3 }
].map(Object.freeze));
const base = () => chart().createCanvas({ width: 400, height: 300, margin: 50 })
  .createData({ id: "data", keyField: "id", values: rows });
const families = {
  rose: { build: p => p.createRosePlot({ id: "m", category: "series", value: "value", aggregate: "sum", guides: false }), point: { x: 200, y: 110 }, appearance: "fill" },
  radar: { build: p => p.createRadarPlot({ id: "m", category: { field: "x", fieldType: "ordinal" }, value: { field: "value", scale: { domain: [0, 4], nice: false } }, groupBy: "series", color: "series", guides: false }), point: { x: 200, y: 225 }, appearance: "stroke" },
  streamgraph: { build: p => p.createAreaPlot({ id: "m", x: "x", y: { field: "value", scale: { nice: false } }, groupBy: "series", layout: "wiggle", guides: false }), point: { x: 200, y: 200 }, appearance: "fill" },
  violin: { build: p => p.createViolinPlot({ id: "m", x: "series", y: { field: "value", scale: { domain: [0, 5], nice: false } }, density: { bandwidth: 1, extent: [0, 5], steps: 10 }, guides: false }), point: { x: 125, y: 170 }, appearance: "fill" }
};
const items = p => getMarkItems(p, { target: "m" });
const accessible = p => exportAccessibleData(p, { format: "items" });
const revise = p => p.reviseData({ source: "data", id: "revised", values: rows.map(row => ({ ...row, value: row.value + (row.series === "A" ? .5 : 0) })) });

for (const [family, { build, point, appearance }] of Object.entries(families)) {
  test(`${family} replays native color, scale and guide edits at its own logical grain`, () => {
    const p = build(base()), before = serializeProgram(p);
    const polar = family === "rose" || family === "radar";
    const domain = family === "rose" ? [0, 18] : family === "radar" ? [0, 8] : family === "violin" ? [0, 10] : [-4, 8];
    const edit = family === "rose" ? "editArcMark" : family === "radar" ? "editLineMark" : "editAreaMark";
    const styled = p[edit]({ target: "m", opacity: .7 });
    assert.deepEqual(styled.graphicSpec.objects.m.items.map(item => item.properties.commands), p.graphicSpec.objects.m.items.map(item => item.properties.commands));
    const colored = styled.encodeColor({ target: "m", field: "series", scale: { domain: ["A", "B"], range: ["#112233", "#445566"] } });
    const scaled = colored.editScale({ id: polar ? "radius" : "y", domain });
    const guided = scaled.createGuides({ legend: false });
    const q = polar ? guided.editThetaAxis({ labels: { fontSize: 13 } }) : guided.editXAxis({ labels: { fontSize: 13 } });
    assert.deepEqual(items(q).map(item => item.key), items(p).map(item => item.key));
    assert.deepEqual(q.graphicSpec.objects.m.items.map(item => item.properties[appearance]), ["#112233", "#445566"]);
    assert.deepEqual(q.graphicSpec.objects.m.items.map(item => item.properties.opacity), [.7, .7]);
    assert.deepEqual(q.resolvedScales[polar ? "radius" : "y"].domain, domain);
    assert.equal(q.guideConfigs.axis[polar ? "theta" : "x"].labels.fontSize, 13);
    assert.notDeepEqual(q.graphicSpec.objects.m.items[0].properties.commands, p.graphicSpec.objects.m.items[0].properties.commands);
    assert.ok(Object.keys(q.graphicSpec.objects).some(id => /AxisLabels$/.test(id)));
    if (family === "rose") assert.equal(q.resolvedScales.radius.radialMapping, "area");
    if (family === "radar") assert.equal(q.graphicSpec.objects.m.items[0].properties.commands.at(-1).op, "Z");
    if (family === "streamgraph") assert.deepEqual(q.semanticSpec.layers[0].layout, { mode: "wiggle" });
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
    assert.equal(serializeProgram(p), before);
  });

  test(`${family} exposes two logical profiles with original rows, exact hit and accessible selection through revision`, () => {
    const p = build(base()), before = serializeProgram(p), original = items(p);
    assert.deepEqual(original.map(item => item.fields.series), ["A", "B"]);
    assert.deepEqual(original.map(item => item.rows.filter(row => row.data === "data").map(row => row.index)), [[0, 1, 2], [3, 4, 5]]);
    if (family === "rose") assert.deepEqual(original.map(item => item.channels.radius), [6, 9]);
    if (family === "violin") assert.deepEqual(original.map(item => item.rows.filter(row => row.data === "mDensityData").length), [10, 10]);
    // Independent coordinates: upper half-disk; Radar's 180-degree value-3 vertex;
    // the middle wiggle column's A band; and category A's center at measurement 2.
    const session = createInteractionSession({ program: p });
    try {
      session.dispatch({ type: "inspect", point });
      assert.equal(session.getState().hit.target.itemKey, original[0].key);
      assert.equal(session.getState().hit.target.ownerId, "m");
    } finally { session.destroy(); }
    const selected = p.selectMarks({ id: "picked", target: "m", field: "series", op: "eq", value: "A" })
      .highlightMarks({ selection: "picked", [appearance]: "#ff0000", bringToFront: false });
    const next = revise(selected), nextItems = items(next);
    assert.deepEqual(nextItems.map(item => item.key), original.map(item => item.key));
    assert.notDeepEqual(next.graphicSpec.objects.m.items[0].properties.commands, p.graphicSpec.objects.m.items[0].properties.commands);
    assert.deepEqual(nextItems.map(item => item.rows.filter(row => row.data === "revised").map(row => [row.index, row.revision])), [[[0, 1], [1, 1], [2, 1]], [[3, 1], [4, 1], [5, 1]]]);
    assert.equal(next.graphicSpec.objects.m.items[0].properties[appearance], "#ff0000");
    if (family === "rose") assert.deepEqual(nextItems.map(item => item.channels.radius), [7.5, 9]);
    const exported = accessible(next);
    assert.deepEqual(exported.views[0].items.map(item => [item.fields.series, item.selectedBy, item.visible]), [["A", ["picked"], true], ["B", [], true]]);
    assert.deepEqual(exported.views[0].items.map(item => item.key), nextItems.map(item => item.key));
    const restored = deserializeProgram(serializeProgram(next));
    assert.deepEqual(restored.graphicSpec, next.graphicSpec);
    assert.deepEqual(items(restored), nextItems);
    assert.deepEqual(accessible(restored), exported);
    assert.equal(serializeProgram(p), before);
    const joined = hconcat({ id: "outer", programs: [{ id: "left", program: next }, { id: "right", program: p }] });
    const views = accessible(joined).views;
    assert.deepEqual(views.map(view => view.childPath), [["left"], ["right"]]);
    assert.deepEqual(views.map(view => view.items.map(item => item.selectedBy)), [[["picked"], []], [[], []]]);
    assert.equal(new Set(views.flatMap(view => view.items.map(item => item.key))).size, 4);
    for (const view of views) assert.deepEqual(view.items.map(item => item.key), getMarkItems(joined, { target: { id: "m", childPath: view.childPath } }).map(item => item.key));
    assert.deepEqual(accessible(deserializeProgram(serializeProgram(joined))), accessible(joined));
  });

  test(`${family} facade has an explicit animation policy and exact offline samples`, () => {
    const from = build(base()), to = revise(from);
    const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
    const frame = sampleTransition(plan, 40);
    const restored = deserializeAnimation(serializeAnimation(plan)).plan;
    for (const time of [0, 40, 100]) assert.deepEqual(sampleTransition(restored, time), sampleTransition(plan, time));
    const kind = ["streamgraph", "violin"].includes(family) ? "semantic-cartesian" : "semantic-polar";
    const kernel = ["streamgraph", "violin"].includes(family) ? "cartesian-geometry" : "polar-geometry";
    assert.ok(plan.tracks.some(track => track.kind === kind));
    assert.ok(plan.tracks.every(track => [kind, "exact"].includes(track.kind)));
    assert.ok(frame.decisions.some(decision => decision.kernel === kernel));
    assert.ok(frame.decisions.every(decision => decision.kind !== "crossfade"));
    const rebased = planTransition({ from: frame, to: from, options: { durationMs: 60, easing: "linear" } });
    assert.equal(sampleTransition(rebased, 0), frame);
    assert.ok(rebased.tracks.some(track => track.kind === kind));
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan, 30), sampleTransition(rebased, 30));
  });
}
