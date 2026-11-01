import { chart } from "../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";

export const guideFrameVariants = ["cartesian", "polar", "title", "boundary", "parallel", "legend", "label-layout"];
export function animationGuideFrame(variant) {
  let from = chart().createCanvas({ width: 200, height: 200, margin: 20 })
    .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 0, y: 0 }, { id: "b", x: 10, y: 10 }] })
    .createPointMark({ id: "m", opacity: 0 });
  let to, points;
  if (variant === "label-layout") {
    from = chart().createCanvas({ width: 200, height: 220, margin: { left: 20, right: 20, top: 20, bottom: 60 } })
      .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark({ opacity: 0 })
      .encodeX({ field: "x", scale: { domain: [0, 10], nice: false } }).encodeY({ field: "y" })
      .createXAxisLabels({ values: [6], flush: true, fontSize: 40, fontWeight: "bold", color: "red", offset: 8,
        labelMap: [{ value: 6, label: "I" }] });
    to = from.editScale({ id: "x", domain: [0, 14] });
    points = [[100, 185], [125, 185]];
  } else if (variant === "legend") {
    from = chart().createCanvas({ width: 300, height: 240, margin: { left: 20, right: 120, top: 40, bottom: 40 } })
      .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }).createPointMark({ opacity: 0 })
      .encodeX({ field: "x" }).encodeY({ field: "y" })
      .encodeColor({ field: "y", fieldType: "quantitative", scale: { domain: [0, 10], range: ["red", "red"] } })
      .createLegend({ channels: ["color"], values: [0, 10], offset: 20, title: false, gradient: { length: 100, thickness: 12 } });
    to = from.editLegend({ offset: 40, gradient: { length: 140, thickness: 28 } });
    points = [[220, 100], [250, 100]];
  } else if (variant === "title") {
    from = from.encodeX({ field: "x", scale: { domain: [0, 20], nice: false } }).encodeY({ field: "y" })
      .createXAxis({ line: false, ticksAndLabels: false, title: { text: "I", at: 5, offset: -10, fontSize: 40, fontWeight: "bold", color: "red" } });
    to = from.editXAxisTitle({ at: 15 });
    points = [[100, 170], [125, 170]];
  } else if (variant === "boundary") {
    from = chart().createCanvas({ width: 200, height: 200, margin: 20 })
      .createData({ values: [{ c: "a", v: 1 }, { c: "b", v: 2 }] }).createBarMark({ opacity: 0 })
      .encodeX({ field: "c", fieldType: "nominal", scale: { type: "band", range: [20, 140], paddingInner: 0, paddingOuter: 0 } })
      .encodeY({ field: "v" }).createVerticalGrid({ bandPosition: "boundary", color: "red", lineWidth: 8 });
    to = from.editScale({ id: "x", range: [40, 180] });
    points = [[95, 100], [110, 100]];
  } else if (variant === "parallel") {
    from = chart().createCanvas({ width: 200, height: 200, margin: 20 })
      .createData({ values: [{ a: 1, b: 2, c: 3 }, { a: 2, b: 3, c: 4 }] })
      .createParallelCoordinates({ id: "lines", dimensions: ["a", "b", "c"], guides: { axes: false, legend: false } })
      .editGraphics({ target: "lines", property: "opacity", value: 0 })
      .createParallelAxis({ target: "lines", field: "a", line: { color: "red", lineWidth: 8 }, ticksAndLabels: false, title: false });
    to = from.encodeParallelCoordinates({ target: "lines", dimensions: ["b", "a", "c"] });
    points = [[60, 100], [100, 100]];
  } else if (variant === "cartesian") {
    from = from.encodeX({ field: "x", scale: { domain: [0, 10], nice: false } }).encodeY({ field: "y" })
      .createVerticalGrid({ values: [6], color: "red", lineWidth: 8 });
    to = from.editScale({ id: "x", domain: [0, 14] });
    points = [[100, 100], [116, 100]];
  } else {
    if (variant !== "polar") throw new TypeError("Unknown guide frame variant.");
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
