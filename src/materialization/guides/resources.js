import { unionConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";

// Only domain-owned guides participate. Extension primitives may deliberately
// overlap, and a combined categorical/size legend is one occupied group.
export function resolveGuideCollisionBlocks(graphicSpec, guideConfigs, titleConfig, profile) {
  const blocks = [];
  const append = (id, kind, position, ids) => {
    if (position === undefined) return;
    const existing = ids.filter(id => graphicSpec.objects[id] !== undefined);
    const bounds = unionConcreteGraphicBounds(graphicSpec, existing, profile);
    if (bounds !== undefined) blocks.push({ id, kind, position, bounds });
  };
  append("chart title", "title", titleConfig?.position, ["chartTitle", "chartSubtitle"]);
  for (const channel of ["x", "y"]) {
    for (const id of axisGraphicIds(channel)) {
      const component = id.slice(`${channel}Axis`.length).toLowerCase();
      append(`${channel}-axis ${component}`, "axis", guideConfigs.axis?.[channel]?.[component]?.position, [id]);
    }
  }
  const policies = legendResourcePolicies();
  const configs = guideConfigs.legend ?? {};
  const categorical = policies.find(policy => policy.family === "categorical" && configs[policy.kind] !== undefined);
  const combined = categorical !== undefined && configs.size !== undefined &&
    configs[categorical.kind].target === configs.size.target &&
    (configs.size.inheritPosition !== false || configs[categorical.kind].position === configs.size.position);
  const groups = guideConfigs.legendGroups ?? {};
  for (const [target, group] of Object.entries(groups)) {
    const ids = policies.filter(policy => configs[policy.kind]?.target === target).flatMap(policy => policy.graphicIds);
    append(`${target} legend group`, "legend", group.placement.position ?? "free", ids);
  }
  for (const policy of policies) {
    const config = configs[policy.kind];
    if (groups[config?.target] !== undefined) continue;
    if (config === undefined || combined && policy.kind === "size") continue;
    const ids = combined && policy === categorical
      ? [...policy.graphicIds, ...policies.find(item => item.kind === "size").graphicIds]
      : policy.graphicIds;
    append(`${policy.kind}${combined && policy === categorical ? "+size" : ""} legend`, "legend", config.position, ids);
  }
  return blocks;
}



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
  stroke: Object.freeze({
    semanticKind: "stroke",
    family: "categorical",
    rematerializeOp: undefined,
    graphicIds: Object.freeze(CATEGORICAL_COMPONENTS.map(
      component => `strokeLegend${component}`
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
      "colorGradientBackground", "colorGradientStrips", "colorGradientTicks", "colorGradientSymbols",
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
  strokeGradient: Object.freeze({
    semanticKind: "stroke",
    family: "continuous",
    rematerializeOp: "rematerializeStrokeGradientLegend",
    graphicIds: Object.freeze([
      "strokeGradientBackground", "strokeGradientStrips", "strokeGradientTicks",
      "strokeGradientLabels", "strokeGradientTitle"
    ])
  }),
  strokeInterval: Object.freeze({
    semanticKind: "stroke",
    family: "interval",
    rematerializeOp: "rematerializeStrokeIntervalLegend",
    graphicIds: Object.freeze([
      "strokeIntervalBackground", "strokeIntervalSymbols",
      "strokeIntervalLabels", "strokeIntervalTitle"
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


// A default outside horizontal legend follows the actual occupied axis lane.
// Explicit offsets, plot corners, free coordinates and legacy layouts retain
// their authored anchor. This returns a derived offset, never stored geometry.
export function resolveLegendAxisOffset(program, config, plot) {
  if (config.inferredOffset !== true || !["top", "bottom"].includes(config.position) || config.layout === "legacy-bottom") return config.offset;
  const axes = resolveGuideCollisionBlocks(program.graphicSpec, program.guideConfigs, undefined,
    program.materializationConfigs.textMetrics).filter(block=>block.kind === "axis" && block.position === config.position);
  const clearance = config.position === "bottom"
    ? Math.max(0, ...axes.map(block=>block.bounds.bottom - plot.y - plot.height))
    : Math.max(0, ...axes.map(block=>plot.y - block.bounds.top));
  return config.offset + clearance;
}

export function effectiveLegendOffsetConfig(program, kind, config) {
  if (kind !== "size" || config.inheritPosition === false) return config;
  const categorical = ["series", "color", "stroke"].map(k=>program.guideConfigs.legend?.[k]).find(c=>c?.target === config.target);
  return categorical === undefined ? config : { ...config, position: categorical.position,
    offset: categorical.offset, inferredOffset: categorical.inferredOffset };
}

export function needsLegendAxisReflow(before, after) {
  const inferred = [before, after].some(program => Object.entries(program.guideConfigs.legend ?? {}).some(([kind, config]) => {
    const effective = effectiveLegendOffsetConfig(program, kind, config);
    return effective.inferredOffset === true && ["top", "bottom"].includes(effective.position) && effective.layout !== "legacy-bottom";
  }) || Object.values(program.guideConfigs.legendGroups ?? {}).some(group=>group.inferredOffset === true && ["top","bottom"].includes(group.placement.position)));
  return inferred && [before, after].some(program=>resolveGuideCollisionBlocks(program.graphicSpec, program.guideConfigs,
    undefined, program.materializationConfigs.textMetrics).some(block=>block.kind === "axis" && ["top","bottom"].includes(block.position)));
}
