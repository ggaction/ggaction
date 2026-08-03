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
  top: Object.freeze({
    colorBounds: Object.freeze({ top: 155, bottom: 192.25 }),
    opacityBounds: Object.freeze({ top: 91.5, bottom: 131 }),
    colorSymbolX: Object.freeze([70, 137, 218]),
    opacitySymbolX: Object.freeze([578, 634, 690])
  }),
  bottom: Object.freeze({
    colorBounds: Object.freeze({ top: 480, bottom: 517.25 }),
    opacityBounds: Object.freeze({ top: 541.25, bottom: 598.75 }),
    colorSymbolX: Object.freeze([70, 133, 210]),
    opacitySymbolX: Object.freeze([578, 634, 690])
  }),
  blockGap: 24
});
