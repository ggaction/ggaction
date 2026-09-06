const AXIS_COMPONENTS = Object.freeze(["Line", "Ticks", "Labels", "Title"]);

const CATEGORICAL_COMPONENTS = Object.freeze([
  "Symbols", "SymbolLines", "SymbolPoints", "SymbolSwatches",
  "Labels", "Title", "Background"
]);

const LEGEND_RESOURCE_POLICIES = Object.freeze({
  series: Object.freeze({
    semanticKind: "series",
    family: "categorical",
    rematerializeOp: undefined,
    graphicIds: Object.freeze(CATEGORICAL_COMPONENTS.map(
      component => `seriesLegend${component}`
    ))
  }),
  color: Object.freeze({
    semanticKind: "color",
    family: "categorical",
    rematerializeOp: undefined,
    graphicIds: Object.freeze(CATEGORICAL_COMPONENTS.map(
      component => `colorLegend${component}`
    ))
  }),
  size: Object.freeze({
    semanticKind: "size",
    family: "size",
    rematerializeOp: "rematerializeSizeLegend",
    graphicIds: Object.freeze([
      "sizeLegendBackground", "sizeLegendSymbols", "sizeLegendLabels", "sizeLegendTitle"
    ])
  }),
  gradient: Object.freeze({
    semanticKind: "color",
    family: "continuous",
    rematerializeOp: "rematerializeGradientLegend",
    graphicIds: Object.freeze([
      "colorGradientBackground", "colorGradientStrips", "colorGradientTicks",
      "colorGradientLabels", "colorGradientTitle"
    ])
  }),
  interval: Object.freeze({
    semanticKind: "color",
    family: "interval",
    rematerializeOp: "rematerializeIntervalLegend",
    graphicIds: Object.freeze([
      "colorLegendBackground", "colorLegendSymbols", "colorLegendLabels",
      "colorLegendTitle"
    ])
  }),
  opacity: Object.freeze({
    semanticKind: "opacity",
    family: "continuous",
    rematerializeOp: "rematerializeOpacityLegend",
    graphicIds: Object.freeze([
      "opacityLegendBackground", "opacityLegendSymbols", "opacityLegendLabels",
      "opacityLegendTitle"
    ])
  }),
  strokeWidth: Object.freeze({
    semanticKind: "strokeWidth",
    family: "strokeWidth",
    rematerializeOp: "rematerializeStrokeWidthLegend",
    graphicIds: Object.freeze([
      "strokeWidthLegendBackground", "strokeWidthLegendSymbols", "strokeWidthLegendLabels",
      "strokeWidthLegendTitle"
    ])
  })
});

export function axisGraphicIds(channel) {
  const prefix = channel === "radius" ? "radial" : channel;
  return AXIS_COMPONENTS.map(component => `${prefix}Axis${component}`);
}

export function legendGraphicIds(kind) {
  return legendResourcePolicy(kind).graphicIds;
}

export function legendResourcePolicy(kind) {
  const policy = LEGEND_RESOURCE_POLICIES[kind];
  if (policy === undefined) {
    throw new Error(`Unknown legend graphic kind "${kind}".`);
  }
  return policy;
}

export function legendResourcePolicies() {
  return Object.entries(LEGEND_RESOURCE_POLICIES).map(([kind, policy]) => ({
    kind,
    ...policy
  }));
}

export function allLegendGraphicIds(kinds) {
  return [...new Set(kinds.flatMap(legendGraphicIds))];
}
