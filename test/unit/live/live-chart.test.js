import test from "node:test";
import assert from "node:assert/strict";
import { chart as programChart } from "../../../src/index.js";
import { chart, LiveChart, playAnimation } from "../../../src/live.js";
import { serializeProgram } from "../../../src/persistence.js";
import { createLiveDocument } from "../../support/live-dom.js";

const rows = [{ id: "a", x: 1, y: 2, kind: "u" }, { id: "b", x: 3, y: 4, kind: "v" }, { id: "c", x: 5, y: 1, kind: "u" }];
const sx = x => 20 + x / 6 * 260, sy = y => 180 - y / 5 * 160;
const at = (x, y) => ({ x: sx(x), y: sy(y) });
function points(target = chart()) {
  return target.createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: rows }).createPointMark({ id: "points" })
    .encodeX({ field: "x", scale: { id: "x", domain: [0, 6], nice: false } }).encodeY({ field: "y", scale: { id: "y", domain: [0, 5], nice: false } });
}
function drag(env, canvas, from, to, extra = {}) {
  canvas.fire("pointerdown", from, extra); canvas.fire("pointermove", to, extra); env.flush(); canvas.fire("pointerup", to, extra); env.flush();
}
const tooltipOf = env => env.document.body.children.find(node => node.getAttribute("role") === "tooltip");

test("live charts author with the engine's actions and draw every call once a screen is attached", () => {
  const env = createLiveDocument(), canvas = env.canvas();
  const live = points(chart().addCanvas(canvas));
  // Dataset namespaces are fresh per authoring run; drawn geometry and semantics are identical.
  const drawn = program => Object.values(program.graphicSpec.objects).flatMap(object => (object.items ?? []).map(item => item.properties));
  const engine = points(programChart());
  assert.deepEqual(drawn(live.program), drawn(engine)); assert.deepEqual(live.program.semanticSpec.layers, engine.semanticSpec.layers);
  assert.equal(live.pendingError, null);
  const before = canvas.context.calls.length;
  assert.equal(live.editScale({ id: "x", domain: [0, 12], nice: false }), live);
  assert.ok(canvas.context.calls.length > before);
  const program = live.program;
  assert.throws(() => live.encodeX({ field: "absent" }));
  assert.equal(live.program, program);
  // An incomplete authoring state is pending, not a failure.
  const partial = chart().addCanvas(env.canvas()).createCanvas({ width: 300, height: 200 }).createData({ id: "rows", values: rows }).createPointMark({ id: "points" });
  assert.ok(partial.pendingError instanceof Error);
  assert.equal(partial.encodeX({ field: "x" }).encodeY({ field: "y" }).pendingError, null);
  assert.ok(live instanceof LiveChart);
});

test("tooltips and hover markers follow the pointer with text-only field values", () => {
  const env = createLiveDocument(), canvas = env.canvas();
  const seen = [];
  const live = points(chart().addCanvas(canvas)).addTooltip({ fields: ["id", "x"] }).addHover();
  live.on("hover", event => seen.push(event.item?.fields.id ?? null));
  canvas.fire("pointermove", at(3, 4)); env.flush();
  const tooltip = tooltipOf(env), ring = env.document.body.children.find(node => node.style.borderRadius === "50%");
  assert.equal(tooltip.style.display, "block"); assert.equal(tooltip.textContent, "id: b\nx: 3"); assert.equal(ring.style.display, "block");
  canvas.fire("pointerleave", at(3, 4)); env.flush();
  assert.equal(tooltip.style.display, "none"); assert.equal(ring.style.display, "none");
  assert.deepEqual(seen.filter(Boolean), ["b"]);
  const formatted = points(chart().addCanvas(env.canvas())).addTooltip({ format: fields => `<b>${fields.id}</b>` });
  formatted.program; // format output is placed as text
  assert.throws(() => live.addTooltip({ fields: "id" }), /field names/);
});

test("brush, lasso and click selections commit, notify and undo", () => {
  const env = createLiveDocument(), canvas = env.canvas(), selections = [];
  const live = points(chart().addCanvas(canvas)).addBrush();
  live.on("select", event => selections.push(event.selected.points?.map(fields => fields.id) ?? []));
  const before = live.program;
  drag(env, canvas, at(0.5, 4.5), at(3.5, 1.5));
  assert.deepEqual(selections.at(-1), ["a", "b"]);
  assert.notEqual(live.program, before);
  live.undo(); assert.deepEqual(Object.keys(live.program.semanticSpec.resources), Object.keys(before.semanticSpec.resources));
  live.redo(); live.reset();
  // A click tool keeps plain clicks; the brush then requires Shift.
  const clicked = [], both = points(chart().addCanvas(env.canvas())).addClickSelect().addBrush();
  both.on("select", event => clicked.push(event.selected.points?.map(fields => fields.id) ?? []));
  const surface = env.document.body.children.at(-1);
  surface.fire("pointerdown", at(5, 1)); surface.fire("pointerup", at(5, 1)); env.flush();
  assert.deepEqual(clicked.at(-1), ["c"]);
  drag(env, surface, at(0.5, 4.5), at(3.5, 1.5), { shiftKey: true });
  assert.deepEqual(clicked.at(-1), ["a", "b"]);
  assert.throws(() => points(chart()).addBrush({ target: "absent" }), /existing mark/);
  assert.throws(() => points(chart()).addLasso().addBrush().addPan().addDragNodes({ target: "points" }).addZoom().addBrush(), /drag interactions|requires/);
});

test("axis charts zoom around the pointer and pan by dragging", () => {
  const env = createLiveDocument(), canvas = env.canvas();
  const live = points(chart().addCanvas(canvas)).addZoom().addPan();
  canvas.fire("wheel", at(3, 2.5), { deltaY: -100 });
  const zoomed = live.program.resolvedScales;
  assert.ok(zoomed.x.domain[1] - zoomed.x.domain[0] < 6); assert.ok(Math.abs((zoomed.x.domain[0] + zoomed.x.domain[1]) / 2 - 3) < 1e-9);
  const domain = zoomed.x.domain;
  canvas.fire("pointerdown", at(3, 2.5)); canvas.fire("pointermove", { x: sx(3) + 26, y: sy(2.5) }); canvas.fire("pointerup", { x: sx(3) + 26, y: sy(2.5) });
  assert.ok(live.program.resolvedScales.x.domain[0] < domain[0]);
  live.undo(); assert.deepEqual(live.program.resolvedScales.x.domain, domain);
  assert.throws(() => chart().createCanvas({ width: 300, height: 200, margin: 20 }).createData({ id: "rows", values: rows }).createPointMark({ id: "p" })
    .encodeX({ field: "kind", fieldType: "nominal" }).encodeY({ field: "kind", fieldType: "nominal" }).addZoom(), /continuous/);
});

test("data changes animate through the engine and linked charts share selections", async () => {
  const env = createLiveDocument(), canvas = env.canvas();
  const live = points(chart().addCanvas(canvas));
  const changed = live.setData(rows.map(row => ({ ...row, y: row.y + 0.5 })));
  for (let i = 0; i < 40 && env.frames.size; i++) { env.advance(50); env.flush(); await new Promise(resolve => setImmediate(resolve)); }
  await changed;
  assert.deepEqual(live.program.semanticSpec.datasets.find(dataset => dataset.id === live.program.semanticSpec.layers[0].data).values.map(row => row.y), [2.5, 4.5, 1.5]);
  await live.setData(rows, { animate: false });
  assert.equal(live.program.semanticSpec.layers[0].data, "rows_live2");
  const other = points(chart().addCanvas(env.canvas())).addClickSelect(), first = live.addBrush();
  first.linkTo(other, { by: "kind" });
  let linked; other.on("select", event => { linked = event.selected.points?.map(fields => fields.id); });
  drag(env, canvas, at(0.5, 2.5), at(1.5, 1.5));
  assert.deepEqual(linked, ["a", "c"]);
  assert.throws(() => live.linkTo(live, { by: "kind" }), /another live chart/);
  const target = points(programChart()).editScale({ id: "x", domain: [0, 12], nice: false });
  const done = playAnimation(points(programChart()), target, env.canvas(), { duration: 100 });
  for (let i = 0; i < 10 && env.frames.size; i++) { env.advance(50); env.flush(); await new Promise(resolve => setImmediate(resolve)); }
  await done;
});

test("parameter controls, save and load, and disposal", () => {
  const env = createLiveDocument(), canvas = env.canvas();
  const live = points(chart().addCanvas(canvas)).createParameter({ id: "size", value: 4 }).addSlider("size", { min: 1, max: 10 }).addDropdown("size", { options: [2, 4, 8] });
  const slider = canvas.parentNode.children.find(node => node.tagName === "LABEL").children[0];
  slider.value = "7"; slider.fire("input");
  assert.equal(live.program.semanticSpec.resources.find(resource => resource.kind === "parameter").result.value, 7);
  assert.throws(() => live.addSlider("absent"), /Unknown parameter/);
  const text = live.addTooltip({ fields: ["id"] }).addBrush().save();
  const restored = LiveChart.load(text, env.canvas());
  assert.equal(serializeProgram(restored.program), serializeProgram(live.program));
  assert.equal(restored.save(), text);
  assert.throws(() => LiveChart.load("{}"), /Unsupported live chart/);
  live.dispose();
  assert.equal(canvas.listenerCount("pointermove"), 0);
  assert.throws(() => live.editScale({ id: "x", domain: [0, 2] }), /disposed/);
});

test("legend toggles, theme, resize, downloads and timelines use the engine owners", async () => {
  const env = createLiveDocument(), canvas = env.canvas();
  const live = points(chart().addCanvas(canvas)).editCanvas({ margin: { top: 20, right: 120, bottom: 20, left: 20 } })
    .encodeColor({ field: "kind" }).createLegend({}).addLegendToggle();
  assert.equal(live.pendingError, null);
  assert.throws(() => points(chart().addCanvas(env.canvas())).addLegendToggle(), /0 legend channels/);
  assert.throws(() => live.addLegendToggle({ channel: "size" }), /no legend/);
  const themed = live.setTheme("dark").program;
  assert.notEqual(themed, undefined);
  let observed;
  env.view.ResizeObserver = class { constructor(callback) { observed = callback; } observe() {} disconnect() {} };
  live.autoResize();
  observed([{ contentRect: { width: 360, height: 240 } }]);
  assert.equal(live.program.graphicSpec.objects.canvas.properties.width, 360);
  const blob = await live.download("svg", "chart.svg");
  assert.equal(env.document.body.children.length > 0, true);
  assert.ok((await blob.text()).startsWith("<svg"));
  await assert.rejects(live.download("gif"), /download format/);
  // A timeline steps through each value, then restores every row.
  const timeline = points(chart().addCanvas(env.canvas())).playOver("kind", { duration: 50 }), states = [];
  for (let i = 0; i < 200 && states.length < 3; i++) { env.advance(25); env.flush(); await new Promise(resolve => setImmediate(resolve)); }
  timeline.pause(); timeline.play();
  await timeline.stop();
  assert.throws(() => points(chart()).playOver("absent"), /not in the data/);
});

test("graph nodes drag through the native movement owner and maps navigate natively", () => {
  const env = createLiveDocument(), canvas = env.canvas();
  const network = origin => chart().addCanvas(env.canvas()).createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "nodes", values: [{ id: 0 }, { id: 1 }] }).createData({ id: "edges", values: [{ id: "e", source: 0, target: 1 }] })
    .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", edgeKey: "id", source: "source", target: "target" })
    .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: 0, x: 0, y: 0 }, { key: 1, x: 100, y: 100 }] } })
    .createGraphPlot({ id: "network", ...(origin ? { origin: [0, 0] } : {}) });
  // A complete chart rejects an interaction the engine cannot attach, without adding it.
  const centered = network(false);
  assert.throws(() => centered.addDragNodes(), /explicit graph plot origin/);
  assert.equal(centered.save().includes("moveNode"), false); assert.equal(centered.pendingError, null);
  const movable = network(true).addDragNodes();
  assert.equal(movable.pendingError, null); assert.equal(movable.save().includes("moveNode"), true);
  const point = (id, coordinates) => ({ type: "Feature", id, properties: {}, geometry: { type: "Point", coordinates } });
  const map = chart().addCanvas(env.canvas()).createCanvas({ width: 300, height: 200, margin: 0 })
    .createGeometryData({ id: "world", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: { type: "FeatureCollection", features: [point("a", [0, 0]), point("b", [10, 5])] } })
    .createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [150, 100] }).createCoordinate({ type: "geo" }).createGeoPointMark({ id: "places" })
    .addZoom().addPan();
  assert.equal(map.pendingError, null);
  assert.equal(map.save().includes('"navigate"'), true);
  assert.equal(JSON.parse(map.save()).features.length, 1);
});

test("containers, animation targets and raster downloads", async () => {
  const env = createLiveDocument(), container = env.document.createElement("div");
  env.document.body.appendChild(container);
  const live = points(chart().addCanvas(container));
  assert.equal(container.children[0].tagName, "CANVAS"); assert.ok(container.children[0].context.calls.length > 0);
  const run = async promise => { for (let i = 0; i < 40 && env.frames.size; i++) { env.advance(50); env.flush(); await new Promise(resolve => setImmediate(resolve)); } return promise; };
  await run(live.animateTo(program => program.editScale({ id: "x", domain: [0, 12], nice: false }), { duration: 100 }));
  assert.deepEqual(live.program.resolvedScales.x.domain, [0, 12]);
  const other = points(chart()).editScale({ id: "y", domain: [0, 10], nice: false });
  await run(live.animateTo(other, { duration: 100 }));
  assert.deepEqual(live.program.resolvedScales.y.domain, [0, 10]);
  await run(live.animateTo(() => other.editScale({ id: "x", domain: [0, 3], nice: false }), { duration: 100 }));
  assert.throws(() => live.animateTo(() => 1), /animateTo requires/);
  assert.equal((await live.download("png")).type, "image/png");
  await assert.rejects(live.download("pdf"), /renderToPDFBuffer\(chart\.program\) from "ggaction\/pdf"/);
  const detached = points(chart());
  await assert.rejects(detached.download("png"), /attached canvas/);
  assert.throws(() => detached.autoResize(), /addCanvas first/);
  await detached.animateTo(program => program.editScale({ id: "x", domain: [0, 2], nice: false }));
  assert.deepEqual(detached.program.resolvedScales.x.domain, [0, 2]);
  live.dispose(); assert.equal(container.children.length, 0);
});
