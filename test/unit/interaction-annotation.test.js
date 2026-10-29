import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { getMarkItems } from "../../src/inspection.js";

function source() {
  return chart().createCanvas({ width: 400, height: 300, margin: 20 })
    .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
    .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 10] } })
    .encodeY({ field: "y", scale: { domain: [0, 10] } });
}
const item = p => p.graphicSpec.objects.note.items[0].properties;

test("annotation edit preserves native datum bindings and performs one immutable wrapped edit", () => {
  const p = source().createAnnotation({ id: "note", text: "Old", x: 2, y: 3 });
  const before = serializeProgram(p), options = Object.freeze({ target: "note", text: "New", x: 4, y: 6, dx: 5, dy: -7, fill: "red" });
  const next = p.editAnnotation(options);
  const lower = p.encodeText({ target: "note", value: "New" })
    .encodeX({ target: "note", datum: 4, fieldType: "quantitative", scale: { id: "x" }, coordinate: "main" })
    .encodeY({ target: "note", datum: 6, fieldType: "quantitative", scale: { id: "y" }, coordinate: "main" })
    .editTextMark({ target: "note", dx: 5, dy: -7, fill: "red" });
  assert.deepEqual(next.semanticSpec, lower.semanticSpec);
  assert.deepEqual(next.graphicSpec, lower.graphicSpec);
  assert.deepEqual([item(next).x, item(next).y, item(next).text], [169, 117, "New"]);
  assert.deepEqual(next.trace.children.at(-1).children.map(child => child.op), ["encodeText", "encodeX", "encodeY", "editTextMark"]);
  assert.equal(serializeProgram(p), before);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  assert.equal(item(next.editCanvas({ width: 500 })).x, 209);
});

test("annotation edit retains categorical, temporal and plot-fraction anchor semantics", () => {
  const p = chart().createCanvas().createData({ values: [{ c: "A", day: "2024-01-01" }, { c: "B", day: "2024-01-03" }] })
    .createPointMark().encodeX({ field: "c", fieldType: "nominal" })
    .encodeY({ field: "day", fieldType: "temporal" }).createAnnotation({ id: "note", text: 1.234, x: "A", y: "2024-01-01" });
  const next = p.editAnnotation({ x: "B", y: "2024-01-02", format: ".1f" });
  assert.equal(item(next).text, "1.2");
  const encoding = next.semanticSpec.layers.at(-1).encoding;
  assert.equal(encoding.x.fieldType, "nominal"); assert.equal(encoding.y.fieldType, "temporal");
  assert.equal(encoding.x.scale, "x"); assert.equal(encoding.y.scale, "y");
  const plot = source().createAnnotation({ id: "note", text: "Fraction", space: "plot", x: .5, y: .5 })
    .editAnnotation({ x: .25, y: .75 });
  assert.deepEqual([item(plot).x, item(plot).y], [110, 85]);
  assert.deepEqual([item(plot.editCanvas({ width: 500 })).x, item(plot.editCanvas({ height: 400 })).y], [135, 110]);
});

test("annotation placement, offsets and collision layout keep source-owned membership and cleanup", () => {
  const base = chart().createCanvas().createData({ values: [{ c: "A", v: 2 }, { c: "A", v: 3 }, { c: "B", v: 4 }] })
    .createBarPlot({ x: "c", y: { field: "v", aggregate: "sum" }, guides: false })
    .createAnnotation({ id: "note", text: "Total" });
  const next = base.editAnnotation({ target: "note", text: "Sum", placement: { anchor: "outsideEnd", gap: 8, leader: {} }, dx: 3 });
  assert.equal(next.graphicSpec.objects.note.items.length, 2);
  assert.equal(next.semanticSpec.layers.at(-1).source, "barPlot");
  assert.equal(next.markConfigs.note.labelAuthoring.placement.gap, 8);
  const auto = next.editAnnotation({ placement: "auto", layout: { maxDisplacement: 20, leader: {} } });
  assert.equal(auto.markConfigs.note.labelAuthoring.placement, undefined);
  assert.ok(auto.materializationConfigs.labelLayouts.note);
  const reset = auto.editAnnotation({ layout: false });
  assert.equal(reset.materializationConfigs.labelLayouts?.note, undefined);
  const swapped = auto.editAnnotation({ layout: false, placement: { anchor: "outsideEnd", leader: {} } });
  assert.ok(swapped.markConfigs.note.labelAuthoring.placement.leader);
  assert.equal(swapped.materializationConfigs.labelLayouts?.note, undefined);
  assert.equal(reset.removeMark({ target: "barPlot" }).graphicSpec.objects.note, undefined);
  assert.throws(() => next.editAnnotation({ x: 1 }), /independent Cartesian datum/);
});

test("annotation edits reject ambiguous, encoded or invalid anchors before publishing any child effects", () => {
  const p = source().createAnnotation({ id: "note", text: "Old", x: 2, y: 3 });
  const saved = serializeProgram(p); let calls = 0;
  for (const args of [{}, { target: "note" }, { target: "points", text: "x" }, { text: "" },
    { text: "Changed", x: NaN }, { text: "Changed", opacity: 3 }, { text: "Changed", layout: { target: "points" } },
    { text: "Changed", placement: { anchor: "outsideEnd" } }, { source: "points" }, { space: "screen" },
    { get text() { calls++; return "x"; } }]) assert.throws(() => p.editAnnotation(args));
  assert.equal(calls, 0); assert.equal(serializeProgram(p), saved);
  const rowText = p.createTextMark({ id: "rows", data: "data" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "x" });
  assert.throws(() => rowText.editAnnotation({ x: 1 }), /independent Cartesian datum/);
  assert.throws(() => rowText.editAnnotation({ format: ".1f" }), /constant text/);
  assert.throws(() => p.encodeDx({ target: "note", value: 4 }).editAnnotation({ dx: 5 }), /encoded offset/);
  assert.throws(() => p.encodeY({ target: "note", conditions: [{ when: {version:2,registry:"standard@1",root:{type:"literal",value:true}}, value: { datum: 3 } }], otherwise: { datum: 4 } }).editAnnotation({ x: 1 }), /independent Cartesian datum/);
  const ambiguous = p.createAnnotation({ id: "second", text: "Two", x: 4, y: 5 }).createPointMark({ id: "third", data: "data" });
  assert.throws(() => ambiguous.editAnnotation({ text: "Unknown" }), /ambiguous/);
  assert.equal(ambiguous.editAnnotation({ target: "note", text: "Known" }).graphicSpec.objects.note.items[0].properties.text, "Known");
});

test("annotate commands share native scoped edits, one commit, replay and atomic failures", () => {
  const child = source().createAnnotation({ id: "note", text: "Old", x: 2, y: 3 });
  const p = hconcat({ programs: [{ id: "a", program: child }, { id: "b", program: child }] });
  const session = createInteractionSession({ program: p, bindings: [] }), events = [];
  session.subscribe(event => events.push(event));
  const command = { type: "annotate", target: { childPath: ["a"], id: "note" }, payload: { text: "Changed", x: 4, dx: 8 }, transactionId: "note-1", origin: "user" };
  session.dispatch(command);
  const next = session.getState().program;
  assert.equal(next.children.b, child); assert.equal(item(next.children.a).text, "Changed");
  assert.deepEqual(events.map(event => event.phase), ["commit", "settled"]);
  assert.deepEqual(events[0].affectedOwners, [{ childPath: ["a"], id: "note" }]);
  assert.throws(() => session.dispatch({ ...command, transactionId: "bad", payload: { text: "Partial", opacity: 2 } }));
  assert.throws(() => session.dispatch({ ...command, payload: { target: "points", text: "No" } }), /cannot contain target/);
  assert.equal(session.getState().program, next);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  session.destroy();
  const b = createInteractionSession({ program: basic().createCanvas(), bindings: [] });
  assert.throws(() => b.dispatch({ type: "annotate", target: "note", payload: { text: "No" } }), /editAnnotation/);
  assert.equal(typeof basic().editAnnotation, "undefined"); b.destroy();
});

test("annotation edits preserve selected logical rows and source revision replay", () => {
  const p = source().createAnnotation({ id: "note", text: "Old", x: 2, y: 3 });
  const keys = getMarkItems(p, { target: "note" }).map(item => item.key);
  const selected = p.selectMarks({ id: "picked", target: "note", items: keys })
    .highlightMarks({ selection: "picked", color: "red", dimOthers: false, bringToFront: false });
  const s = createInteractionSession({ program: selected, bindings: [] }), events = []; s.subscribe(event => events.push(event));
  s.dispatch({ type: "annotate", target: "note", payload: { text: "New", x: 5, y: 6, dx: 3 } });
  const next = s.getState().program;
  assert.deepEqual(getMarkItems(next, { target: "note" }).map(item => item.key), keys);
  assert.deepEqual(events[0].selectionChanges, []);
  assert.ok(getMarkItems(next, { target: "note" }).every(item => item.properties.fill === "red"));
  const loaded = deserializeProgram(serializeProgram(next)), changed = loaded.reviseData({ source: "data", id: "revision", values: [{ x: 0, y: 0 }, { x: 20, y: 20 }] });
  assert.equal(changed.semanticSpec.layers.find(layer => layer.id === "note").encoding.x.datum, 5);
  assert.ok(changed.graphicSpec.objects.note.items.every(item => item.properties.text === "New"));
  s.destroy();
});

const geoBase = () => chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" });
const geoValues = (key, x, y) => ({ type: "FeatureCollection", features: [{ type: "Feature", id: key,
  properties: {}, geometry: { type: "Point", coordinates: [x, y] } }] });

test("annotate routes geographic anchors to the native editor with one scoped commit and exact projection replay", () => {
  const child = geoBase().createGeoAnnotation({ id: "note", anchor: { type: "position", position: [30,40] }, text: "Old" });
  const parent = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const s = createInteractionSession({ program: parent, bindings: [] }), events = []; s.subscribe(event => events.push(event));
  const target = { childPath: ["left"], id: "note" }, payload = { anchor: { type: "position", position: [80,90] }, text: "New", dx: 3, dy: -4 };
  s.dispatch({ type: "annotate", target, payload });
  const next = s.getState().program, expected = parent.editGeoAnnotation({ target, ...payload });
  assert.deepEqual(next.graphicSpec, expected.graphicSpec); assert.equal(next.children.right, child);
  assert.deepEqual([item(next.children.left).x, item(next.children.left).y, item(next.children.left).text], [83,86,"New"]);
  assert.deepEqual(events.map(event => event.phase), ["commit","settled"]);
  assert.deepEqual(events[0].affectedOwners, [{ childPath: ["left"], id: "note" }]);
  const restored = deserializeProgram(serializeProgram(next)).editProjection({ target: { childPath: ["left"], id: "map" }, scalePx: 2 });
  assert.deepEqual([item(restored.children.left).x, item(restored.children.left).y], [163,176]);
  assert.deepEqual(child.semanticSpec.layers[0].geoBinding.anchor.position, [30,40]);
  const before = serializeProgram(next), trace = next.trace;
  for (const patch of [{x:2},{layout:false},{anchor:{type:"position",position:[NaN,1]}},{anchor:{type:"feature",key:"missing"}},{target:"other",text:"Bad"}]) {
    assert.throws(() => s.dispatch({ type: "annotate", target, payload: {text:"Partial",...patch} }));
    assert.equal(s.getState().program, next); assert.equal(next.trace, trace); assert.equal(serializeProgram(next), before);
  }
  assert.deepEqual(events.map(event => event.phase), ["commit","settled","error","error","error","error","error"]); s.destroy();
});

test("geographic annotation commands retain original feature level and selection through detail and source revisions", () => {
  const p = geoBase()
    .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id", values: geoValues("s",100,100) })
    .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id", values: geoValues(1,10,20) })
    .createGeoLODData({ id: "regions", levels: [{id:"state",geometry:"states"},{id:"county",geometry:"counties",enterZoom:4.2,exitZoom:3.8,parents:[{key:1,parent:"s"}]}], zoom: 5 })
    .createGeoAnnotation({ id: "note", anchor: {type:"feature",geometry:"regions",key:1}, text: "County" });
  const key = getMarkItems(p,{target:"note"})[0].key;
  const selected = p.selectMarks({id:"picked",target:"note",items:[key]}).highlightMarks({selection:"picked",color:"red",dimOthers:false});
  const s = createInteractionSession({program:selected,bindings:[]}), events=[];s.subscribe(e=>events.push(e));
  s.dispatch({type:"annotate",target:"note",payload:{text:"County one",dx:4,dy:-3}});
  let next=s.getState().program;
  assert.equal(next.semanticSpec.layers[0].geoBinding.anchor.level,"county"); assert.deepEqual(events[0].selectionChanges,[]);
  next=next.editGeoLODData({target:"regions",zoom:0}).editGeometryData({target:"counties",values:geoValues(1,15,25)});
  s.updateProgram(deserializeProgram(serializeProgram(next)));
  assert.deepEqual([item(s.getState().program).x,item(s.getState().program).y],[19,22]);
  assert.equal(getMarkItems(s.getState().program,{target:"note"})[0].key,key);
  assert.equal(item(s.getState().program).fill,"red");assert.deepEqual(events.at(-1).selectionChanges,[]);
  const saved=s.getState().program;
  assert.throws(()=>s.dispatch({type:"annotate",target:"note",payload:{anchor:{type:"feature",geometry:"regions",key:"1",level:"county"}}}),/feature key/);
  assert.equal(s.getState().program,saved);s.destroy();
});
