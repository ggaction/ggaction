import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { normalizeScreenAnnotationAnchor, validateScreenAnnotationLayer } from "../../src/grammar/screenAnnotation.js";
import { prepareProgramHitFrame } from "../../src/interaction/hitProgram.js";
import { validateGraphicIdentity } from "../../src/grammar/schemas/graphicIdentity.js";
const screen = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createAnnotation({ id: "note", space: "screen", x: 12, y: 23, text: "Screen", dx: 2, dy: -3 });
const graphic = p => p.graphicSpec.objects.note.items[0];

test("screen annotation owns one stable rowless Text item without synthetic resources", () => {
  const input = Object.freeze({ id: "note", space: "screen", x: 12, y: 23, text: 1.234, format: ".1f", dx: 2, dy: -3 });
  const before = chart().createCanvas({ width: 300, height: 200, margin: 20 }), saved = serializeProgram(before);
  const p = before.createAnnotation(input), item = getMarkItems(p, { target: "note" })[0];
  assert.deepEqual(p.semanticSpec.datasets, []); assert.deepEqual(p.semanticSpec.scales, []); assert.deepEqual(p.semanticSpec.coordinates, []);
  assert.deepEqual(p.semanticSpec.layers[0].annotationAnchor, { space: "screen", x: 12, y: 23 });
  assert.deepEqual([graphic(p).properties.x, graphic(p).properties.y, graphic(p).properties.text], [14, 20, "1.2"]);
  assert.equal(item.key, '[[],"note","item",["annotation","screen"]]'); assert.deepEqual(item.rows, []);
  assert.deepEqual(graphic(p).identity.lineage, { kind: "screen" });
  assert.ok(p.graphicSpec.objects.canvas.children.includes("note"));
  assert.equal(serializeProgram(before), saved);
  const moved = p.editAnnotation({ x: -8, y: 35, text: "Moved", format: "auto", dx: 4, fill: "red" });
  assert.deepEqual([graphic(moved).properties.x, graphic(moved).properties.y, graphic(moved).properties.text], [-4, 32, "Moved"]);
  assert.equal(getMarkItems(moved, { target: "note" })[0].key, item.key);
  assert.deepEqual(deserializeProgram(serializeProgram(moved)).graphicSpec, moved.graphicSpec);
  const laidOut = moved.editAnnotation({ layout: { maxDisplacement: 0, leader: false } });
  assert.deepEqual(laidOut.editAnnotation({ layout: false }).graphicSpec, moved.graphicSpec);
  assert.deepEqual(graphic(moved.editCanvas({ width: 640, height: 400, margin: 50 })).properties, graphic(moved).properties);
});

test("screen annotation keeps local namespace, rowless hit and selection through immutable commands", () => {
  const child = screen(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const session = createInteractionSession({ program: p, bindings: [] }), events = [];
  session.subscribe(event => events.push(event.phase));
  const frame = prepareProgramHitFrame(p), left = frame.entries.find(entry => entry.metadata.childPath[0] === "left");
  assert.deepEqual(left.metadata.rowKeys, []); assert.deepEqual(left.metadata.resourceRefs, []);
  assert.deepEqual(left.metadata.childPath, ["left"]);
  const key = getMarkItems(p, { target: { childPath: ["left"], id: "note" } })[0].key;
  session.dispatch({ type: "annotate", target: { childPath: ["left"], id: "note" }, payload: { x: 50, y: 70, text: "Moved" } });
  assert.deepEqual(events, ["commit", "settled"]);
  assert.equal(session.getState().program.children.right, p.children.right);
  assert.equal(getMarkItems(session.getState().program, { target: { childPath: ["left"], id: "note" } })[0].key, key);
  assert.deepEqual(deserializeProgram(serializeProgram(session.getState().program)).graphicSpec, session.getState().program.graphicSpec);
  const selected = child.selectMarks({ id: "chosen", target: "note", items: [getMarkItems(child,{target:"note"})[0].key] })
    .highlightMarks({ selection: "chosen", color: "red" });
  assert.equal(graphic(selected).properties.fill, "red");
  assert.equal(graphic(selected.editAnnotation({ target: "note", x: 30 })).properties.fill, "red");
  session.destroy();
});

test("screen anchors reject mixed data intent, invalid values and forged lineage atomically", () => {
  const before = chart().createCanvas(), p = screen(), saved = serializeProgram(p); let calls = 0;
  for (const patch of [{ source: "x" }, { data: "x" }, { coordinate: "x" }, { select: { items: [] } }, { selection: "x" },
    { x: NaN }, { y: Infinity }, { x: "12" }, { x: undefined }, { text: "" }]) {
    assert.throws(() => before.createAnnotation({ space: "screen", x: 12, y: 23, text: "Screen", ...patch }));
  }
  const accessor = { space: "screen", get x() { calls++; return 12; }, y: 23, text: "x" };
  assert.throws(() => before.createAnnotation(accessor)); assert.equal(calls, 0);
  assert.throws(() => p.editAnnotation({ x: Number.MAX_VALUE, dx: Number.MAX_VALUE }));
  for (const operation of [() => p.editAnnotation({ x: Infinity }), () => p.editAnnotation({ all: true }),
    () => p.editAnnotation({ placement: { anchor: "outsideEnd" } }), () => p.encodeText({ field: "x" }),
    () => p.encodeX({ datum: 1 }), () => p.encodeDx({ value: 2 }),
    () => p.editSemantic({ property: "layer[note].data", value: "unknown" })]) assert.throws(operation);
  assert.equal(serializeProgram(p), saved);
  for (const anchor of [null, {}, { space: "screen", x: 1, y: 2, extra: 1 }, { space: "plot", x: 1, y: 2 }]) assert.throws(() => normalizeScreenAnnotationAnchor(anchor));
  for (const layer of [{ mark: { type: "point" } }, { data: "data" }, { encoding: { text: { field: "a" } } }, { conditionals: {} }]) {
    assert.throws(() => validateScreenAnnotationLayer({ ...p.semanticSpec.layers[0], ...layer }));
  }
  const identity = graphic(p).identity;
  assert.throws(() => validateGraphicIdentity({ ...identity, lineage: { kind: "screen", data: "fake" } }));
  assert.throws(() => validateGraphicIdentity({ ...identity, key: '[[],"note","item",["other","key"]]' }));
  const forged = p.editGraphics({ target: "note", property: "items", value: [{ type: "text", properties: graphic(p).properties,
    identity: { ...identity, key: '[[],"missing","item",["annotation","screen"]]' } }] });
  assert.throws(() => serializeProgram(forged), /missing|Unknown/);
  assert.throws(() => chart().createCanvas().createTextMark({ text: "Still requires data" }), /data/i);
});

test("screen annotation stays fixed beside data replay and in each facet canvas", () => {
  const p = chart().createCanvas({width:300,height:200,margin:20}).createData({values:[{g:"A",x:1,y:2},{g:"B",x:3,y:4}]})
    .createPointMark().encodeX({field:"x"}).encodeY({field:"y"})
    .createAnnotation({ id:"note",space:"screen",x:5,y:7,text:"Corner",clip:true });
  assert.deepEqual(p.graphicSpec.objects.note.clip,{x:0,y:0,width:300,height:200});
  const changed=p.reviseData({source:"data",id:"revised",values:[{g:"A",x:100,y:200},{g:"B",x:300,y:400}]});
  assert.deepEqual(graphic(changed),graphic(p));
  const faceted=p.facet({field:"g"});
  for(const child of Object.values(faceted.children)) {
    assert.deepEqual([graphic(child).properties.x,graphic(child).properties.y],[5,7]);
    assert.equal(child.semanticSpec.layers.find(layer=>layer.id==="note").data,undefined);
  }
  assert.deepEqual(deserializeProgram(serializeProgram(faceted)).graphicSpec,faceted.graphicSpec);
});


test("screen Text retains prepared font identity and native effects with atomic metric rejection", async () => {
  const p=screen().editAnnotation({text:"AB",outline:{color:"white",width:2},shadow:{color:"black",blurRadius:2,offsetX:3,offsetY:4},rotation:0.2});
  const bytes=new Uint8Array(readFileSync(new URL("../fixtures/fonts/metric-fixture.ttf",import.meta.url)));
  const expectedHash=createHash("sha256").update(bytes).digest("hex");
  const decode=value=>Object.fromEntries(["contentHash","family","style","weight","metricsProviderVersion"].map(key=>[key,value[key]]));
  const prepared=await prepareFontResource(p,{kind:"create",id:"font",uri:"fixture:screen",expectedHash,mimeType:"font/ttf",family:"sans-serif",style:"normal",weight:400,metricsProviderVersion:"fixture@1"},
    {requestToken:"font",load:()=>({bytes,mimeType:"font/ttf"}),decode});
  const bound=p.createFontResource({prepared,requestToken:"font"});
  const metrics=await prepareTextMetrics(bound,{id:"exact",fonts:["font"]},{requestToken:"metrics",decode,measure:({asset,queries})=>({contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,
    widths:queries.map(({text,fontSize})=>[...text].reduce((sum,letter)=>sum+({A:.6,B:.8}[letter]??0),0)*fontSize)})});
  const exact=bound.applyTextMetrics({prepared:metrics,requestToken:"metrics"}),before=serializeProgram(exact);
  assert.equal(graphic(exact).properties.font.contentHash,expectedHash);
  assert.deepEqual(graphic(exact).properties.outline,{color:"white",width:2});
  assert.equal(graphic(exact).properties.shadow.blurRadius,2);
  const moved=exact.editAnnotation({x:50});assert.equal(graphic(moved).properties.font.contentHash,expectedHash);
  assert.throws(()=>exact.editAnnotation({text:"ABA"}),error=>error.assetCode==="metrics-required");
  assert.equal(serializeProgram(exact),before);assert.deepEqual(deserializeProgram(before).graphicSpec,exact.graphicSpec);
});
