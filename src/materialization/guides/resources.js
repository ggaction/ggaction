const AXIS_COMPONENTS = Object.freeze(["Line", "Ticks", "Labels", "Title"]);

const CATEGORICAL_COMPONENTS = Object.freeze([
  "Symbols", "SymbolLines", "SymbolPoints", "SymbolSwatches",
  "Labels", "Title", "Background"
]);

const LEGEND_GRAPHICS = Object.freeze({
  series: Object.freeze(CATEGORICAL_COMPONENTS.map(
    component => `seriesLegend${component}`
  )),
  color: Object.freeze(CATEGORICAL_COMPONENTS.map(
    component => `colorLegend${component}`
  )),
  size: Object.freeze([
    "sizeLegendSymbols", "sizeLegendLabels", "sizeLegendTitle"
  ]),
  gradient: Object.freeze([
    "colorGradientBackground", "colorGradientStrips", "colorGradientTicks",
    "colorGradientLabels", "colorGradientTitle"
  ]),
  interval: Object.freeze([
    "colorLegendSymbols", "colorLegendLabels", "colorLegendTitle"
  ]),
  opacity: Object.freeze([
    "opacityLegendBackground", "opacityLegendSymbols", "opacityLegendLabels",
    "opacityLegendTitle"
  ])
});

export function axisGraphicIds(channel) {
  const prefix = channel === "radius" ? "radial" : channel;
  return AXIS_COMPONENTS.map(component => `${prefix}Axis${component}`);
}

export function legendGraphicIds(kind) {
  const ids = LEGEND_GRAPHICS[kind];
  if (ids === undefined) {
    throw new Error(`Unknown legend graphic kind "${kind}".`);
  }
  return ids;
}

export function allLegendGraphicIds(kinds) {
  return [...new Set(kinds.flatMap(legendGraphicIds))];
}
