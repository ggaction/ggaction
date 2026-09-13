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
  hasLegendLane,
  hasMultiSideLegendLane
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
  return hasLegendLane(program) ? program.rematerializeLegend() : program;
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

export const rematerializeLegend = action(
  { op: "rematerializeLegend", description: "Rematerialize every existing legend component." },
  withGuideLayoutValidation(function (args = {}) {
    noOptions(args, "rematerializeLegend");
    let next = this;
    const categoricalKinds = ["series", "color", "stroke"].filter(
      kind => this.guideConfigs.legend?.[kind] !== undefined
    );
    for (const kind of categoricalKinds) {
      const stored = next.guideConfigs.legend[kind];
      const definition = resolveCurrentDefinition(next, stored);
      const symbol = stored.inferredSymbol
        ? normalizeRecipe(resolveLegendSymbol(next, findLayer(next, stored.target), definition.channels), kind)
        : stored.symbol;
      const symbolChanged = !sameGuideValue(symbol, stored.symbol);
      const changed = symbolChanged ||
        !sameValues(stored.channels, definition.channels) ||
        !sameValues(stored.domain, definition.domain) ||
        !sameValues(stored.scales, definition.scales) ||
        stored.field !== definition.field ||
        stored.title !== definition.title;
      next = changed
        ? next._withLegendConfig(kind, {
            ...stored,
            symbol,
            channels: definition.channels,
            scales: definition.scales,
            field: definition.field,
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
    if (hasMultiSideLegendLane(next)) {
      next = next.rematerializeSideLegendLane();
    }
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
    args.title,
    args.order === undefined ? undefined : normalizeLegendOrder(args.order)
  );
  const options = normalizeOptions({ ...args,
    symbol: resolveLegendSymbol(program, layer, definition.channels, args.symbol)
  }, definition.kind);
  const config = {
    target: layer.id,
    ...definition,
    inferredTitle: !Object.hasOwn(args, "title"),
    inferredSymbol: args.symbol === undefined || args.symbol === "auto",
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
    border: options.border,
    titleVisible: true
  };
  return config;
}

export const createCategoricalLegend = action(
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

export function resolveLegendCreationPlan(program, args = {}, layers = program.semanticSpec.layers) {
  validateOptionObject(args, undefined, "createLegend");
  const candidates = args.target === undefined ? layers : layers.filter(layer => layer.id === args.target);
  const channels = args.channels;
  if (channels !== undefined) validateLegendChannels(channels, "createLegend");
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
    const encoding = ["point", "bar", "rect"].includes(layer.mark?.type)
      ? layer.encoding?.color
      : undefined;
    const scale = findSemanticScale(program, encoding?.scale);
    return scale?.type === "sequential";
  });
  const continuousColor = requestedCandidate(
    program, args.target, continuousColorCandidates
  );
  if (
    (channels?.length === 1 && channels[0] === "color" && continuousColor) ||
    (channels === undefined && continuousColor)
  ) {
    return { steps: [{ op: "createGradientLegend", args }], finish: "auto" };
  }
  const intervalColorCandidates = candidates.filter(layer => {
    const encoding = ["point", "bar", "rect"].includes(layer.mark?.type) ? layer.encoding?.color : undefined;
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
    return scale?.type === "sequential";
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

export function applyLegendCreationPlan(program, plan) {
  if (plan.steps.length === 0) return program;
  let next = program;
  for (const step of plan.steps) {
    const existingSize = next.guideConfigs.legend?.size;
    // The plan already validated that a retained size block is compatible.
    if (!(plan.combined && step.op === "createSizeLegend" && existingSize !== undefined)) {
      next = next[step.op](step.args);
    }
  }
  return plan.finish === "always" ? next.rematerializeLegend()
    : plan.finish === "auto" ? finishLegend(next) : next;
}

export const createLegend = action(
  { op: "createLegend", description: "Create an inferred legend for selected channels." },
  withGuideLayoutValidation(function (args = {}) {
    return applyLegendCreationPlan(this, resolveLegendCreationPlan(this, args));
  })
);

export const removeCategoricalLegend = action(
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
