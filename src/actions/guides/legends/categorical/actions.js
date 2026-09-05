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
    const hasCategorical =
      this.guideConfigs.legend?.series !== undefined ||
      this.guideConfigs.legend?.color !== undefined;
    if (hasCategorical) {
      const { kind, config } = activeConfig(this);
      const definition = resolveCurrentDefinition(this, config);
      const symbol = config.inferredSymbol
        ? normalizeRecipe(resolveLegendSymbol(this, findLayer(this, config.target), definition.channels), kind)
        : config.symbol;
      const symbolChanged = !sameGuideValue(symbol, config.symbol);
      const changed = symbolChanged ||
        !sameValues(config.channels, definition.channels) ||
        !sameValues(config.domain, definition.domain) ||
        !sameValues(config.scales, definition.scales) ||
        config.field !== definition.field ||
        config.title !== definition.title;
      next = changed
        ? this._withLegendConfig(kind, {
            ...config,
            symbol,
            channels: definition.channels,
            scales: definition.scales,
            field: definition.field,
            title: definition.title,
            domain: definition.domain
          })
        : this;
      if (kind === "series") {
        if (!sameValues(
          this.semanticSpec.guides.legend.series.scales,
          definition.scales
        )) {
          next = next.editSemantic({
            property: "guide.legend.series.scales",
            value: definition.scales
          });
        }
        if (this.semanticSpec.guides.legend.series.title !== definition.title) {
          next = next.editSemantic({
            property: "guide.legend.series.title",
            value: definition.title
          });
        }
      } else {
        if (this.semanticSpec.guides.legend.color.scale !== definition.scales[0]) {
          next = next.editSemantic({
            property: "guide.legend.color.scale",
            value: definition.scales[0]
          });
        }
        if (this.semanticSpec.guides.legend.color.title !== definition.title) {
          next = next.editSemantic({
            property: "guide.legend.color.title",
            value: definition.title
          });
        }
      }
      if (symbolChanged) {
        resolveLayout(next, next.guideConfigs.legend[kind]);
        next = reconcileCategoricalSymbols(next, config, next.guideConfigs.legend[kind]);
      }
      if (config.border !== false) next = next.rematerializeLegendBackground();
      next = next
        .rematerializeLegendSymbols()
        .rematerializeLegendLabels();
      if (config.titleVisible !== false) next = next.rematerializeLegendTitle();
      const hasHighlight = Object.values(
        next.materializationConfigs.highlights ?? {}
      ).some(highlight => highlight.target === config.target);
      if (hasHighlight) next = next.rematerializeLegendHighlights();
    }
    for (const policy of legendResourcePolicies()) {
      if (
        policy.rematerializeOp !== undefined &&
        this.guideConfigs.legend?.[policy.kind] !== undefined
      ) {
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
    if (
      this.semanticSpec.guides.legend?.series !== undefined ||
      this.semanticSpec.guides.legend?.color !== undefined
    ) {
      throw new Error("createCategoricalLegend requires a missing legend.");
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
    ["size", isSizeLegendPoint, ["color", "shape", "strokeDash", "opacity"]],
    ["strokeWidth", isStrokeWidthLegendLayer, args.target === undefined
      ? ["color", "shape", "strokeDash", "size", "opacity"]
      : ["color", "shape", "strokeDash", "opacity"]],
    ["opacity", isOpacityLegendLayer,
      ["color", "shape", "strokeDash", "size"]]
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
  const wantsShape = channels?.includes("shape") === true;
  const wantsSize = channels?.includes("size") === true;
  const pointCandidates = candidates.filter(layer =>
    layer.mark?.type === "point" &&
    (channels === undefined
      ? ["color", "shape"].some(channel => layer.encoding?.[channel]?.scale !== undefined)
      : (wantsShape || wantsSize) && channels.every(channel =>
        ["color", "shape", "size"].includes(channel) && layer.encoding?.[channel]?.scale !== undefined))
  );
  const requestedPoint = requestedCandidate(program, args.target, pointCandidates);
  const inferredSize = channels === undefined && pointCandidates.some(isSizeLegendPoint);
  if ((wantsSize || inferredSize) && requestedPoint === undefined) {
    throw new Error("Combined size legend requires one eligible point mark or an explicit target.");
  }
  if (requestedPoint !== undefined) {
    const { count, ...categoricalArgs } = args;
    const combined = requestedPoint.encoding?.size?.scale !== undefined &&
      (channels === undefined || wantsSize);
    if (count !== undefined && !combined) {
      throw new Error("Legend count requires a selected size legend.");
    }
    if (combined && categoricalArgs.layout === "legacy-bottom") {
      throw new Error('Combined size legends require layout "edge".');
    }
    const inferredChannels = ["color", "shape"].filter(
      channel => requestedPoint.encoding?.[channel]?.scale !== undefined
    );
    const steps = [{ op: "createCategoricalLegend", args: {
      ...categoricalArgs,
      target: requestedPoint.id,
      channels: channels?.filter(channel => channel !== "size") ?? inferredChannels
    } }];
    if (combined) steps.push({ op: "createSizeLegend", args: {
      target: requestedPoint.id,
      ...(count === undefined ? {} : { count }),
      ...(categoricalArgs.labels?.offset === undefined ? {} : { labels: { offset: categoricalArgs.labels.offset } }),
      inheritAppearance: categoricalArgs.position === "left" ||
        categoricalArgs.labels !== undefined || categoricalArgs.titleStyle !== undefined
    } });
    // Validate both content owners before any component action starts.
    resolveCategoricalLegendConfig(program, steps[0].args);
    if (combined) {
      const size = resolveSizeLegendConfig(program, steps[1].args);
      const existing = program.guideConfigs.legend?.size;
      if (existing !== undefined && existing.target !== size.target) {
        throw new Error("Combined point series legend requires the active size legend to share its target.");
      }
      if (existing !== undefined && count !== undefined && existing.count !== count) {
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
    const entries = ["series", "color"]
      .filter(kind => this.guideConfigs.legend?.[kind] !== undefined);
    if (entries.length === 0) return this;
    if (entries.length !== 1) {
      throw new Error("removeCategoricalLegend requires one active categorical legend.");
    }
    const kind = entries[0];
    const prefix = kind === "series" ? "seriesLegend" : "colorLegend";
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
