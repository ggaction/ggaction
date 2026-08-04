export const REVIEW_LAYOUT = Object.freeze({
  padding: 8,
  gap: 24,
  carsWidth: 760,
  carsHeight: 480,
  multiWidth: 760,
  multiHeight: 480
});

export const CARS_LEGEND_TARGET = Object.freeze({
  titleX: 600,
  symbolCenterX: 616,
  labelX: 644
});

export const MULTI_LEGEND_TARGET = Object.freeze({
  titleX: 550,
  symbolCenterX: 566,
  labelX: 594,
  categoricalRectX: 559,
  category: Object.freeze({
    titleY: 60,
    itemY: Object.freeze([92, 120, 148]),
    bottom: 154
  }),
  size: Object.freeze({
    titleY: 185,
    itemY: Object.freeze([219, 259, 299]),
    bottom: 306.8986541696686
  }),
  opacity: Object.freeze({
    titleY: 338,
    itemY: Object.freeze([364, 392, 420]),
    bottom: 427
  }),
  blockGap: 24
});

export const HORIZONTAL_LEGEND_TARGET = Object.freeze({
  pointCount: 398,
  blockGap: 40,
  symbolLabelGap: 8,
  top: Object.freeze({
    lineY: 185.5,
    colorBounds: Object.freeze({ top: 179, bottom: 192 }),
    opacityBounds: Object.freeze({ top: 178.5, bottom: 192.5 }),
    colorSymbolX: Object.freeze([132, 199, 280]),
    opacitySymbolX: Object.freeze([474.46, 522.8199999999999, 584.02])
  }),
  bottom: Object.freeze({
    lineY: 486.5,
    colorBounds: Object.freeze({ top: 480, bottom: 493 }),
    opacityBounds: Object.freeze({ top: 479.5, bottom: 493.5 }),
    colorSymbolX: Object.freeze([132, 195, 272]),
    opacitySymbolX: Object.freeze([466.46, 514.8199999999999, 576.02])
  })
});
