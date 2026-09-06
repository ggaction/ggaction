import { chart } from "../../../src/index.js";
import { raincloudRows } from "../../../examples/raincloud-plot/program.js";

const category = {
  field: "group",
  fieldType: "nominal",
  scale: {
    id: "distributionCategory",
    type: "band",
    domain: ["Control", "Treatment", "Follow-up"]
  }
};
const value = {
  field: "value",
  fieldType: "quantitative",
  scale: { id: "distributionValue", domain: [38, 74], zero: false }
};
const color = {
  field: "group",
  fieldType: "nominal",
  scale: { id: "distributionColor" }
};

function slot(program, id) {
  return program._withMarkConfig(id, {
    ...program.markConfigs[id],
    categorySlotOffset: { channel: "x", band: 0.22 }
  });
}

export function createRaincloudPrimitive(values = raincloudRows) {
  let program = chart()
    .createCanvas({ width: 680, height: 420, margin: 65 })
    .createData({ id: "data", values })
    .createViolinPlot({
      id: "distributionCloud",
      data: "data",
      x: category,
      y: value,
      color,
      density: { bandwidth: 3.5, steps: 48, side: "left" },
      area: { opacity: 0.35, strokeWidth: 1.5, curve: "monotone" },
      guides: false
    })
    .createBoxPlot({
      id: "distributionSummary",
      data: "data",
      x: category,
      y: value,
      width: { band: 0.24 },
      outliers: false,
      box: { opacity: 0.75 },
      median: { stroke: "#0f172a", strokeWidth: 2 },
      guides: false
    })
    .encodeColor({ target: "distributionSummary", ...color })
    .createBeeswarmPlot({
      id: "distributionPoints",
      data: "data",
      x: category,
      y: value,
      color,
      point: { radius: 3.5, stroke: "white", strokeWidth: 1 },
      packing: { maxOffset: { band: 0.12 }, key: "id", padding: 1 },
      guides: false
    });
  const box = program.markConfigs.distributionSummary.boxPlot;
  const whisker = program.markConfigs[box.whiskerId].errorBar;
  for (const id of [
    "distributionSummary",
    box.whiskerId,
    whisker.lowerCapId,
    whisker.upperCapId,
    "distributionPoints"
  ]) program = slot(program, id);
  program = program
    .rematerializeBarMark({ id: "distributionSummary" })
    .rematerializeRuleMark({ id: box.whiskerId })
    .rematerializeRuleMark({ id: whisker.lowerCapId })
    .rematerializeRuleMark({ id: whisker.upperCapId })
    .rematerializeRuleMark({ id: box.medianId })
    .rematerializePointMark({ id: "distributionPoints" })
    .createGuides({
      axes: {
        x: { title: { text: "Study group" } },
        y: { title: { text: "Score" } }
      },
      grid: { horizontal: true, vertical: false },
      legend: false
    });
  return program;
}
