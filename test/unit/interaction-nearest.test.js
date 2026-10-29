import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { resolveStoredSelection } from "../../src/materialization/selection/state.js";
import { nearestDataKey, normalizeNearestSelection, nearestSelectionBudget } from "../../src/grammar/nearestSelection.js";
import { prepareHitShape, nearestHitShape, hitShape } from "../../src/grammar/hitShapes.js";
import { prepareHitIndex, nearestHitIndex } from "../../src/grammar/hitIndex.js";
import { cloneAndFreeze } from "../../src/core/immutable.js";

const rows = [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 3 }, { id: "c", x: 3, y: 4 }];
const base = () => chart().createCanvas({ width: 300, height: 200 }).createData({ id: "rows", keyField: "id", values: rows })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" }).selectMarks({ id: "picked", items: [] });
const data = (values = [2, 3], extra = {}) => ({ space: "data", fields: ["x", "y"], values, metric: "euclidean", maxDistance: 10, ...extra });
const screen = (point, maxDistance = 10, extra = {}) => ({ space: "screen", point, maxDistance, ...extra });
const choose = (nearest, extra = {}, target = "points") => ({ type: "select", target, payload: { id: "picked", nearest, ...extra } });
const ids = program => { const resolved = resolveStoredSelection(program, "picked"), keys = new Set(resolved.keys); return resolved.items.filter(item => keys.has(item.key)).map(item => item.fields.id); };
const item = (key, fields) => ({ key, fields });
const identity = [1, 0, 0, 1, 0, 0];
const shape = (geometry, overrides = {}) => prepareHitShape({ geometry, paint: { fill: true, stroke: null, opacity: 1 }, transform: identity, clips: [], ...overrides });
const box = { type: "rect", rect: { x: 0, y: 0, width: 10, height: 10 } };

test("numeric nearest uses explicit metrics, stable keys and finite raw tuple units", () => {
  const items = [item("b", { x: 3, y: 4 }), item("a", { x: -3, y: -4 }), item("c", { x: 6, y: 0 })];
  assert.deepEqual(nearestDataKey(items, data([0, 0])), { key: "a", distance: 5 });
  assert.deepEqual(nearestDataKey(items, data([0, 0], { metric: "manhattan" })), { key: "c", distance: 6 });
  assert.equal(nearestDataKey(items, data([0, 0], { maxDistance: 4.999 })), null);
  assert.deepEqual(nearestDataKey(items, data([0, 0], { maxDistance: 5 })), { key: "a", distance: 5 });
  assert.equal(nearestDataKey([], data()), null);
  const original = structuredClone(items); nearestDataKey(items, data()); assert.deepEqual(items, original); assert.equal(Object.isFrozen(items), false);
  assert.deepEqual(nearestDataKey([item("large", { x: 3e150, y: 4e150 })], data([0, 0], { maxDistance: 6e150 })), { key: "large", distance: 5e150 });
  assert.throws(() => nearestDataKey([item("overflow", { x: Number.MAX_VALUE, y: 0 })], data([-Number.MAX_VALUE, 0])), /finite/);
});

test("nearest numeric validation covers inactive items, null, missing grain, accessors and cumulative work", () => {
  for (const invalid of [null, undefined, "1", NaN, Infinity, [], {}]) assert.throws(() => nearestDataKey([item("good", { x: 2, y: 3 }), item("bad", { x: invalid, y: 0 })], data()));
  for (const items of [[{}], [item("", {})], [item("a", {}), item("a", {})], [{ key: "a" }], [item("a", { y: 1 })]]) assert.throws(() => nearestDataKey(items, data()));
  let reads = 0; const fields = { y: 0 }; Object.defineProperty(fields, "x", { enumerable: true, get() { reads++; return 0; } });
  assert.throws(() => nearestDataKey([item("bad", fields)], data()), /accessors/); assert.equal(reads, 0);
  const budget = nearestSelectionBudget(); budget(9_999_999); assert.throws(() => nearestDataKey([item("a", { x: 1, y: 1 })], data(), budget), /work/);
  assert.throws(() => nearestDataKey([], screen({ x: 0, y: 0 })), /data space/);
  for (const invalid of [null, {}, { ...data(), space: "unknown" }, { ...data(), metric: "cosine" }, { ...data(), maxDistance: -1 },
    { ...data(), maxDistance: Infinity }, { ...data(), values: [1] }, { ...data(), fields: ["x", "x"] }, { ...data(), fields: ["", "y"] },
    { ...data(), fields: [] }, { ...data(), fields: Array(65).fill("x") }, { ...data(), fields: null }, { ...data(), values: null }, { ...data(), values: Array(65).fill(1) }, { ...data(), fields: ["x".repeat(1025), "y"] },
    { ...data(), values: [NaN, 1] }, { ...data(), hitInvisible: false }, { ...screen({ x: 0, y: 0 }), hitInvisible: null },
    { ...screen({ x: 0, y: 0 }), point: { x: NaN, y: 0 } }]) assert.throws(() => normalizeNearestSelection(invalid));
});

test("screen nearest measures fill edges, implicit path closure and dash footprints without changing inspection", () => {
  const rectangle = shape(box), query = { x: 13, y: 14 };
  assert.equal(hitShape(rectangle, query, { slop: 5 }).hit, false);
  assert.equal(nearestHitShape(rectangle, query, { slop: 5 }).distance, 5);
  assert.equal(nearestHitShape(rectangle, query, { slop: 4.99 }).hit, false);
  const triangle = shape({ type: "path", fillRule: "nonzero", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 10, y: 0 }, { op: "L", x: 10, y: 10 }] });
  assert.ok(Math.abs(nearestHitShape(triangle, { x: 2, y: 4 }, { slop: 2 }).distance - Math.SQRT2) < 1e-10);
  const dashed = shape({ type: "line", from: { x: 0, y: 0 }, to: { x: 30, y: 0 } }, { paint: { fill: false, stroke: { width: 2, dash: [4, 8] }, opacity: 1 } });
  assert.equal(nearestHitShape(dashed, { x: 8, y: 0 }, { slop: 3.99 }).hit, false);
  assert.equal(nearestHitShape(dashed, { x: 8, y: 0 }, { slop: 4 }).distance, 4);
  for (const geometry of [{ type: "circle", x: 0, y: 0, radius: 0 }, { ...box, rect: { ...box.rect, width: 0 } }]) assert.equal(nearestHitShape(shape(geometry), { x: 0, y: 0 }, { slop: 10 }).hit, false);
});

test("nearest preserves holes, CSS negative scales, clip admission and invisible policy", () => {
  const ring = points => points.map(([x, y], i) => ({ op: i ? "L" : "M", x, y })).concat({ op: "Z" });
  const hole = shape({ type: "path", fillRule: "evenodd", commands: [...ring([[0, 0], [10, 0], [10, 10], [0, 10]]), ...ring([[3, 3], [7, 3], [7, 7], [3, 7]])] });
  assert.equal(nearestHitShape(hole, { x: 5, y: 5 }, { slop: 2 }).distance, 2);
  const rotated = shape(box, { transform: [0, -2, -2, 0, 40, 40], clips: [{ geometry: { ...box, rect: { x: -10, y: -10, width: 30, height: 30 } }, transform: identity }] });
  assert.equal(nearestHitShape(rotated, { x: 18, y: 18 }, { slop: 3 }).hit, true);
  assert.equal(nearestHitShape(rotated, { x: 21, y: 21 }, { slop: 30 }).hit, false);
  const invisible = shape(box, { paint: { fill: true, stroke: null, opacity: 0 } });
  assert.equal(nearestHitShape(invisible, { x: 5, y: 5 }, { slop: 0 }).hit, false);
  assert.equal(nearestHitShape(invisible, { x: 5, y: 5 }, { slop: 0, hitInvisible: true }).distance, 0);
});

test("nearest spatial index chooses distance then stable key within exact owner, path and grain", () => {
  const metadata = (key, overrides = {}) => ({ itemKey: key, ownerId: "points", role: "mark", childPath: [], rowKeys: [], resourceRefs: [], ...overrides });
  const records = [metadata("z"), metadata("b"), metadata("a"), metadata("a", { ownerId: "other" }), metadata("a", { childPath: ["child"] }), metadata("a")];
  const scene = cloneAndFreeze({ version: 2, nodes: records.map((_, i) => ({ key: String(i) })) });
  const sameShape = shape(box), entries = records.map((metadata, i) => ({ nodeKey: String(i), metadata, shape: sameShape, zIndex: i }));
  const index = prepareHitIndex(scene, entries), options = { ownerId: "points", childPath: [], itemKeys: ["z", "b", "a"], maxDistance: 10 };
  const result = nearestHitIndex(index, scene, { x: 13, y: 14 }, options);
  assert.deepEqual(result.candidates.map(c => [c.itemKey, c.zIndex, c.distance]), [["a", 5, 5], ["b", 1, 5], ["z", 0, 5]]);
  assert.equal(nearestHitIndex(index, scene, { x: 5, y: 5 }, { ...options, itemKeys: ["b"] }).target.itemKey, "b");
  for (const invalid of [{}, { ...options, extra: 1 }, { ...options, maxDistance: undefined }, { ...options, itemKeys: ["a", "a"] }]) assert.throws(() => nearestHitIndex(index, scene, { x: 0, y: 0 }, invalid));
  assert.throws(() => nearestHitIndex(index, cloneAndFreeze(structuredClone(scene)), { x: 0, y: 0 }, options), /stale/);
  assert.throws(() => nearestHitIndex(index, scene, { x: 0, y: 0 }, { ...options, itemKeys: ["x".repeat(2_000_001)] }), /work/);
});

test("nearest commands reuse native modes, clear misses, codec and atomic linked transactions", () => {
  const original = base(), session = createInteractionSession({ program: original, bindings: [] }), events = [];
  session.subscribe(e => events.push(e)); session.dispatch(choose(data())); assert.deepEqual(ids(session.getState().program), ["b"]);
  session.dispatch(choose(data([1, 2]), { mode: "add" })); assert.deepEqual(ids(session.getState().program), ["a", "b"]);
  session.dispatch(choose(data(), { mode: "toggle" })); assert.deepEqual(ids(session.getState().program), ["a"]);
  session.dispatch(choose(data([3, 4]), { mode: "intersect" })); assert.deepEqual(ids(session.getState().program), []);
  session.dispatch(choose(data())); session.dispatch(choose(data(), { mode: "subtract" })); assert.deepEqual(ids(session.getState().program), []);
  session.dispatch(choose(data([100, 100], { maxDistance: 0 }))); assert.deepEqual(ids(session.getState().program), []);
  assert.deepEqual(ids(original), []); assert.deepEqual(ids(deserializeProgram(serializeProgram(session.getState().program))), []);
  assert.equal(events.length, 14); assert.equal(session.getState().revision, 7); session.destroy();
  const composite = hconcat({ programs: [{ id: "left", program: original }, { id: "right", program: original }] });
  const linked = createInteractionSession({ program: composite, bindings: [{ type: "linkSelection", id: "link", sources: [{ target: { childPath: ["left"], id: "points" }, selection: "picked", projection: { type: "rows", sourceData: "rows", targetData: "rows" } }], target: { childPath: ["right"], id: "points" }, selection: "picked", resolve: "global" }] });
  linked.dispatch(choose(data(), {}, { childPath: ["left"], id: "points" }));
  assert.deepEqual(ids(linked.getState().program.children.right), ["b"]); assert.equal(linked.getState().revision, 1); linked.destroy();
});

test("screen commands use accepted sampled geometry and explicit child namespaces", () => {
  const original = base(), session = createInteractionSession({ program: original, bindings: [] });
  const state = session.getState(), sampled = structuredClone(state.scene), first = sampled.nodes.find(node => node.type === "circle");
  const point = { x: first.properties.x + 25, y: first.properties.y }; first.properties.x += 25;
  session.dispatch({ type: "frame", scene: sampled, version: 8, generation: 0 });
  session.dispatch(choose(screen(point, 0))); assert.deepEqual(ids(session.getState().program), ["a"]);
  assert.equal(session.getState().frameVersion, 9); assert.equal(session.getState().hit, null);
  session.dispatch(choose(screen(point, 0))); assert.deepEqual(ids(session.getState().program), []); session.destroy();
  const nested = hconcat({ programs: [{ id: "inner", program: hconcat({ programs: [{ id: "left", program: original }, { id: "right", program: original }] }) }, { id: "other", program: original }] });
  const child = createInteractionSession({ program: nested, bindings: [] }), circle = child.getState().scene.nodes.find(node => node.type === "circle");
  child.dispatch(choose(screen({ x: circle.properties.x, y: circle.properties.y }, 0), {}, { childPath: ["inner", "left"], id: "points" }));
  assert.deepEqual(ids(child.getState().program.children.inner.children.left), ["a"]); child.destroy();
});

test("nearest malformed commands and unsupported owner grains fail without partial state", () => {
  const original = base(), session = createInteractionSession({ program: original, bindings: [] }), events = []; session.subscribe(e => events.push(e));
  for (const command of [choose(data([NaN, 1])), choose({ ...data(), fields: ["id", "y"] }), choose(data(), { id: "absent" }),
    choose(data(), { select: { items: [] } }), { type: "select", target: "points", payload: { id: "picked" } },
    choose(data(), {}, "missing")]) {
    assert.throws(() => session.dispatch(command)); assert.equal(session.getState().program, original); assert.equal(session.getState().revision, 0);
  }
  assert.ok(events.every(e => e.phase === "error")); session.destroy();
  const basicSession = createInteractionSession({ program: basic().createCanvas(), bindings: [] });
  assert.throws(() => basicSession.dispatch(choose(data())), /Full selection owner/); basicSession.destroy();
  const facet = base().facet({ field: "id" });
  const facetSession = createInteractionSession({ program: facet, bindings: [] }), target = { childPath: [], id: "points", facetSource: true };
  facetSession.dispatch(choose(data(), {}, target)); assert.deepEqual(resolveStoredSelection(facetSession.getState().program, "picked", { sourceOnly: true }).items.filter(item => resolveStoredSelection(facetSession.getState().program, "picked", { sourceOnly: true }).keys.includes(item.key)).map(item => item.fields.id), ["b"]);
  assert.throws(() => facetSession.dispatch(choose(screen({ x: 0, y: 0 }), {}, target)), /facet source/); facetSession.destroy();
});

test("nearest excludes fully clipped geometry and measures only admitted boundary intervals", () => {
  const clips = [{ geometry: box, transform: identity }], query = { x: 5, y: 5 };
  const outside = shape({ ...box, rect: { x: 20, y: 0, width: 10, height: 10 } }, { clips });
  assert.equal(nearestHitShape(outside, query, { slop: 100 }).hit, false);
  const triangle = { type: "path", fillRule: "nonzero", commands: [{ op: "M", x: 0, y: 0 }, { op: "L", x: 20, y: 0 }, { op: "L", x: 20, y: 20 }, { op: "Z" }] };
  const clipped = shape(triangle, { clips: [{ geometry: { ...box, rect: { x: 0, y: 0, width: 10, height: 20 } }, transform: identity }] });
  // The unconstrained nearest point (12,12) is hidden. The visible corner is (10,10).
  assert.ok(Math.abs(nearestHitShape(clipped, { x: 8, y: 16 }, { slop: 7 }).distance - Math.sqrt(40)) < 1e-10);
  assert.equal(nearestHitShape(clipped, { x: 8, y: 16 }, { slop: 6 }).hit, false);
  let spent = 0;
  assert.throws(() => nearestHitShape(clipped, { x: 8, y: 16 }, { slop: 100 }, amount => { if ((spent += amount) > 50) throw new RangeError("work limit"); }), /work limit/);
});


test("clipped stroke interiors stay zero-distance and index clip work is cumulative", () => {
  const stroke = shape({ type:"line", from:{x:0,y:5}, to:{x:30,y:5} }, {paint:{fill:false,stroke:{width:2},opacity:1}, clips:[{geometry:box,transform:identity}]});
  const scene=cloneAndFreeze({version:2,nodes:[{key:"stroke"}]}), metadata={itemKey:"stroke",ownerId:"points",role:"mark",childPath:[],rowKeys:[],resourceRefs:[]};
  const index=prepareHitIndex(scene,[{nodeKey:"stroke",shape:stroke,metadata,zIndex:0}]);
  const options={ownerId:"points",childPath:[],itemKeys:["stroke"],maxDistance:5};
  assert.equal(nearestHitIndex(index,scene,{x:5,y:5},options).target.distance,0);
  assert.equal(nearestHitIndex(index,scene,{x:5,y:2},options).target.distance,2);
  const budgeted=nearestHitIndex(index,scene,{x:5,y:2},options);assert.ok(budgeted.statistics.work>100);
});

test("nearest spatial queries agree with an independent rectangle distance oracle", () => {
  const positions=Array.from({length:64},(_,i)=>({key:`k${String(i).padStart(2,'0')}`,x:(i%8)*20,y:Math.floor(i/8)*20}));
  const scene=cloneAndFreeze({version:2,nodes:positions.map(p=>({key:p.key}))});
  const entries=positions.map((p,i)=>({nodeKey:p.key,zIndex:63-i,shape:shape({...box,rect:{x:p.x,y:p.y,width:10,height:10}}),metadata:{itemKey:p.key,ownerId:'points',role:'mark',childPath:[],rowKeys:[],resourceRefs:[]}}));
  const index=prepareHitIndex(scene,entries),options={ownerId:'points',childPath:[],itemKeys:positions.map(p=>p.key),maxDistance:8};
  for(let i=0;i<50;i++){
    const point={x:(i*37)%180-10,y:(i*29)%180-10};
    const expected=positions.map(p=>({key:p.key,distance:Math.hypot(Math.max(p.x-point.x,0,point.x-p.x-10),Math.max(p.y-point.y,0,point.y-p.y-10))}))
      .filter(p=>p.distance<=8).sort((a,b)=>a.distance-b.distance||(a.key<b.key?-1:1));
    const actual=nearestHitIndex(index,scene,point,options);
    assert.deepEqual(actual.candidates.map(p=>({key:p.itemKey,distance:p.distance})),expected);
    assert.ok(actual.statistics.tested<8);
  }
});

test("screen nearest uses CSS root transform and preserves prior frame on validation failure", () => {
  const session=createInteractionSession({program:base(),bindings:[]});
  const surface={addEventListener(){},removeEventListener(){},getBoundingClientRect(){return {left:10,top:20,width:300,height:200};}};
  session.mount(surface,{rootTransform:[0,-2,-2,0,400,400]});
  const node=session.getState().scene.nodes.find(node=>node.type==='circle');
  session.dispatch(choose(screen({x:400-2*node.properties.y,y:400-2*node.properties.x},0)));
  assert.deepEqual(ids(session.getState().program),['a']);
  const before=session.getState();assert.throws(()=>session.dispatch(choose(data([2,3],{fields:['missing','y']}))));
  assert.equal(session.getState().scene,before.scene);assert.equal(session.getState().program,before.program);
  assert.equal(session.getState().generation,before.generation);assert.equal(session.getState().frameVersion,before.frameVersion);session.destroy();
});
