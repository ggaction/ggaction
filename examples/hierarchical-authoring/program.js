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
  const styled = highLevel.encodePointRadius({ value: 8 })
    .editPointMark({ fill: "#7c3aed", opacity: 0.35 })
    .createGuides({ legend: false });
  const revisedAgain = styled.editPointMark({ opacity: 0.7 });
  return { highLevel, composed, styled, revisedAgain };
}

export function createHierarchicalAuthoring() {
  const { highLevel, styled, revisedAgain } = authoringStages();
  return hconcat({ programs: [
    highLevel.createTitle({ text: "High-level chart" }),
    styled.createTitle({ text: "Focused refinement" }),
    revisedAgain.createTitle({ text: "Later opacity edit" })
  ], gap: 20 });
}
