import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { prepareProgramHitFrame } from "../../src/interaction/hitProgram.js";
import { normalizeLegendSelection } from "../../src/interaction/legendSelection.js";

const rows = [{ id: "a", x: 1, y: 2, category: 1 }, { id: "b", x: 2, y: 3, category: "1" }, { id: "c", x: 3, y: 4, category: 1 }];
const base = (factory = chart) => factory().createCanvas({ width: 500, height: 350, margin: 100 })
  .createData({ id: "rows", values: rows, keyField: "id" }).createPointMark({ id: "points" })
  .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "category" })
  .createLegend({ target: "points", channels: ["color"], position: "right" });
const program = () => base().selectMarks({ id: "picked", target: "points", items: [] });
const binding = extra => ({ type: "legend", effect: "selection", target: "points", channel: "color", selection: "picked", ...extra });
function selected(p, id = "picked") {
  const { items, keys } = resolveStoredSelection(p, id);
  return items.filter(item => keys.includes(item.key)).map(item => item.fields.id);
}
function entries(p, type = "rect") {
  const frame = prepareProgramHitFrame(p);
  return frame.entries.filter(e => e.metadata.role === "legend-item" && frame.scene.nodes[e.zIndex].type === type)
    .map(e => ({ point: { x: (e.shape.bounds.left + e.shape.bounds.right) / 2, y: (e.shape.bounds.top + e.shape.bounds.bottom) / 2 }, ...e }));
}
function surface(captured = false) {
  const listeners = new Map(), captures = new Set();
  return { captures, getBoundingClientRect: () => ({ left: 10, top: 20, width: 1000, height: 700 }),
    addEventListener(type, fn) { const group = listeners.get(type) ?? new Set(); group.add(fn); listeners.set(type, group); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(point, extra = {}, type = "click") { for (const fn of [...listeners.get(type) ?? []]) fn({ clientX: point.x + 10, clientY: point.y + 20, pointerId: 1, pointerType: "mouse", ...extra }); },
    count: () => [...listeners.values()].reduce((sum, group) => sum + group.size, 0),
    ...(captured ? { setPointerCapture: id => captures.add(id), releasePointerCapture: id => captures.delete(id), hasPointerCapture: id => captures.has(id) } : {}) };
}

test("legend symbols and labels select typed groups through one native transaction and preserve the input", () => {
  const p = program(), before = serializeProgram(p), session = createInteractionSession({ program: p, bindings: [binding()] }), host = surface(), phases = [];
  session.mount(host); session.subscribe(event => { if (event.phase) phases.push([event.type, event.phase]); });
  const symbols = entries(p); assert.equal(symbols.length, 2);
  host.emit(symbols[0].point); assert.deepEqual(selected(session.getState().program), ["a", "c"]);
  const labels = entries(session.getState().program, "text").filter(e => symbols.some(symbol => symbol.metadata.itemKey === e.metadata.itemKey));
  host.emit(labels[1].point); assert.deepEqual(selected(session.getState().program), ["a", "b", "c"]);
  host.emit(symbols[0].point); assert.deepEqual(selected(session.getState().program), ["b"]);
  assert.deepEqual(selected(deserializeProgram(serializeProgram(session.getState().program))), ["b"]);
  assert.deepEqual(phases, Array.from({ length: 3 }, () => [["select", "commit"], ["select", "settled"]]).flat());
  assert.equal(serializeProgram(p), before); session.destroy(); assert.equal(host.count(), 0);
});

test("replace ignores background/title and suppresses exact category snapshot no-ops", () => {
  const p = program(), session = createInteractionSession({ program: p, bindings: [binding({ mode: "replace" })] }), host = surface(); session.mount(host);
  const symbols = entries(p); host.emit(symbols[0].point); const selectedState = session.getState();
  host.emit(symbols[0].point); host.emit({ x: 5, y: 5 });
  const title = entries(p, "text").find(e => !symbols.some(symbol => symbol.metadata.itemKey === e.metadata.itemKey)); host.emit(title.point);
  assert.equal(session.getState(), selectedState); host.emit(symbols[1].point); assert.deepEqual(selected(session.getState().program), ["b"]);
  session.destroy();
});

test("overflow summary and invisible/other legend symbols cannot invent category membership", () => {
  const p = program().editLegend({ target: "points", symbol: { layers: [{ type: "line", length: 16 }] }, overflow: { maxItems: 1, summarySymbol: "first-hidden" } });
  const session = createInteractionSession({ program: p, bindings: [binding()] }), host = surface(); session.mount(host);
  const symbols = entries(p, "line"); host.emit(symbols[1].point); assert.equal(session.getState().program, p);
  host.emit(symbols[0].point); assert.deepEqual(selected(session.getState().program), ["a", "c"]);
  session.destroy();
  const transparent = program().editLegend({ symbol: { layers: [{ type: "swatch", width: 14, height: 12, opacity: 0 }] } });
  const invisible = createInteractionSession({ program: transparent, bindings: [binding()] }), invisibleHost = surface(); invisible.mount(invisibleHost);
  invisibleHost.emit(entries(transparent)[0].point); assert.equal(invisible.getState().program, transparent); invisible.destroy();
});

test("combined categorical channels reuse the existing legend block and series grain", () => {
  let p = chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ values: rows, keyField: "id" })
    .createLineMark({ id: "lines" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeGroup({ field: "category" })
    .encodeColor({ field: "category" }).encodeStrokeDash({ field: "category" }).createLegend({ channels: ["color", "strokeDash"] })
    .selectMarks({ id: "picked", target: "lines", items: [] });
  for (const channel of ["color", "strokeDash"]) {
    const session = createInteractionSession({ program: p, bindings: [binding({ target: "lines", channel })] }), host = surface(); session.mount(host);
    host.emit(entries(p, "line")[0].point);
    const { keys, items } = resolveStoredSelection(session.getState().program, "picked");
    assert.deepEqual(items.filter(item => keys.includes(item.key)).map(item => item.fields.category), [1]); session.destroy();
  }
});

test("nested scopes, sampled transforms, capture cancellation and duplicate browser clicks preserve one writer", () => {
  const p = program(), joined = hconcat({ id: "outer", programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const session = createInteractionSession({ program: joined, bindings: [binding({ target: { childPath: ["right"], id: "points" } })] }), host = surface(true), phases = [];
  session.mount(host, { rootTransform: [2, 0, 0, 2, 0, 0] }); session.subscribe(event => { if (event.phase) phases.push(event.phase); });
  const state = session.getState(), scene = structuredClone(state.scene), key = entries(joined).find(e => e.metadata.childPath[0] === "right").nodeKey;
  const node = scene.nodes.find(n => n.key === key); node.properties.x += 10;
  session.dispatch({ type: "frame", scene, generation: state.generation, version: state.frameVersion + 1 });
  const point = { x: 2 * (node.offset[0] + node.properties.x + node.properties.width / 2), y: 2 * (node.offset[1] + node.properties.y + node.properties.height / 2) };
  host.emit(point, {}, "pointerdown"); host.emit(point, { key: "Escape" }, "keydown"); assert.equal(session.getState().program, joined); assert.equal(host.captures.size, 0);
  host.emit(point, {}, "pointerdown"); host.emit(point, {}, "pointerup"); host.emit(point, { detail: 1 });
  assert.deepEqual(selected(session.getState().program.children.right), ["a", "c"]); assert.equal(session.getState().program.children.left, p);
  assert.deepEqual(phases, ["cancel", "commit", "settled"]); session.destroy(); assert.equal(host.count(), 0);
});

test("missing legend/selection/child stays dormant and restored typed categories use current data", () => {
  const p = program(), session = createInteractionSession({ program: p, bindings: [binding()] }), host = surface(); session.mount(host);
  session.updateProgram(p.removeLegend({ target: "points" })); const before = session.getState(); host.emit(entries(p)[0].point); assert.equal(session.getState(), before);
  session.updateProgram(p.removeMarkSelection({ selection: "picked" })); const missing = session.getState(); host.emit(entries(p)[0].point); assert.equal(session.getState(), missing);
  const changed = p.reviseData({ source: "rows", id: "next", values: [{ id: "b", x: 2, y: 3, category: "1" }, { id: "d", x: 4, y: 5, category: "1" }] });
  session.updateProgram(changed); host.emit(entries(changed)[0].point); assert.deepEqual(selected(session.getState().program), ["b", "d"]); session.destroy();
});

test("legend source selections close linked filters before commit and later failure preserves the old state", () => {
  const p = program(), other = p.removeLegend({ target: "points" }), joined = hconcat({ programs: [{ id: "source", program: p }, { id: "target", program: other }] });
  const source = { childPath: ["source"], id: "points" }, target = { childPath: ["target"], id: "points" };
  const session = createInteractionSession({ program: joined, bindings: [binding({ target: source }), { type: "linkFilter", id: "linked", target, selection: "picked", resolve: "global", sources: [{ target: source, selection: "picked", projection: { type: "fields", sourceFields: ["category"], targetFields: ["category"] } }] }] });
  const host = surface(); session.mount(host); host.emit(entries(joined)[0].point);
  assert.deepEqual(resolveStoredSelection(session.getState().program.children.target, "picked").items.map(item => item.fields.id), ["a", "c"]);
  const before = session.getState(); assert.throws(() => session.updateProgram(joined.editLegend({ target: { childPath: ["source"], id: "points" }, channels: ["size"] }))); assert.equal(session.getState(), before); session.destroy();
});

test("legend validation is explicit, bounded, immutable and never executes input getters", () => {
  const p = program(), before = serializeProgram(p);
  for (const extra of [{ effect: "visibility" }, { channel: undefined }, { channel: "series" }, { mode: "all" }, { onMiss: "clear" }, { hitInvisible: true }, { slop: -1 }, { selection: "missing" }]) {
    assert.throws(() => createInteractionSession({ program: p, bindings: [binding(extra)] }));
  }
  const continuous = p.removeLegend().encodeColor({ field: "x", fieldType: "quantitative" }).createLegend({ channels: ["color"] });
  assert.throws(() => createInteractionSession({ program: continuous, bindings: [binding()] }), /categorical legend block/);
  assert.throws(() => normalizeLegendSelection(p, binding({ type: "other" }), []));
  assert.throws(() => createInteractionSession({ program: base(basic), bindings: [binding()] }), /Full selection owner/);
  assert.throws(() => createInteractionSession({ program: p, bindings: [binding(), { type: "select", target: "points", selection: "picked" }] }), /ambiguous priority/);
  let reads = 0; const bad = binding(); Object.defineProperty(bad, "channel", { get() { reads++; return "color"; } });
  assert.throws(() => createInteractionSession({ program: p, bindings: [bad] })); assert.equal(reads, 0);
  const request = binding(), session = createInteractionSession({ program: p, bindings: [request] }), host = surface(); request.mode = "replace"; session.mount(host);
  host.emit(entries(p)[0].point); host.emit(entries(p)[0].point); assert.deepEqual(selected(session.getState().program), []); session.destroy(); assert.equal(serializeProgram(p), before);
});


test("empty legend categories are inert and replace converts live or partial selections to exact group snapshots", () => {
  const p = program().removeLegend().encodeColor({ field: "category", scale: { domain: [false, 1, "1"] } }).createLegend({ channels: ["color"] });
  const session = createInteractionSession({ program: p, bindings: [binding({ mode: "replace" })] }), host = surface(); session.mount(host);
  const symbols = entries(p); host.emit(symbols[0].point); assert.equal(session.getState().program, p);
  const live = p.editMarkSelection({ selection: "picked", field: "category", op: "eq", value: 1 });
  session.updateProgram(live); const revision = session.getState().revision; host.emit(entries(live)[1].point);
  assert.equal(session.getState().revision, revision + 1); assert.deepEqual(selected(session.getState().program), ["a", "c"]);
  const keys = resolveStoredSelection(p, "picked").items.map(item => item.key);
  const partial = p.editMarkSelection({ selection: "picked", items: [keys[0], keys[1]] }); session.updateProgram(partial);
  host.emit(entries(partial)[1].point); assert.deepEqual(selected(session.getState().program), ["a", "c"]); session.destroy();
});
