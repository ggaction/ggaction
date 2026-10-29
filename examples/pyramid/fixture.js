export const canvas = { width: 420, height: 360, margin: { left: 60, right: 60, top: 60, bottom: 30 }, background: "#ffffff" };
export const observations = [{ id: "visit", stage: "Visited", value: 100 }, { id: "trial", stage: "Tried", value: 60 }, { id: "return", stage: "Returned", value: 20 }];
export const variants = [
  { id: "width", chart: "pyramid", title: "Ordered stages · width", options: {} },
  { id: "area", chart: "pyramid-area", title: "Ordered stages · area", options: { encoding: "area", taperRatio: .8 } },
  { id: "up", chart: "pyramid-up", title: "Stages progress upward", options: { orientation: "up" } },
  { id: "right", chart: "pyramid-right", title: "Stages progress rightward", options: { orientation: "right" } },
  { id: "left", chart: "pyramid-left", title: "Stages progress leftward", options: { orientation: "left" } },
  { id: "point", chart: "pyramid-point", title: "Explicit pointed last stage", options: { lastStage: "point" } }
];
export function pyramidOptions(id = "width") {
  const variant = variants.find(value => value.id === id);
  if (!variant) throw new Error(`Unknown Pyramid variant ${id}.`);
  return { variant, canvas, data: { id: "stages", keyField: "id", values: observations },
    plot: { stage: "stage", value: "value", ...variant.options, stages: { fill: "#c7d2fe", stroke: "#4338ca", strokeWidth: 1 }, labels: { fontSize: 14 } } };
}
