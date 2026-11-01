import assert from "node:assert/strict";
import { chart, hconcat } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { createInteractionSession } from "ggaction/interaction";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
const region = p => p.semanticSpec.resources.find(value => value.id === "picked").options.predicate.region.x;
const pointChart = () => chart().createCanvas({ width: 300, height: 200, margin: 0 }).createData({ values: [{ x: 50, y: 60 }, { x: 200, y: 130 }] })
  .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } }).encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } })
  .selectMarks({ id: "picked", target: "points", region: { x: { ranges: [{ min: 20, max: 100 }] } } });
function host() {
  const listeners = new Map(), frames = new Map(), captures = new Set(); let next = 0;
  return { captures, getBoundingClientRect: () => ({ left: 10, top: 20, width: 640, height: 400 }),
    addEventListener(type, fn) { const set = listeners.get(type) ?? new Set(); set.add(fn); listeners.set(type, set); }, removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id),
    requestAnimationFrame: fn => (frames.set(++next, fn), next), cancelAnimationFrame: id => frames.delete(id),
    flush() { const work = [...frames.values()]; frames.clear(); work.forEach(fn => fn()); },
    fire(type, x, y, extra = {}) { for (const fn of listeners.get(type) ?? []) fn({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x + 10, clientY: y + 20, ...extra }); },
    count: () => [...listeners.values()].reduce((count, values) => count + values.size, 0)
  };
}
export const cases = [
  { id: "interaction-handles/scoped-region-pointer-and-command", run() {
    const child = pointChart(), p = hconcat({ gap: 20, programs: [{ id: "a", program: child }, { id: "b", program: child }] }), before = serializeProgram(p);
    const target = { childPath: ["b"], id: "points" }, s = createInteractionSession({ program: p, bindings: [{ type: "resize", target, selection: "picked", axis: "x" }] }), h = host();
    s.mount(h, { rootTransform: [2, 0, 0, 2, 7, 11] });
    assert.deepEqual(s.getSelectionHandles().handles.map(value => value.point), [{ x: 687, y: 211 }, { x: 847, y: 211 }]);
    h.fire("pointerdown", 852, 211, { pointerType: "touch" }); h.fire("pointermove", 1007, 211, { pointerType: "touch" }); h.flush();
    assert.equal(s.getState().program, p); assert.equal(region(s.getState().previewProgram.children.b).ranges[0].max, 180);
    h.fire("pointerup", 1007, 211, { pointerType: "touch" }); const q = s.getState().program;
    assert.equal(q.children.a, child); assert.equal(region(q.children.b).ranges[0].max, 180); assert.equal(s.getState().history.undoCount, 1);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
    s.dispatch({ type: "undo" }); s.dispatch({ type: "select", target, payload: { id: "picked", mode: "replace", select: { region: { x: { ranges: [{ min: 20, max: 180 }] } } } }, origin: "user" });
    assert.deepEqual(s.getState().program.graphicSpec, q.graphicSpec); assert.equal(serializeProgram(p), before);
    s.destroy(); assert.equal(h.count(), 0); assert.throws(() => s.getSelectionHandles(), /disposed/);
  } },
  { id: "interaction-handles/typed-category-pointer-and-command", run() {
    const p = chart().createCanvas({ width: 600, height: 400, margin: { left: 80, right: 120, top: 30, bottom: 80 } })
      .createData({ values: [{ c: 1, v: 1 }, { c: "1", v: 2 }, { c: false, v: 3 }] }).createBarPlot({ id: "bars", x: "c", y: "v", color: "c" }).editLegend({ order: { channel: "x" } });
    const s = createInteractionSession({ program: p, bindings: [{ type: "reorder", target: "bars", channel: "x" }] }), h = host(); s.mount(h);
    const label = p.graphicSpec.objects.xAxisLabels.items[1].properties;
    h.fire("pointerdown", label.x, label.y); h.fire("pointermove", 580, label.y); h.flush();
    assert.equal(s.getState().program, p); assert.deepEqual(s.getState().previewProgram.resolvedScales.x.domain, [1, false, "1"]);
    h.fire("keydown", 0, 0, { key: "Escape" }); assert.equal(s.getState().history.undoCount, 0);
    h.fire("pointerdown", label.x, label.y); h.fire("pointerup", 580, label.y); const q = s.getState().program;
    assert.deepEqual(q.resolvedScales.x.domain, [1, false, "1"]); assert.equal(s.getState().history.undoCount, 1);
    s.dispatch({ type: "undo" }); s.dispatch({ type: "reorder", target: "bars", payload: { channel: "x", values: [1, false, "1"] }, origin: "user" });
    assert.deepEqual(s.getState().program.graphicSpec, q.graphicSpec); assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q)); s.destroy(); assert.equal(h.count(), 0);
  } },
  { id: "interaction-handles/ambiguity-and-cancel-atomicity", run() {
    const p = pointChart().editMarkSelection({ selection: "picked", region: { x: { ranges: [{ min: 20, max: 22 }] } } });
    const s = createInteractionSession({ program: p, bindings: [{ type: "resize", target: "points", selection: "picked", axis: "x" }] }), h = host(); s.mount(h);
    assert.throws(() => h.fire("pointerdown", 21, 100), /ambiguous/); assert.equal(h.captures.size, 0); assert.equal(s.getState().program, p);
    h.fire("pointerdown", 22, 100); h.fire("pointermove", 80, 100); h.flush(); h.fire("pointercancel", 80, 100); h.fire("pointerup", 90, 100);
    assert.equal(s.getState().program, p); assert.equal(s.getState().previewProgram, null); assert.equal(s.getState().history.undoCount, 0);
    s.updateProgram(pointChart().editMarkSelection({ selection: "picked", items: [] })); assert.deepEqual(s.getSelectionHandles().handles, []);
    assert.throws(() => createInteractionSession({ program: basic().createCanvas(), bindings: [{ type: "resize", target: "points", selection: "picked", axis: "x" }] }));
    s.destroy(); assert.equal(h.count(), 0);
  } }
];
