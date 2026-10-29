import { chart } from "../../../src/index.js";
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
