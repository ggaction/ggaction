import { chart } from "../../src/index.js";
import { planTransition } from "../../src/animation/planner.js";
import { sampleTransition } from "../../src/animation/sample.js";

export function animationPointFrame(rebased = false) {
  const from = chart().createCanvas({ width: 300, height: 200, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 50 }] })
    .createPointMark({ id: "points", fill: "red" })
    .encodeX({ field: "x", scale: { id: "x", type: "log", domain: [1, 1000], nice: false } })
    .encodeY({ field: "y", scale: { id: "y", domain: [0, 100], nice: false, zero: false } });
  const to = from.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 100, y: 50 }] });
  let plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
  if(rebased){
    const current=sampleTransition(plan,50);
    plan=planTransition({from:current,to,options:{durationMs:100,easing:"linear"}});
    return {from:current,to,plan,frame:sampleTransition(plan,50),checks:[{point:[183,100],rgba:[255,0,0,255]},{point:[168,100],rgba:[255,255,255,255]}]};
  }
  return { from, to, plan, frame: sampleTransition(plan, 50),
    checks: [{ point: [168, 100], rgba: [255, 0, 0, 255] }, { point: [106, 100], rgba: [255, 255, 255, 255] }] };
}
