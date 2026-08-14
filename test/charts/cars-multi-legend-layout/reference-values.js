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
  opacityLabelWidth: Object.freeze([7.32, 25.2, 25.2]),
  top: Object.freeze({
    lineY: 19.5,
    chartGap: 13.5,
    colorSymbolX: Object.freeze([124.6112, 192.5712, 268.4512]),
    colorLabelX: Object.freeze([146.6112, 214.5712, 290.4512]),
    opacityTitleX: 365.97119999999995,
    opacitySymbolX: Object.freeze([
      465.70879999999994, 515.0288, 582.2288000000001
    ]),
    opacityLabelX: Object.freeze([
      480.70879999999994, 530.0288, 597.2288000000001
    ])
  }),
  bottom: Object.freeze({
    lineY: 595.5,
    chartGap: 20,
    colorSymbolX: Object.freeze([124.6112, 188.5712, 260.4512]),
    colorLabelX: Object.freeze([146.6112, 210.5712, 282.4512]),
    opacityTitleX: 357.97119999999995,
    opacitySymbolX: Object.freeze([
      457.70879999999994, 507.0288, 574.2288000000001
    ]),
    opacityLabelX: Object.freeze([
      472.70879999999994, 522.0288, 589.2288000000001
    ])
  })
});
