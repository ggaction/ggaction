import {resolveColorSizeConfig,createColorSizeLegendFromConfig,materializeColorSizeLegend} from "../colorSize.js";
import {resetLegendClipGraphics,applyLegendClipGraphics,restoreLegendClipContext}from"../../../../materialization/legendClip.js";
import {validateLegendCombine,resolveSizeShapeCreation} from "../combine.js";
import { recordLegendOffsetIntent } from "../group.js";
import { prepareLegendGroup, creationLegendTarget, validateLegendGroupOptions } from "../group.js";
import { PLOT_LEGEND_POSITIONS } from "../../../../layout/legend.js";
import { normalizeInitialLegendTitle } from "../continuous/common.js";
import { isContinuousColorScaleType } from "../../../../grammar/scales/types.js";
import { withGuideLayoutValidation } from "../../../../materialization/guides/layout.js";
import { sameGuideValue } from "../../reuse.js";
import { normalizeLegendOrder } from "../../../../grammar/categoryOrder.js";
import { action } from "../../../../core/action.js";
import { validateOptionObject } from "../../../../core/validation.js";
import { noOptions, resolveLayout, activeConfig } from "./layout.js";
import { normalizeOptions } from "./options.js";
import { normalizeRecipe, resolveLegendSymbol } from "./recipes.js";
import { validateLegendChannels } from "../target.js";
import { createCategoricalLegendFromConfig, reconcileCategoricalSymbols } from "../lifecycle.js";
import { findLayer } from "../../../../selectors/layers.js";
import { findSemanticScale } from "../../../../selectors/scales.js";
import { isSizeLegendPoint, resolveSizeLegendConfig } from "../size.js";
import { isStrokeWidthLegendLayer } from "../strokeWidth.js";
import { isOpacityLegendLayer } from "../../../../materialization/legends.js";
import { legendResourcePolicies } from
  "../../../../materialization/guides/resources.js";
import {
  hasHorizontalLegendLane,
  hasLegendLane
} from "../lane.js";
import {
  resolveCurrentDefinition,
  resolveDefinition,
  resolveTarget,
  sameValues
} from "./resolve.js";
import { readLegendSampling } from "../sampling.js";
import {
  reconcileLegendBlockTitleGraphic,
  resolveEffectiveLegendBlockConfig
} from "../blocks.js";

function finishLegend(program) {
  return Object.values(program.guideConfigs.legend??{}).some(config=>config.clipHeight!==undefined)||hasLegendLane(program) || Object.keys(program.guideConfigs.legendGroups ?? {}).length > 0
    ? program.rematerializeLegend() : program;
}

function requestedCandidate(program, target, candidates) {
  if (target === undefined) {
    return candidates.length === 1 ? candidates[0] : undefined;
  }
  const layer = findLayer(program, target);
  return candidates.includes(layer) ? layer : undefined;
}

function resolveStandaloneLegendStep(args, kind) {
  if (Object.hasOwn(args, "inheritAppearance")) throw new Error("createLegend does not accept inheritAppearance.");
  const { channels: _channels, ...options } = args;
  return { op: kind === "size" ? "createSizeLegend" : "createStrokeWidthLegend", args: options };
}

export const rematerializeLegend = /* @__PURE__ */ action(
  { op: "rematerializeLegend", description: "Rematerialize every existing legend component." },
  withGuideLayoutValidation(function (args = {}) {
    noOptions(args, "rematerializeLegend");
    const oldClipContext=this.context.deferLegendClip;
    let next = resetLegendClipGraphics(this)._withContext({deferLegendClip:true});
    const categoricalKinds = ["series", "color", "stroke"].filter(
      kind => this.guideConfigs.legend?.[kind] !== undefined
    );
    for (const kind of categoricalKinds) {
      const stored = next.guideConfigs.legend[kind];
      const definition = resolveCurrentDefinition(next, stored);
      const symbol = stored.inferredSymbol
        ? normalizeRecipe(
            resolveLegendSymbol(
              next,
              findLayer(next, stored.target),
              definition.channels,
              undefined,
              kind
            ),
            kind,
            { internal: true }
          )
        : stored.symbol;
      const symbolChanged = !sameGuideValue(symbol, stored.symbol);
      const changed = symbolChanged ||
        !sameValues(stored.channels, definition.channels) ||
        !sameValues(stored.domain, definition.domain) ||
        !sameValues(stored.scales, definition.scales) ||
        stored.field !== definition.field ||
        !sameValues(stored.sizeAreas ?? [], definition.sizeAreas ?? []) ||
        stored.title !== definition.title;
      next = changed
        ? next._withLegendConfig(kind, {
            ...stored,
            symbol,
            channels: definition.channels,
            scales: definition.scales,
            field: definition.field,
            ...(definition.combine === undefined ? {} : {combine: definition.combine, sizeAreas: definition.sizeAreas}),
            title: definition.title,
            domain: definition.domain
          })
        : next;
      const config = resolveEffectiveLegendBlockConfig(
        next,
        kind,
        next.guideConfigs.legend[kind]
      );
      next = reconcileLegendBlockTitleGraphic(next, kind,
        config.titleVisible !== false);
      if (kind === "series") {
        if (!sameValues(
          next.semanticSpec.guides.legend.series.scales,
          definition.scales
        )) {
          next = next.editSemantic({
            property: "guide.legend.series.scales",
            value: definition.scales
          });
        }
        if (next.semanticSpec.guides.legend.series.title !== definition.title) {
          next = next.editSemantic({
            property: "guide.legend.series.title",
            value: definition.title
          });
        }
      } else {
        if (next.semanticSpec.guides.legend[kind].scale !== definition.scales[0]) {
          next = next.editSemantic({
            property: `guide.legend.${kind}.scale`,
            value: definition.scales[0]
          });
        }
        if (next.semanticSpec.guides.legend[kind].title !== definition.title) {
          next = next.editSemantic({
            property: `guide.legend.${kind}.title`,
            value: definition.title
          });
        }
      }
      if (symbolChanged) {
        resolveLayout(next, config);
        next = reconcileCategoricalSymbols(next, stored, config);
      }
      if (config.border !== false) {
        next = next.rematerializeLegendBackground({ kind });
      }
      next = next
        .rematerializeLegendSymbols({ kind })
        .rematerializeLegendLabels({ kind });
      if (config.titleVisible !== false) {
        next = next.rematerializeLegendTitle({ kind });
      }
      const hasHighlight = Object.values(
        next.materializationConfigs.highlights ?? {}
      ).some(highlight => highlight.target === config.target);
      if (hasHighlight) next = next.rematerializeLegendHighlights({ kind });
    }
    if(next.guideConfigs.legend?.colorSize !== undefined) next=materializeColorSizeLegend(next,next.guideConfigs.legend.colorSize);
    for (const policy of legendResourcePolicies()) {
      if (
        policy.rematerializeOp !== undefined &&
        this.guideConfigs.legend?.[policy.kind] !== undefined
      ) {
        const config = resolveEffectiveLegendBlockConfig(
          next,
          policy.kind,
          next.guideConfigs.legend[policy.kind]
        );
        next = reconcileLegendBlockTitleGraphic(next, policy.kind,
          config.titleVisible !== false);
        next = next[policy.rematerializeOp]();
      }
    }
    const clipAnchors = Object.fromEntries(categoricalKinds.filter(kind => next.guideConfigs.legend[kind].clipHeight !== undefined)
      .map(kind => [kind, resolveLayout(next, resolveEffectiveLegendBlockConfig(next, kind, next.guideConfigs.legend[kind])).itemY]));
    next=applyLegendClipGraphics(next,{force:true,anchors:clipAnchors});
    next=restoreLegendClipContext(next,oldClipContext);
    if (hasHorizontalLegendLane(next)) {
      next = next.rematerializeHorizontalLegendLane();
    }
    return next;
  })
);

export function resolveCategoricalLegendConfig(program, args = {}) {
  const layer = resolveTarget(program, args.target);
  const definition = resolveDefinition(
    program,
    layer,
    args.channels,
    args.title === false ? undefined : args.title,
    args.order === undefined ? undefined : normalizeLegendOrder(args.order)
  );
  const inferredSymbol = args.symbol === undefined || args.symbol === "auto";
  const options = normalizeOptions({ ...args,
    symbol: resolveLegendSymbol(
      program,
      layer,
      definition.channels,
      args.symbol,
      definition.kind
    )
  }, definition.kind, { internalSymbol: inferredSymbol });
  const config = {
    target: layer.id,
    ...definition,
    ...normalizeInitialLegendTitle(args.title, definition.title),
    inferredTitle: args.title === false || !Object.hasOwn(args, "title"),
    inferredSymbol,
    position: options.position,
    align: options.align,
    direction: options.direction,
    columns: options.columns,
    offset: options.offset,
    titlePosition: options.titlePosition,
    symbol: options.symbol,
    labels: options.labels,
    titleStyle: options.titleStyle,
    itemGap: options.itemGap,
    layout: options.layout,
    ...(options.clipHeight === undefined ? {} : {clipHeight:options.clipHeight}),
    ...(options.overflow === undefined ? {} : { overflow: options.overflow }),
    border: options.border
  };
  return config;
}

export const createCategoricalLegend = /* @__PURE__ */ action(
  { op: "createCategoricalLegend", description: "Create one categorical legend block." },
  withGuideLayoutValidation(function (args = {}) {
    const config = resolveCategoricalLegendConfig(this, args);
    if (this.semanticSpec.guides.legend?.[config.kind] !== undefined) {
      throw new Error(
        `createCategoricalLegend requires a missing legend for ${config.kind}.`
      );
    }
    resolveLayout(this, config);
    return createCategoricalLegendFromConfig(this, config,
      args.order === undefined ? undefined : normalizeLegendOrder(args.order));
  })
);

function resolveRawLegendCreationPlan(program, args = {}, layers = program.semanticSpec.layers, internalChannels) {
  if (Object.hasOwn(args, "combine")) {
    validateLegendCombine(args.combine);
    if (args.combine === "color-size") {
      const config=resolveColorSizeConfig(program,args);
      const prepared=prepareLegendGroup(program,{...args,blockLayout:args.blockLayout??(["left","right"].includes(args.position??"right")?"column":"row")},config.target,{creation:true,nativeOffset:30});
      return {steps:[{op:"createColorSizeLegend",args}],finish:"always",legendGroup:{target:config.target,config:prepared.program.guideConfigs.legendGroups[config.target]}};
    }
    if (args.combine === "size-shape") return resolveSizeShapeCreation(program, args, layers, resolveRawLegendCreationPlan, internalChannels);
    const {combine: _combine, ...separate} = args;
    return resolveRawLegendCreationPlan(program, separate, layers);
  }
  validateOptionObject(args, undefined, "createLegend");
  const candidates = args.target === undefined ? layers : layers.filter(layer => layer.id === args.target);
  const channels = args.channels;
  if (channels !== undefined) validateLegendChannels(channels, "createLegend");
  // Independent appearance channels on cells, bars and arcs are separate
  // blocks. Mixed sampled channels likewise cannot use a categorical symbol.
  // Resolve each existing owner before any child action changes the program.
  const point = candidates.length === 1 && candidates[0].mark?.type === "point";
  const continuousChannel = channel => ["color", "stroke"].includes(channel) &&
    !["ordinal", "band", "point"].includes(findSemanticScale(program, candidates[0]?.encoding?.[channel]?.scale)?.type);
  const independentPoint = point && ((channels ?? []).some(continuousChannel) || new Set((channels ?? []).filter(channel => !["size", "opacity", "strokeWidth"].includes(channel))
    .map(channel => candidates[0].encoding?.[channel]?.field)).size > 1);
  if (channels?.length > 1 && (independentPoint || channels.some(c => ["opacity", "strokeWidth"].includes(c)) ||
      candidates.length === 1 && ["rect", "bar", "arc", "text"].includes(candidates[0].mark?.type))) {
    const { representation, values, count, symbol, gradient, overflow, ...common } = args;
    const sampled = channels.filter(channel => ["opacity", "strokeWidth"].includes(channel));
    const primary = channels.filter(channel => !sampled.includes(channel));
    const primaryBlocks = new Map();
    for (const channel of primary.filter(channel => channel !== "size")) {
      const field = continuousChannel(channel) ? `channel:${channel}` : `field:${candidates[0]?.encoding?.[channel]?.field}`;
      if (!primaryBlocks.has(field)) primaryBlocks.set(field, []);
      primaryBlocks.get(field).push(channel);
    }
    const grouped = [...primaryBlocks.values()];
    if (primary.includes("size")) {
      const categorical = grouped.find(block => !block.some(continuousChannel));
      if (categorical) categorical.push("size");
      else grouped.push(["size"]);
    }
    const blocks = point ? [...grouped, ...sampled.map(channel => [channel])]
      : channels.map(channel => [channel]);
    const steps = blocks.flatMap(block => resolveRawLegendCreationPlan(program,
      block.includes("color") && (representation !== undefined || gradient !== undefined) ? { ...args, channels: block }
        : { ...common, channels: block,
          ...(block.some(continuousChannel) && gradient !== undefined ? { gradient } : {}),
          ...(block.some(channel => !["size", "opacity", "strokeWidth"].includes(channel) &&
            ["ordinal", "band", "point"].includes(findSemanticScale(program, candidates[0]?.encoding?.[channel]?.scale)?.type)) && overflow !== undefined ? { overflow } : {}),
          ...(block.some(channel => ["size", "opacity", "strokeWidth"].includes(channel)) && count !== undefined ? { count } : {}) }, layers).steps);
    return { steps, finish: "always" };
  }
  // Two independent sampled channels can remain when color becomes constant.
  // Their existing owners create separate blocks; there is no categorical block.
  if (channels === undefined && candidates.length === 1 &&
      isSizeLegendPoint(candidates[0]) && isOpacityLegendLayer(candidates[0]) &&
      !["color", "stroke", "shape", "strokeDash", "strokeWidth"].some(channel =>
        candidates[0].encoding?.[channel]?.scale !== undefined)) {
    const target = candidates[0].id;
    return { steps: [resolveStandaloneLegendStep({ ...args, target }, "size"),
      { op: "createOpacityLegend", args: { ...args, target } }], finish: "auto" };
  }
  const standalone = [
    ["size", isSizeLegendPoint, ["color", "stroke", "shape", "strokeDash", "opacity"]],
    ["strokeWidth", isStrokeWidthLegendLayer, args.target === undefined
      ? ["color", "stroke", "shape", "strokeDash", "size", "opacity"]
      : ["color", "stroke", "shape", "strokeDash", "opacity"]],
    ["opacity", isOpacityLegendLayer,
      ["color", "stroke", "shape", "strokeDash", "size"]]
  ];
  for (const [kind, eligible, otherChannels] of standalone) {
    const explicit = channels?.length === 1 && channels[0] === kind;
    const inferred = channels === undefined && candidates.filter(eligible).length === 1 &&
      !candidates.some(layer => otherChannels.some(channel => layer.encoding?.[channel]?.scale !== undefined));
    if (explicit || inferred) {
      const step = kind === "opacity" ? { op: "createOpacityLegend", args }
        : resolveStandaloneLegendStep(args, kind);
      return { steps: [step], finish: "auto" };
    }
  }
  const continuousColorCandidates = candidates.filter(layer => {
    const encoding = ["point", "bar", "rect", "text", "area"].includes(layer.mark?.type)
      ? layer.encoding?.color
      : undefined;
    const scale = findSemanticScale(program, encoding?.scale);
    return isContinuousColorScaleType(scale?.type);
  });
  const continuousColor = requestedCandidate(
    program, args.target, continuousColorCandidates
  );
  if (args.representation !== undefined && channels !== undefined && channels.length > 1) {
    if (!continuousColor || !channels.includes("color")) throw new Error("Legend representation requires selected continuous color.");
    const { representation, values, count, symbol, gradient, ...common } = args;
    const steps = channels.flatMap(channel => resolveRawLegendCreationPlan(program,
      channel === "color" ? { ...args, channels: [channel] }
        : { ...common, channels: [channel] }, layers).steps);
    return { steps, finish: "always" };
  }
  if (
    (channels?.length === 1 && channels[0] === "color" && continuousColor) ||
    (channels === undefined && continuousColor)
  ) {
    return { steps: [{ op: "createGradientLegend", args }], finish: "auto" };
  }
  const intervalColorCandidates = candidates.filter(layer => {
    const encoding = ["point", "bar", "rect", "text", "area"].includes(layer.mark?.type) ? layer.encoding?.color : undefined;
    const scale = findSemanticScale(program, encoding?.scale);
    return ["quantize", "quantile", "threshold"].includes(scale?.type);
  });
  if (
    (channels?.length === 1 && channels[0] === "color" &&
      intervalColorCandidates.length > 0) ||
    (channels === undefined && intervalColorCandidates.length > 0)
  ) {
    return { steps: [{ op: "createIntervalLegend", args }], finish: "auto" };
  }
  const continuousStrokeCandidates = candidates.filter(layer => {
    const scale = findSemanticScale(program, layer.encoding?.stroke?.scale);
    return isContinuousColorScaleType(scale?.type);
  });
  const continuousStroke = requestedCandidate(
    program,
    args.target,
    continuousStrokeCandidates
  );
  if (
    (channels?.length === 1 && channels[0] === "stroke" && continuousStroke) ||
    (channels === undefined && continuousStroke &&
      !["color", "shape", "strokeDash", "size", "opacity", "strokeWidth"].some(
        channel => continuousStroke.encoding?.[channel]?.scale !== undefined
      ))
  ) {
    return {
      steps: [{ op: "createStrokeGradientLegend", args: {
        ...args,
        channels: ["stroke"]
      } }],
      finish: "auto"
    };
  }
  const intervalStrokeCandidates = candidates.filter(layer => {
    const scale = findSemanticScale(program, layer.encoding?.stroke?.scale);
    return ["quantize", "quantile", "threshold"].includes(scale?.type);
  });
  if (
    (channels?.length === 1 && channels[0] === "stroke" &&
      intervalStrokeCandidates.length > 0) ||
    (channels === undefined && intervalStrokeCandidates.length === 1)
  ) {
    return {
      steps: [{ op: "createStrokeIntervalLegend", args: {
        ...args,
        channels: ["stroke"]
      } }],
      finish: "auto"
    };
  }
  const wantsShape = channels?.includes("shape") === true;
  const wantsSize = channels?.includes("size") === true;
  const pointCandidates = candidates.filter(layer =>
    layer.mark?.type === "point" &&
    (channels === undefined
      ? ["color", "shape"].some(channel => layer.encoding?.[channel]?.scale !== undefined)
      : (wantsShape || wantsSize) && channels.every(channel =>
        ["color", "stroke", "shape", "size"].includes(channel) && layer.encoding?.[channel]?.scale !== undefined))
  );
  const requestedPoint = requestedCandidate(program, args.target, pointCandidates);
  const inferredSize = channels === undefined && pointCandidates.some(isSizeLegendPoint);
  if ((wantsSize || inferredSize) && requestedPoint === undefined) {
    throw new Error("Combined size legend requires one eligible point mark or an explicit target.");
  }
  if (requestedPoint !== undefined) {
    if (Object.hasOwn(args, "values")) {
      throw new Error(
        "Combined and categorical legends require a channel block selector for exact values."
      );
    }
    const { count, ...categoricalArgs } = args;
    const combined = requestedPoint.encoding?.size?.scale !== undefined &&
      (channels === undefined || wantsSize);
    if (count !== undefined && !combined) {
      throw new Error("Legend count requires a selected size legend.");
    }
    if (combined && categoricalArgs.layout === "legacy-bottom") {
      throw new Error('Combined size legends require layout "edge".');
    }
    const inferredChannels = ["color", "stroke", "shape"].filter(
      channel => requestedPoint.encoding?.[channel]?.scale !== undefined
    );
    const { format: sizeFormat, ...categoricalLabels } = categoricalArgs.labels ?? {};
    if (!combined && sizeFormat !== undefined && sizeFormat !== "auto") {
      throw new Error("Categorical legend labels do not accept format.");
    }
    const steps = [{ op: "createCategoricalLegend", args: {
      ...categoricalArgs,
      ...(categoricalArgs.labels === undefined ? {} : { labels: categoricalLabels }),
      target: requestedPoint.id,
      channels: channels?.filter(channel => channel !== "size") ?? inferredChannels
    } }];
    if (combined) steps.push({ op: "createSizeLegend", args: {
      target: requestedPoint.id,
      ...(count === undefined ? {} : { count }),
      ...(categoricalArgs.overflow !== undefined &&
        findSemanticScale(program, requestedPoint.encoding.size.scale)?.type === "ordinal"
        ? { overflow: categoricalArgs.overflow } : {}),
      ...(categoricalArgs.labels === undefined ? {} : { labels: {
        ...(categoricalArgs.labels.offset === undefined ? {} : { offset: categoricalArgs.labels.offset }),
        ...(sizeFormat === undefined ? {} : { format: sizeFormat })
      } }),
      inheritAppearance: true
    } });
    // Validate both content owners before any component action starts.
    resolveCategoricalLegendConfig(program, steps[0].args);
    if (combined) {
      const size = resolveSizeLegendConfig(program, steps[1].args);
      const existing = program.guideConfigs.legend?.size;
      if (existing !== undefined && existing.target !== size.target) {
        throw new Error("Combined point series legend requires the active size legend to share its target.");
      }
      if (existing !== undefined && count !== undefined &&
        readLegendSampling(existing).count !== count) {
        throw new Error("Existing size legend count must be edited before recreating the categorical block.");
      }
    }
    return { steps, combined, finish: combined ? "always" : "auto" };
  }
  return { steps: [{ op: "createCategoricalLegend", args }], finish: "auto" };
}

export function resolveLegendCreationPlan(program, args = {}, layers = program.semanticSpec.layers, internalChannels) {
  validateLegendGroupOptions(args);
  const { blockLayout: _layout, at: _at, ...raw } = args;
  const groups = program.guideConfigs.legendGroups ?? {};
  if (Object.keys(groups).length > 0 && raw.position === undefined) {
    const target = creationLegendTarget(program, args);
    const placement = groups[target]?.placement;
    if (placement?.position !== undefined) {
      raw.position = placement.position;
      raw.align = args.align ?? placement.align;
      raw.offset = args.offset ?? placement.offset;
    }
  }
  if (raw.position === undefined && args.direction === "horizontal" &&
      (args.at !== undefined || Object.keys(groups).length > 0)) raw.position = "top";
  const initial = resolveRawLegendCreationPlan(program, raw, layers, internalChannels);
  const inherited = Object.keys(program.guideConfigs.legendGroups ?? {}).length > 0;
  const corner = PLOT_LEGEND_POSITIONS.includes(args.position) &&
    (initial.steps.length > 1 || initial.steps[0]?.op !== "createCategoricalLegend" ||
      Object.keys(program.guideConfigs.legend ?? {}).length > 0);
  if (args.blockLayout === undefined && args.at === undefined && !inherited && !corner) return initial;
  const target = creationLegendTarget(program, args);
  const first = initial.steps[0];
  const nativeOffset = program.guideConfigs.legendGroups?.[target] !== undefined ? 30 : first?.op === "createCategoricalLegend"
    ? resolveCategoricalLegendConfig(program, first.args).offset
    : first?.op === "createSizeLegend" ? resolveSizeLegendConfig(program, first.args).offset : 30;
  const prepared = prepareLegendGroup(program, args, target, { creation: true, corner, nativeOffset });
  if (!prepared.grouped) return initial;
  if (prepared.options.position === undefined && raw.position !== undefined) {
    prepared.options.position = raw.position;
  }
  return { ...resolveRawLegendCreationPlan(prepared.program, prepared.options, layers, internalChannels),
    legendGroup: { target, config: prepared.program.guideConfigs.legendGroups[target] } };
}

export function applyLegendCreationPlan(program, plan) {
  if (plan.steps.length === 0) return program;
  let next = plan.legendGroup === undefined ? program : program._withMaterializationConfig(
    ["guides", "legendGroups", plan.legendGroup.target], plan.legendGroup.config);
  for (const step of plan.steps) {
    const existingSize = next.guideConfigs.legend?.size;
    if (plan.combined && existingSize !== undefined && step.op === "createCategoricalLegend") {
      next = next._withLegendConfig("size", { ...existingSize, inheritPosition: true });
    }
    // The plan already validated that a retained size block is compatible.
    if (!(plan.combined && step.op === "createSizeLegend" && existingSize !== undefined)) {
      next = step.op === "createColorSizeLegend" ? createColorSizeLegendFromConfig(next,resolveColorSizeConfig(next,step.args)) : next[step.op](step.args);
    }
  }
  return plan.finish === "always" ? next.rematerializeLegend()
    : plan.finish === "auto" ? finishLegend(next) : next;
}

export const createLegend = /* @__PURE__ */ action(
  { op: "createLegend", description: "Create an inferred legend for selected channels." },
  withGuideLayoutValidation(function (args = {}) {
    return recordLegendOffsetIntent(this, applyLegendCreationPlan(this, resolveLegendCreationPlan(this, args)), args, { creation: true });
  })
);

export const removeCategoricalLegend = /* @__PURE__ */ action(
  {
    op: "removeCategoricalLegend",
    description: "Remove the active categorical legend and its concrete components."
  },
  withGuideLayoutValidation(function (args = {}) {
    noOptions(args, "removeCategoricalLegend");
    const entries = ["series", "color", "stroke"]
      .filter(kind => this.guideConfigs.legend?.[kind] !== undefined);
    if (entries.length === 0) return this;
    if (entries.length !== 1) {
      throw new Error("removeCategoricalLegend requires one active categorical legend.");
    }
    const kind = entries[0];
    const prefix = `${kind}Legend`;
    const targets = Object.keys(this.graphicSpec.objects)
      .filter(id => id.startsWith(prefix));
    let next = this.editSemantic({
      property: `guide.legend.${kind}`,
      remove: true
    });
    for (const target of targets) {
      next = next.editGraphics({ target, remove: true });
    }
    return next._withoutMaterializationConfig(["guides", "legend", kind]);
  })
);
