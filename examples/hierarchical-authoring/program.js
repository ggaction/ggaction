import { chart, hconcat } from "../../src/index.js";

export function authoringStages() {
  const base = chart()
    .createCanvas({ width: 400, height: 300, margin: 65 })
    .createData({ id: "observations", values: [
      { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 4 }
    ] });
  const highLevel = base.createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
  const composed = base.createPointMark({ id: "points" })
    .encodeX({ field: "x" }).encodeY({ field: "y" });
  const styled = composed.encodePointRadius({ value: 8 })
    .editPointMark({ fill: "#7c3aed" }).createGuides({ legend: false });
  return { highLevel, composed, styled };
}

export function createHierarchicalAuthoring() {
  const { highLevel, composed, styled } = authoringStages();
  return hconcat({ programs: [
    highLevel.createTitle({ text: "H0: complete chart" }),
    composed.createTitle({ text: "H2: mark and encodings" }),
    styled.createTitle({ text: "Focused style and guides" })
  ], gap: 20 });
}
