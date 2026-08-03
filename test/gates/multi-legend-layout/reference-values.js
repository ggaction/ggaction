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
  labelX: 644,
  categoricalTitleShiftX: 22,
  categoricalSymbolShiftX: 22,
  categoricalLabelShiftX: 24
});

export const MULTI_LEGEND_CURRENT = Object.freeze({
  categoricalTitle: Object.freeze({ x: 528, y: 60 }),
  sizeTitle: Object.freeze({ x: 550, y: 220 }),
  opacityTitle: Object.freeze({ x: 550, y: 60 })
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
    shiftY: -35,
    titleY: 185,
    itemY: Object.freeze([219, 259, 299]),
    bottom: 306.8986541696686
  }),
  opacity: Object.freeze({
    shiftY: 278,
    titleY: 338,
    itemY: Object.freeze([364, 392, 420]),
    bottom: 427
  }),
  blockGap: 24
});
