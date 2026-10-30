import { chart } from "../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";

export const guideFrameVariants = ["cartesian", "polar"];
export function animationGuideFrame(variant) {
  let from = chart().createCanvas({ width: 200, height: 200, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 0, y: 0 }, { id: "b", x: 10, y: 10 }] })
    .createPointMark({ id: "m", opacity: 0 });
  let to, points;
  if (variant === "cartesian") {
    from = from.encodeX({ field: "x", scale: { domain: [0, 10], nice: false } }).encodeY({ field: "y" })
      .createVerticalGrid({ values: [6], color: "red", lineWidth: 8 });
    to = from.editScale({ id: "x", domain: [0, 14] });
    points = [[100, 100], [116, 100]];
  } else {
    from = from.encodeTheta({ field: "x", scale: { domain: [0, 10], nice: false } })
      .encodeR({ field: "y", scale: { domain: [0, 10], nice: false } })
      .createGrid({ radial: { values: [5], color: "red", lineWidth: 8 } });
    to = from.editCanvas({ width: 280, height: 280 });
    points = [[170, 120], [160, 120]];
  }
  const plan = planTransition({ from, to, options: { durationMs: 100, easing: "linear" } });
  const frame = sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50);
  return { from, to, plan, frame, checks: points.map((point, index) => ({ point, rgba: index === 0 ? [255, 0, 0, 255] : [255, 255, 255, 255] })) };
}
