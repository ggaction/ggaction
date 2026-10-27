import { axisGraphicIds, selectCartesianAxis } from "../../selectors/axes.js";
export { axisGraphicIds };
import { localLegendPosition, localLegendPlacement } from "../legendGroups.js";
import { resolveConcreteGraphicBounds, unionConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";

export function hasPendingAxisTitleRematerialization(program, channel, axisId) {
  const pending = program.context.pendingMaterializationPlan;
  if (pending === undefined) return false;
  const op = `edit${channel.toUpperCase()}AxisTitle`;
  return pending.steps.slice(pending.next).some(step => step.op === op &&
    selectCartesianAxis(program, channel, step.args).id === axisId);
}

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
  for (const [ownerId, config] of Object.entries(guideConfigs.axis ?? {})) {
    const position = ["line", "ticks", "labels", "title"].map(component => config[component]?.position).find(Boolean);
    const channel = ["x", "y"].includes(ownerId) ? ownerId
      : ["top", "bottom"].includes(position) ? "x" : ["left", "right"].includes(position) ? "y" : undefined;
    if (channel === undefined) continue;
    for (const [index, component] of ["line", "ticks", "labels", "title"].entries()) {
      const id = axisGraphicIds(channel, ownerId)[index];
      const length = blocks.length;
      append(`${ownerId}-axis ${component}`, "axis", config[component]?.position, [id]);
      if (blocks.length === length) continue;
      const block = blocks.at(-1);
      block.axisId = ownerId;
      block.namedAxis = ownerId !== channel;
      if (["labels", "title"].includes(component)) {
        const object = graphicSpec.objects[id];
        block.textBounds = object.items?.map(item => resolveConcreteGraphicBounds(graphicSpec, item.id, profile)) ?? [block.bounds];
      }
    }
  }
  // Non-Cartesian axes do not own a single outside edge. Their concrete
  // label/title ink still occupies margin space on every edge. Share these
  // blocks between title placement, legend clearance, and collision checks;
  // the axis path itself stays inside the plot and is not an outside obstacle.
  for (const channel of ["parallel", "theta", "radius"]) {
    if (guideConfigs.axis?.[channel] === undefined) continue;
    for (const position of ["left", "right", "top", "bottom"]) {
      append(`${channel}-axis text`, "axis", position, axisGraphicIds(channel).slice(2));
    }
  }
  const policies = legendResourcePolicies();
  const configs = guideConfigs.legend ?? {};
  const categorical = policies.find(policy => policy.family === "categorical" && configs[policy.kind] !== undefined);
  const combined = categorical !== undefined && configs.size !== undefined &&
    configs[categorical.kind].target === configs.size.target &&
    localLegendPosition(configs[categorical.kind]) === undefined && localLegendPosition(configs.size) === undefined &&
    (configs.size.inheritPosition !== false || configs[categorical.kind].position === configs.size.position);
  const groups = guideConfigs.legendGroups ?? {};
  for (const [target, group] of Object.entries(groups)) {
    const ids = policies.filter(policy => configs[policy.kind]?.target === target && localLegendPosition(configs[policy.kind]) === undefined).flatMap(policy => policy.graphicIds);
    append(`${target} legend group`, "legend", group.placement.position ?? "free", ids);
  }
  for (const policy of policies) {
    const config = configs[policy.kind];
    if (groups[config?.target] !== undefined && localLegendPosition(config) === undefined) continue;
    if (config === undefined || combined && policy.kind === "size") continue;
    const ids = combined && policy === categorical
      ? [...policy.graphicIds, ...policies.find(item => item.kind === "size").graphicIds]
      : policy.graphicIds;
    append(`${policy.kind}${combined && policy === categorical ? "+size" : ""} legend`, "legend", localLegendPosition(config) ?? config.position, ids);
  }
  return blocks;
}





const CATEGORICAL_COMPONENTS = Object.freeze([
  "Symbols", "SymbolLines", "SymbolPoints", "SymbolSwatches",
  "Labels", "Title", "Background"
]);

const LEGEND_RESOURCE_POLICIES = Object.freeze({
  colorSize: Object.freeze({semanticKind:"colorSize",family:"sampled",rematerializeOp:undefined,
    graphicIds:Object.freeze(["colorSizeLegendBackground","colorSizeLegendSymbols","colorSizeLegendLabels","colorSizeLegendTitle"])}),
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


// An inferred outside edge legend follows the actual occupied same-edge axis lane.
// Explicit offsets, plot corners, free coordinates and legacy layouts retain
// their authored anchor. This returns a derived offset, never stored geometry.
function axisLaneBlocks(program) {
  return resolveGuideCollisionBlocks(program.graphicSpec, program.guideConfigs, undefined,
    program.materializationConfigs.textMetrics).filter(block => block.kind === "axis");
}

export function resolveLegendAxisOffset(program, config, plot) {
  if (config.inferredOffset !== true || !["top", "bottom", "left", "right"].includes(config.position) || config.layout === "legacy-bottom") return config.offset;
  const axes = axisLaneBlocks(program).filter(block => block.position === config.position);
  const clearance = Math.max(0, ...axes.map(block => ({
    bottom: block.bounds.bottom - plot.y - plot.height,
    top: plot.y - block.bounds.top,
    left: plot.x - block.bounds.left,
    right: block.bounds.right - plot.x - plot.width
  })[config.position]));
  return config.offset + clearance;
}

export function effectiveLegendOffsetConfig(program, kind, config) {
  if (kind !== "size" || config.inheritPosition === false) return config;
  const categorical = ["series", "color", "stroke"].map(k=>program.guideConfigs.legend?.[k]).find(c=>c?.target === config.target);
  return categorical === undefined ? config : { ...config, position: categorical.position,
    offset: categorical.offset, inferredOffset: categorical.inferredOffset };
}

export function needsLegendAxisReflow(before, after) {
  // Legend editors record explicit-vs-inferred intent after constructing their
  // intrinsic graphics. Re-anchor a newly explicit horizontal offset as well,
  // so the former inferred clearance cannot survive in concrete placement.
  const madeExplicit = Object.entries(after.guideConfigs.legend ?? {}).some(([kind, config]) => {
    const effective = effectiveLegendOffsetConfig(after, kind, config);
    return effective.inferredOffset === false && before.guideConfigs.legend?.[kind]?.inferredOffset === true &&
      ["top", "bottom"].includes(effective.position) && effective.layout !== "legacy-bottom";
  });
  const inferred = [before, after].some(program => Object.entries(program.guideConfigs.legend ?? {}).some(([kind, config]) => {
    const effective = effectiveLegendOffsetConfig(program, kind, config);
    return effective.inferredOffset === true && ["top", "bottom"].includes(effective.position) && effective.layout !== "legacy-bottom";
  }) || Object.values(program.guideConfigs.legendGroups ?? {}).some(group=>group.inferredOffset === true && ["top","bottom"].includes(group.placement.position)));
  return (inferred || madeExplicit) && [before, after].some(program => axisLaneBlocks(program).some(block => ["top", "bottom"].includes(block.position)));
}


// Reset intrinsic side geometry only when an inferred side placement and a real
// same-edge axis meet before or after the edit. This also handles axis removal.
export function needsSideLegendAxisReflow(before, after) {
  const edges = new Set();
  for (const program of [before, after]) {
    for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
      const local = localLegendPlacement(config);
      const group = local === undefined ? program.guideConfigs.legendGroups?.[config.target] : undefined;
      const effective = effectiveLegendOffsetConfig(program, kind, config);
      const placement = local ?? group?.placement ?? effective;
      const inferred = local?.inferredOffset ?? group?.inferredOffset ?? effective.inferredOffset;
      if (inferred === true && placement.at === undefined &&
          ["left", "right"].includes(placement.position) && effective.layout !== "legacy-bottom") {
        edges.add(placement.position);
      }
    }
  }
  const signature = program => JSON.stringify(axisLaneBlocks(program).filter(block => edges.has(block.position)));
  return edges.size > 0 && signature(before) !== signature(after);
}
