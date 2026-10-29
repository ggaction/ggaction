import { chart, hconcat } from "../../../src/index.js";
import assert from "node:assert/strict";
import { createInteractionSession } from "../../../src/interaction.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

// Real-source recipes retain their final item grain. A category-series brush
// uses the group's unique nominal x channel, never an arbitrary member row.
export function assertRegionInteraction(source, recipe, rows) {
  const p = (recipe === "series" ? source.encodeX({ target: "mark", field: "category", fieldType: "nominal", scale: { id: "region-x" } }) : source)
    .selectMarks({ id: "region-picked", target: "mark", items: [] })
    .highlightMarks({ selection: "region-picked", color: "#d11a2a", bringToFront: false, dimOthers: false });
  const items = getMarkItems(p, { target: "mark" }), original = serializeProgram(p);
  const chosen = items[recipe === "observations" ? 1 : 0], shape = chosen.geometry[0];
  const x = shape.type === "rect" ? shape.properties.x + shape.properties.width / 2
    : shape.type === "path" ? shape.properties.commands.find(command => command.op === "M").x : shape.properties.x;
  const sameCategory = items.filter(item => item.channels.x === chosen.channels.x).map(item => item.key);
  for (const type of ["brush", "lasso"]) {
    const session = createInteractionSession({ program: p, bindings: [{ type, target: "mark", selection: "region-picked", ...(type === "brush" ? { axis: recipe === "observations" ? "xy" : "x" } : {}) }] });
    const listeners = new Map(), capture = new Set(); let scheduled;
    const host = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 360 }),
      addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name),
      setPointerCapture: id => capture.add(id), releasePointerCapture: id => capture.delete(id), hasPointerCapture: id => capture.has(id),
      requestAnimationFrame: fn => { scheduled = fn; return 1; }, cancelAnimationFrame: () => { scheduled = undefined; } };
    const fire = (name, x, y) => listeners.get(name)({ pointerId: 1, pointerType: "mouse", clientX: x, clientY: y });
    const active = program => getMarkItems(program, { target: "mark" }).filter(item => item.geometry.some(g => g.properties.fill === "#d11a2a" || g.properties.stroke === "#d11a2a")).map(item => item.key);
    const phases = []; session.subscribe(event => { if (event.phase) phases.push(event.phase); }); session.mount(host);
    if (type === "brush") { fire("pointerdown", x - .01, 45); fire("pointermove", x + .01, 315); }
    else { fire("pointerdown", 45, 45); fire("pointermove", 455, 45); fire("pointermove", 455, 315); fire("pointermove", 45, 315); }
    const flush = scheduled; scheduled = undefined; flush(); assert.equal(session.getState().program, p);
    // Nominal-x series render vertical lines. A group with one distinct y
    // value has no segment, so it has no painted screen anchor for lasso.
    // Compute that expectation from source values, independently of hit math.
    const painted = recipe === "series" ? items.filter(item =>
      new Set(rows.filter(row => row.category === item.fields.category).map(row => row.value)).size > 1) : items;
    const expected = type === "brush" ? sameCategory : painted.map(item => item.key);
    assert.deepEqual(active(session.getState().previewProgram), expected);
    fire("pointerup", type === "brush" ? x + .01 : 45, 315);
    const next = session.getState().program; assert.deepEqual(active(next), expected);
    assert.deepEqual(active(deserializeProgram(serializeProgram(next))), expected);
    assert.equal(session.getState().revision, 1); assert.equal(session.getState().previewProgram, null);
    assert.deepEqual(phases, ["preview", "preview", "commit", "settled"]);
    assert.equal(capture.size, 0); assert.equal(scheduled, undefined); session.destroy(); assert.equal(listeners.size, 0);
  }
  const metadata = p.editMarkSelection({ selection: "region-picked", items: [chosen.key], screenAngles: [Math.PI * 35 / 18, Math.PI / 18] });
  const restoredMetadata = deserializeProgram(serializeProgram(metadata));
  assert.deepEqual(restoredMetadata.semanticSpec.resources.find(resource => resource.id === "region-picked").options.screenAngles, [Math.PI * 35 / 18, Math.PI / 18]);
  assert.deepEqual(getMarkItems(restoredMetadata, { target: "mark" }).filter(item => item.geometry.some(g => g.properties.fill === "#d11a2a" || g.properties.stroke === "#d11a2a")).map(item => item.key), [chosen.key]);
  assertAngularSource(rows);
  assertDirectControls(source);
  assertLinkedFilter(source);
  assertLegendSelection(source);
  assert.equal(serializeProgram(p), original);
}

function assertAngularSource(rows) {
  const min = Math.min(...rows.map(row => row.value)), max = Math.max(...rows.map(row => row.value));
  const p = chart().createCanvas({ width: 300, height: 300, margin: 0 }).createData({ values: rows, keyField: "key" })
    .createPolarScatterPlot({ id: "angular", theta: { field: "value", scale: { domain: [min, max], nice: false, zero: false } },
      radius: { field: "order", scale: { domain: [0, rows.length] } }, guides: false })
    .selectMarks({ id: "angular-picked", target: "angular", items: [] }).highlightMarks({ selection: "angular-picked", color: "#d11a2a", bringToFront: false, dimOthers: false });
  const session = createInteractionSession({ program: p, bindings: [{ type: "brush", axis: "theta", target: "angular", selection: "angular-picked" }] });
  const listeners = new Map(), captures = new Set(); let scheduled;
  const host = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }),
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type),
    setPointerCapture: id => captures.add(id), releasePointerCapture: id => captures.delete(id), hasPointerCapture: id => captures.has(id),
    requestAnimationFrame: fn => { scheduled = fn; return 1; }, cancelAnimationFrame: () => { scheduled = undefined; } };
  session.mount(host); const phases = []; session.subscribe(event => { if (event.phase) phases.push(event.phase); });
  const pointer = degrees => ({ pointerId: 1, pointerType: "mouse", clientX: 150 + 120 * Math.sin(degrees * Math.PI / 180), clientY: 150 - 120 * Math.cos(degrees * Math.PI / 180) });
  listeners.get("pointerdown")(pointer(350)); listeners.get("pointermove")(pointer(10)); const flush = scheduled; scheduled = undefined; flush();
  assert.equal(session.getState().program, p); listeners.get("pointerup")(pointer(10));
  const expected = rows.filter(row => row.value <= min + (max - min) / 36 || row.value >= max - (max - min) / 36).map(row => row.key);
  const next = deserializeProgram(serializeProgram(session.getState().program));
  assert.deepEqual(getMarkItems(next, { target: "angular" }).filter(item => item.properties.fill === "#d11a2a").map(item => item.fields.key), expected);
  assert.deepEqual(phases, ["preview", "preview", "commit", "settled"]); assert.equal(captures.size, 0); assert.equal(scheduled, undefined);
  session.destroy(); assert.equal(listeners.size, 0);
}

function assertDirectControls(source) {
  const items = getMarkItems(source, { target: "mark" }), category = items[0].fields.category;
  const session = createInteractionSession({ program: source, bindings: [] }), before = serializeProgram(source), phases = [];
  session.subscribe(event => { if (event.phase) phases.push(event.phase); });
  session.dispatch({ type: "filter", target: "mark", payload: { select: { field: "category", op: "eq", value: category } } });
  assert.deepEqual(getMarkItems(session.getState().program, { target: "mark" }).map(item => item.key), items.filter(item => item.fields.category === category).map(item => item.key));
  session.dispatch({ type: "filter", target: "mark", payload: { clear: true } });
  assert.deepEqual(getMarkItems(session.getState().program, { target: "mark" }).map(item => item.key), items.map(item => item.key));
  const categorical = session.getState().program.encodeX({ target: "mark", field: "category", fieldType: "nominal", scale: { id: "control-x" } });
  session.updateProgram(categorical);
  const values = [...new Set(items.map(item => item.fields.category))].reverse();
  session.dispatch({ type: "reorder", target: "mark", payload: { channel: "x", values } });
  const ordered = deserializeProgram(serializeProgram(session.getState().program));
  assert.deepEqual(ordered.resolvedScales["control-x"].domain, values);
  session.dispatch({ type: "filter", target: "mark", payload: { select: { field: "category", op: "eq", value: category } } });
  assert.deepEqual(session.getState().program.resolvedScales["control-x"].domain, [category]);
  session.dispatch({ type: "filter", target: "mark", payload: { clear: true } });
  assert.deepEqual(session.getState().program.resolvedScales["control-x"].domain, values);
  session.dispatch({ type: "reorder", target: "mark", payload: { channel: "x", clear: true } });
  assert.deepEqual(session.getState().program.resolvedScales["control-x"].domain, [...values].reverse());
  assert.deepEqual(phases, Array.from({ length: 6 }, () => ["commit", "settled"]).flat());
  assert.equal(serializeProgram(source), before); session.destroy();
}

function assertLinkedFilter(source) {
  const child = source.selectMarks({ id: "filter-universe", target: "mark", items: [], empty: "all" });
  const p = hconcat({ programs: ["source", "target", "last"].map(id => ({ id, program: child })) });
  const owner = id => ({ childPath: [id], id: "mark" });
  const items = getMarkItems(source, { target: "mark" }), category = items[0].fields.category;
  const bindings = [["source", "target"], ["target", "last"]].map(([from, to]) => ({
    type: "linkFilter", id: to, target: owner(to), selection: "filter-universe", resolve: "global",
    sources: [{ target: owner(from), selection: "filter-universe", projection: { type: "fields", sourceFields: ["category"], targetFields: ["category"] } }]
  }));
  const session = createInteractionSession({ program: p, bindings }), before = serializeProgram(p), phases = [];
  session.subscribe(event => { if (event.phase) phases.push(event.phase); });
  const cases = [{ field: "category", op: "eq", value: category }, { items: [], empty: "none" }, { items: [], empty: "all" }];
  const expected = [items.filter(item => item.fields.category === category), [], items];
  for (const [index, select] of cases.entries()) {
    session.dispatch({ type: "select", target: owner("source"), payload: { id: "filter-universe", select } });
    const current = deserializeProgram(serializeProgram(session.getState().program));
    for (const id of ["target", "last"]) assert.deepEqual(getMarkItems(current.children[id], { target: "mark" }).map(item => item.key), expected[index].map(item => item.key));
  }
  assert.deepEqual(phases, ["commit", "settled", "commit", "settled", "commit", "settled"]);
  assert.equal(serializeProgram(p), before); session.destroy();
}

function assertLegendSelection(source) {
  const p = source.editCanvas({ width: 800, height: 500, margin: 140 }).encodeColor({ target: "mark", field: "category" })
    .createLegend({ target: "mark", channels: ["color"], position: "right", symbol: { layers: [{ type: "swatch", width: 14, height: 12 }] } })
    .selectMarks({ id: "legend-picked", target: "mark", items: [] })
    .highlightMarks({ selection: "legend-picked", color: "#d11a2a", dimOthers: false, bringToFront: false });
  const items = getMarkItems(p, { target: "mark" }), category = items[0].fields.category;
  const expected = items.filter(item => item.fields.category === category).map(item => item.key);
  const session = createInteractionSession({ program: p, bindings: [{ type: "legend", effect: "selection", target: "mark", channel: "color", selection: "legend-picked" }] });
  const listeners = new Map(), host = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 500 }),
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
  session.mount(host);
  const legend = session.getState().scene.nodes.find(node => node.type === "rect" && node.properties.width === 14 && node.properties.height === 12);
  assert.ok(legend);
  const point = { clientX: legend.offset[0] + legend.properties.x + 7, clientY: legend.offset[1] + legend.properties.y + 6 };
  listeners.get("click")(point);
  const next = deserializeProgram(serializeProgram(session.getState().program));
  assert.deepEqual(getMarkItems(next, { target: "mark" }).filter(item => item.geometry.some(g => g.properties.fill === "#d11a2a" || g.properties.stroke === "#d11a2a")).map(item => item.key), expected);
  listeners.get("click")(point);
  assert.deepEqual(getMarkItems(session.getState().program, { target: "mark" }).filter(item => item.geometry.some(g => g.properties.fill === "#d11a2a" || g.properties.stroke === "#d11a2a")).map(item => item.key), []);
  session.destroy(); assert.equal(listeners.size, 0);
}
