const COLOR_ITEMS = Object.freeze([
  Object.freeze({ text: "USA", fill: "#4c78a8" }),
  Object.freeze({ text: "Japan", fill: "#f58518" }),
  Object.freeze({ text: "Europe", fill: "#e45756" })
]);

const OPACITY_ITEMS = Object.freeze([
  Object.freeze({ text: "8", opacity: 0.2 }),
  Object.freeze({ text: "16.4", opacity: 0.5999999999999999 }),
  Object.freeze({ text: "24.8", opacity: 1 })
]);

export const LEGEND_LAYOUT = Object.freeze({
  blockGap: 40,
  symbolLabelGap: 8,
  sampleGap: 20,
  colorItems: COLOR_ITEMS,
  opacityItems: OPACITY_ITEMS,
  opacityLabelWidth: Object.freeze([6.36, 19.2, 22.32]),
  top: Object.freeze({
    lineY: 19.5,
    chartGap: 13.5,
    colorSymbolX: Object.freeze([132, 199, 280]),
    colorLabelX: Object.freeze([154, 221, 302]),
    opacityTitleX: 377.52,
    opacitySymbolX: Object.freeze([474.46, 522.8199999999999, 584.02]),
    opacityLabelX: Object.freeze([489.46, 537.8199999999999, 599.02])
  }),
  bottom: Object.freeze({
    lineY: 595.5,
    chartGap: 20,
    colorSymbolX: Object.freeze([132, 195, 272]),
    colorLabelX: Object.freeze([154, 217, 294]),
    opacityTitleX: 369.52,
    opacitySymbolX: Object.freeze([466.46, 514.8199999999999, 576.02]),
    opacityLabelX: Object.freeze([481.46, 529.8199999999999, 591.02])
  })
});
