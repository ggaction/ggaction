import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { exportTransitionPlan, restoreTransitionPlan } from "../../../src/animation/planner.js";
import { animationFrameProvenance } from "../../../src/animation/frameProvenance.js";

const values = [{ id: 1, x: 1, y: 2, end: 3, category: "A" }, { id: "1", x: 4, y: 6, end: 8, category: "B" }];
const base = () => chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: "rows", values, keyField: "id" });
const plan = (from, to) => planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
const revise = p => p.reviseData({ source: "rows", id: "next", values: values.map(row => ({ ...row, x: row.x + 2, y: row.y + 2, end: row.end + 2 })) });

test("horizontal rules, bars and area ranges retain native scale meaning", () => {
  const programs = [
    base().createRuleMark({ id: "m" }).encodeY({ field: "y", fieldType: "quantitative" }),
    base().createRuleMark({ id: "m" }).encodeY({ field: "y", fieldType: "quantitative" }).encodeX({ field: "x", fieldType: "quantitative" }).encodeX2({ field: "end", fieldType: "quantitative" }),
    base().createBarMark({ id: "m" }).encodeY({ field: "category", fieldType: "nominal" }).encodeX({ field: "x", aggregate: "sum" }),
    base().createAreaMark({ id: "m" }).encodeY({ field: "y", fieldType: "quantitative" }).encodeXRange({ lower: "x", upper: "end", fieldType: "quantitative" }),
    base().createRectMark({ id: "m", cornerRadius: 3 }).encodeXRange({ lower: "x", upper: "end", fieldType: "quantitative" }).encodeYRange({ lower: "y", upper: "end", fieldType: "quantitative" })
  ];
  for (const from of programs) {
    const prepared = plan(from, revise(from)), frame = sampleTransition(prepared, 50);
    assert.ok(prepared.tracks.every(track => track.kind === "semantic-cartesian"));
    assert.ok(frame.decisions.filter(decision => decision.itemKey !== undefined).every(decision => decision.kernel === "cartesian-geometry"));
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(prepared)).plan, 50), frame);
  }
});

test("nested point and Cartesian plans retain typed row keys through repeated rebasing", () => {
  const line = base().createLineMark({ id: "m" }).encodeX({ field: "x", fieldType: "quantitative" }).encodeY({ field: "y", fieldType: "quantitative" });
  const points = base().createPointMark({ id: "m" }).encodeX({ field: "x", fieldType: "quantitative" }).encodeY({ field: "y", fieldType: "quantitative" });
  const combine = (a,b) => hconcat({ id: "outer", programs: [{ id: "series", program: a }, { id: "points", program: b }] });
  const from = combine(line,points), to = combine(revise(line),revise(points));
  let prepared = plan(from,to), frame;
  for (let i = 0; i < 25; i++) {
    frame = sampleTransition(prepared, 40);
    assert.ok(frame.decisions.some(decision => decision.kernel === "cartesian-geometry"));
    assert.ok(frame.decisions.some(decision => decision.kernel === "cartesian-point"));
    const proof = animationFrameProvenance(frame);
    assert.equal(Object.hasOwn(proof,"plan"),false);
    assert.equal(proof.cartesian.length,frame.scene.nodes.length);
    const next = plan(frame,i%2 ? to : from);
    assert.equal(sampleTransition(next,0),frame);
    prepared = next;
  }
  const saved = deserializeAnimation(serializeAnimation(prepared)).plan;
  for (const time of [0,20,50,100]) assert.deepEqual(sampleTransition(saved,time),sampleTransition(prepared,time));
});

test("strict Cartesian restore rejects forged meaning and unsupported kernel before sampling", () => {
  const from = base().createLineMark({ id: "m" }).encodeX({ field: "x", fieldType: "quantitative" }).encodeY({ field: "y", fieldType: "quantitative" });
  const prepared = plan(from,revise(from)), payload = exportTransitionPlan(prepared);
  const index = payload.from.cartesian.findIndex(state => state.kind === "line");
  const changes = [
    v => { v.kernels.cartesian = "future"; }, v => { delete v.kernels.cartesian; },
    v => { v.from.cartesian.pop(); }, v => { v.from.cartesian[index].points[0].x.value++; },
    v => { v.from.cartesian[index].grid[0] = ["foreign"]; }, v => { v.from.cartesian[index].policy.extra = 1; },
    v => { v.from.cartesian[index].kind = "future"; }, v => { v.from.cartesian[index].points[0].x.scale.domain = [1,2,3]; },
    v => { v.from.cartesian[index] = { reason: "anonymous" }; }, v => { v.from.cartesian[index].radius = {}; },
    v => { v.from.cartesian[index].points[0].x.value = Infinity; }
  ];
  for (const change of changes) {
    const value = structuredClone(payload);change(value);
    assert.throws(() => restoreTransitionPlan(value),change.toString());
  }
  let reads = 0;
  const getter = structuredClone(payload);
  Object.defineProperty(getter.from.cartesian[index].points[0],"x",{ enumerable:true,get(){ reads++;return {}; } });
  assert.throws(() => restoreTransitionPlan(getter),/accessors/);assert.equal(reads,0);
  const current = sampleTransition(prepared,50), rebased = exportTransitionPlan(plan(current,from));
  const decision = rebased.from.view.decisions.find(value => value.kernel === "cartesian-geometry");
  decision && assert.ok(Object.isFrozen(decision));
  const broken = structuredClone(rebased);broken.from.view.decisions.find(value => value.kernel === "cartesian-geometry").kernel = "cartesian-point";
  assert.throws(() => restoreTransitionPlan(broken));
  assert.deepEqual(sampleTransition(restoreTransitionPlan(payload),50),current);
});
