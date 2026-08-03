export const REVIEW_LAYOUT = Object.freeze({
  padding: 8,
  gap: 24,
  carsWidth: 760,
  carsHeight: 480,
  multiWidth: 680,
  multiHeight: 460
});

export const MULTI_LEGEND_ROWS = Object.freeze([
  Object.freeze({ x: 1, y: 2, group: "A", amount: 4, alpha: 0.2 }),
  Object.freeze({ x: 2, y: 5, group: "B", amount: 9, alpha: 0.6 }),
  Object.freeze({ x: 3, y: 3, group: "C", amount: 16, alpha: 1 })
]);

export const CARS_LEGEND_TARGET = Object.freeze({
  titleX: 600,
  categoricalShiftX: 22
});

export const MULTI_LEGEND_CURRENT = Object.freeze({
  categoricalTitle: Object.freeze({ x: 448, y: 60 }),
  sizeTitle: Object.freeze({ x: 470, y: 220 }),
  opacityTitle: Object.freeze({ x: 470, y: 60 })
});

export const MULTI_LEGEND_TARGET = Object.freeze({
  titleX: 470,
  categoricalShiftX: 22,
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
