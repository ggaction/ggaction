import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { resolveLegendStepConfig } from "./creation.js";
import { normalizeLegendOrder } from "../../../grammar/categoryOrder.js";
import { resolveDefinition } from "./categorical/resolve.js";
import { action } from "../../../core/action.js";
import {
  validateOptionObject
} from "../../../core/validation.js";
import { normalizeOptions } from "./categorical/options.js";
import { resolveLegendSymbol } from "./categorical/recipes.js";
import { resolveLayout } from "./categorical/layout.js";
import { resolveLegendCreationPlan } from "./categorical/actions.js";
import { categoricalSymbolIds, reconcileCategoricalSymbols, createCategoricalLegendFromConfig, resolveCategoricalLegendRevision, removeLegendKinds } from "./lifecycle.js";
import { createGradientLegendFromConfig } from "./continuous/gradient.js";
import {
  normalizeItemLegendLayout,
  normalizeLegendBorder,
  normalizeLegendTextOptions,
  normalizeLegendTitleOptions,
  normalizeContinuousLegend,
  validatePositive
} from "./continuous/common.js";
import { normalizeOpacitySymbol, createOpacityLegendFromConfig } from "./continuous/opacity.js";
import { normalizeIntervalLegend, resolveIntervalConfig, resolveIntervalLayout, createIntervalLegendFromConfig } from "./continuous/interval.js";
import {
  createStrokeGradientLegendFromConfig,
  createStrokeIntervalLegendFromConfig,
  resolveStrokeIntervalConfig,
  resolveStrokeIntervalLayout
} from "./continuous/stroke.js";
import { findLayer } from "../../../selectors/layers.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { resolveLegendTarget, validateLegendChannels } from "./target.js";
import { isEnumeratedSizeScaleType } from "../../../grammar/scales/index.js";
import { SIZE_LEGEND_LABELS, SIZE_LEGEND_TITLE_STYLE, resolveSizeLegendLayout, createSizeLegendFromConfig } from "./size.js";
import {
  STROKE_WIDTH_LEGEND_LABELS,
  STROKE_WIDTH_LEGEND_TITLE_STYLE,
  resolveStrokeWidthLegendLayout,
  createStrokeWidthLegendFromConfig
} from "./strokeWidth.js";
import { normalizeLegendSampling } from "./sampling.js";
import { planLegendBlockTransitions } from "./transition.js";

const OPTIONS = Object.freeze([
  "target", "channels", "position", "layout", "align", "direction", "columns", "offset",
  "titlePosition", "title", "symbol", "labels", "titleStyle", "itemGap",
  "border", "count", "values", "gradient", "order", "overflow"
]);

function mergeObject(previous, patch) {
  return patch === undefined
    ? previous
    : { ...previous, ...patch };
}

function mergeBorder(previous, patch) {
  if (patch === undefined) return previous;
  if (patch === false || patch === true) return patch;
  return previous === false ? patch : { ...previous, ...patch };
}

function reconcileGraphic(program, id, shouldExist, definition) {
  const exists = program.graphicSpec.objects[id] !== undefined;
  if (exists && !shouldExist) return program.editGraphics({ target: id, remove: true });
  if (!exists && shouldExist) {
    return program.createGraphics({
      id,
      ...definition,
      ...resolveLegendGraphicPlacement(program, {
        ...(definition.before === undefined ? {} : { before: definition.before }),
        ...(definition.after === undefined ? {} : { after: definition.after })
      })
    });
  }
  return program;
}

function resolveContinuousEdit(program, kind, previous, args) {
  const gradient = ["gradient", "strokeGradient"].includes(kind);
  const allowed = gradient
    ? ["target", "position", "align", "offset", "title", "labels",
      "titleStyle", "titlePosition", "border", "count", "gradient"]
    : ["target", "position", "align", "offset", "title", "symbol", "labels",
      "titleStyle", "titlePosition", "itemGap", "border", "count", "values"];
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) throw new Error(`${kind} legend does not accept ${key}.`);
  }
  const titleMode = args.title;
  const inferredTitle = titleMode === "auto"
    ? true
    : typeof titleMode === "string" ? false : previous.inferredTitle;
  const titleVisible = titleMode === false ? false
    : titleMode === undefined ? previous.titleVisible !== false : true;
  const layer = findLayer(program, previous.target);
  const channel = kind === "gradient" ? "color"
    : kind === "strokeGradient" ? "stroke" : "opacity";
  const inferred = layer?.encoding?.[channel]?.field;
  const title = titleMode === "auto"
    ? inferred
    : typeof titleMode === "string" ? titleMode : previous.title;
  const titlePosition = args.titlePosition ?? previous.titlePosition;
  const enteringInline = kind === "opacity" &&
    titlePosition === "left" && previous.titlePosition !== "left";
  const labels = mergeObject(previous.labels, args.labels);
  const sampling = gradient ? undefined : normalizeLegendSampling(args, {
    previous,
    operation: "edit",
    label: "Opacity legend"
  });
  const normalized = normalizeContinuousLegend({
    target: previous.target,
    position: args.position ?? previous.position,
    align: args.align ?? previous.align,
    offset: args.offset ?? previous.offset,
    ...(gradient ? { count: args.count ?? previous.count } : {}),
    titlePosition,
    title,
    labels: enteringInline && args.labels?.offset === undefined
      ? { ...labels, offset: 8 }
      : labels,
    titleStyle: mergeObject(previous.titleStyle, args.titleStyle),
    border: mergeBorder(previous.border, args.border),
    ...(kind === "opacity" ? {
      itemGap: args.itemGap ?? (enteringInline ? 20 : previous.itemGap),
      symbol: args.symbol ?? previous.symbol
    } : {})
  }, gradient ? "gradient" : kind);
  const { count: _legacyCount, ...canonicalPrevious } = previous;
  const config = {
    ...(gradient ? previous : canonicalPrevious),
    ...normalized,
    ...(gradient ? {} : { sampling }),
    inferredTitle,
    titleVisible
  };
  if (gradient) {
    const gradient = mergeObject(previous.gradient, args.gradient);
    validatePositive(gradient.length, "Gradient length");
    validatePositive(gradient.thickness, "Gradient thickness");
    config.gradient = gradient;
  } else {
    config.symbol = normalizeOpacitySymbol(args.symbol ?? previous.symbol);
  }
  return { config, titleMode, title, titleVisible };
}

function editContinuous(program, kind, previous, args) {
  const { config, titleMode, title, titleVisible } = resolveContinuousEdit(program, kind, previous, args);
  const prefix = kind === "gradient" ? "colorGradient"
    : kind === "strokeGradient" ? "strokeGradient" : "opacityLegend";
  const semanticKind = kind === "gradient" ? "color"
    : kind === "strokeGradient" ? "stroke" : "opacity";
  let next = program;
  if (titleMode === "auto" || typeof titleMode === "string") {
    next = next.editSemantic({
      property: `guide.legend.${semanticKind}.title`,
      value: title
    });
  }
  next = next._withLegendConfig(kind, config);
  next = reconcileGraphic(next, `${prefix}Background`, config.border !== false, {
    type: "rect",
    before: ["gradient", "strokeGradient"].includes(kind)
      ? `${prefix}Strips`
      : "opacityLegendSymbols"
  });
  next = reconcileGraphic(next, `${prefix}Title`, titleVisible, { type: "text" });
  return next.rematerializeLegend();
}

function resolveIntervalEdit(program, previous, args, channel = "color") {
  for (const key of Object.keys(args)) {
    if (![
      "target", "position", "align", "direction", "offset", "title",
      "symbol", "labels", "titleStyle", "itemGap", "border", "layout", "columns", "titlePosition"
    ].includes(key)) {
      throw new Error(`interval legend does not accept ${key}.`);
    }
  }
  const titleMode = args.title;
  const layer = findLayer(program, previous.target);
  const inferredTitle = titleMode === "auto"
    ? true
    : typeof titleMode === "string" ? false : previous.inferredTitle;
  const titleVisible = titleMode === false
    ? false
    : titleMode === undefined ? previous.titleVisible !== false : true;
  const title = titleMode === "auto"
    ? layer?.encoding?.[channel]?.field
    : typeof titleMode === "string" ? titleMode : previous.title;
  const normalized = normalizeIntervalLegend({
    target: previous.target,
    position: args.position ?? previous.position,
    align: args.align ?? previous.align,
    direction: args.direction ?? (args.position !== undefined && args.position !== previous.position
      ? undefined : previous.direction),
    layout: args.layout === undefined ? previous.layout : args.layout,
    columns: args.columns ?? previous.columns,
    titlePosition: args.titlePosition ?? previous.titlePosition,
    offset: args.offset ?? previous.offset,
    title,
    symbol: mergeObject(previous.symbol, args.symbol),
    labels: mergeObject(previous.labels, args.labels),
    titleStyle: mergeObject(previous.titleStyle, args.titleStyle),
    itemGap: args.itemGap ?? previous.itemGap,
    border: mergeBorder(previous.border, args.border)
  });
  const config = {
    ...previous,
    ...normalized,
    inferredTitle,
    titleVisible,
    ...(channel === "stroke" && args.symbol?.strokeWidth !== undefined
      ? { inferredStrokeWidth: false }
      : {})
  };
  const resolved = channel === "stroke"
    ? resolveStrokeIntervalConfig(program, config)
    : resolveIntervalConfig(program, config);
  (channel === "stroke" ? resolveStrokeIntervalLayout : resolveIntervalLayout)(
    program,
    resolved.config,
    resolved.scale
  );
  return { normalized, config, titleMode, title, titleVisible };
}

function editInterval(program, previous, args, channel = "color") {
  const kind = channel === "stroke" ? "strokeInterval" : "interval";
  const prefix = channel === "stroke" ? "strokeInterval" : "colorLegend";
  const { normalized, config, titleMode, title, titleVisible } = resolveIntervalEdit(program, previous, args, channel);
  let next = program._withLegendConfig(kind, config);
  if (titleMode === "auto" || typeof titleMode === "string") {
    next = next.editSemantic({
      property: `guide.legend.${channel}.title`,
      value: title
    });
  }
  next = reconcileGraphic(next, `${prefix}Title`, titleVisible, {
    type: "text"
  });
  next = reconcileGraphic(
    next,
    `${prefix}Background`,
    normalized.border !== false,
    { type: "rect", before: `${prefix}Symbols` }
  );
  return next.rematerializeLegend();
}

function resolveSampledLegendEdit(program, kind, previous, args) {
  const size = kind === "size";
  const label = size ? "size" : "stroke-width";
  const allowed = ["target", "title", "count", "values", "labels", "titleStyle",
    "position", "layout", "align", "direction", "columns", "titlePosition", "offset", "itemGap", "border"];
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) {
      throw new Error(`${label} legend does not accept ${key}.`);
    }
  }
  const discrete = size &&
    isEnumeratedSizeScaleType(program.resolvedScales[previous.scale]?.type);
  if (discrete && (args.count !== undefined || args.values !== undefined)) {
    throw new Error("Discrete size legends do not support count or exact values.");
  }
  const sampling = discrete ? undefined : normalizeLegendSampling(args, {
    previous,
    operation: "edit",
    label: `${size ? "Size" : "Stroke-width"} legend`
  });
  const layer = findLayer(program, previous.target);
  const titleMode = args.title;
  const inferredTitle = titleMode === "auto"
    ? true
    : typeof titleMode === "string" ? false : previous.inferredTitle;
  const titleVisible = titleMode === false
    ? false
    : titleMode === undefined ? previous.titleVisible !== false : true;
  const title = titleMode === "auto"
    ? layer?.encoding?.[kind]?.field
    : typeof titleMode === "string" ? titleMode : previous.title;
  const { count: _legacyCount, ...continuousPrevious } = previous;
  const canonicalPrevious = discrete ? previous : continuousPrevious;
  const config = {
    ...canonicalPrevious,
    title,
    inferredTitle,
    titleVisible,
    ...(discrete ? {} : { sampling }),
    ...(size ? { inheritAppearance: false } : {}),
    labels: normalizeLegendTextOptions(
      args.labels,
      "editLegend.labels",
      previous.labels ?? (size ? SIZE_LEGEND_LABELS : STROKE_WIDTH_LEGEND_LABELS)
    ),
    titleStyle: normalizeLegendTitleOptions(
      args.titleStyle,
      "editLegend.titleStyle",
      previous.titleStyle ?? (size ? SIZE_LEGEND_TITLE_STYLE : STROKE_WIDTH_LEGEND_TITLE_STYLE)
    )
  };
  Object.assign(config, normalizeItemLegendLayout({ ...previous, ...args,
    direction: args.direction ?? (args.position !== undefined && args.position !== previous.position
      ? undefined : previous.direction) }));
  config.border = normalizeLegendBorder(mergeBorder(previous.border, args.border));
  (size ? resolveSizeLegendLayout : resolveStrokeWidthLegendLayout)(program, config);
  return { config, titleMode, title, titleVisible };
}

function editSampledLegend(program, kind, previous, args) {
  const { config, titleMode, title, titleVisible } = resolveSampledLegendEdit(program, kind, previous, args);
  const prefix = kind === "size" ? "sizeLegend" : "strokeWidthLegend";
  let next = program;
  if (titleMode === "auto" || typeof titleMode === "string") {
    next = next.editSemantic({
      property: `guide.legend.${kind}.title`,
      value: title
    });
  }
  next = next._withLegendConfig(kind, config);
  next = reconcileGraphic(next, `${prefix}Background`, config.border !== false, {
    type: "rect", before: `${prefix}Symbols`
  });
  next = reconcileGraphic(next, `${prefix}Title`, titleVisible, {
    type: "text", after: `${prefix}Labels`
  });
  return next.rematerializeLegend();
}

function resolveCompanionSizeEdit(program, previous, size, args) {
  if (size === undefined) return undefined;
  const discrete = isEnumeratedSizeScaleType(
    program.resolvedScales[size.scale]?.type
  );
  if (discrete && (args.count !== undefined || args.values !== undefined)) {
    throw new Error("Discrete size legends do not support count or exact values.");
  }
  const sampling = discrete ? undefined : normalizeLegendSampling(args, {
    previous: size,
    operation: "edit",
    label: "Size legend"
  });
  const { count: _legacyCount, ...continuousSize } = size;
  const canonicalSize = discrete ? size : continuousSize;
  const config = {
    ...canonicalSize,
    ...(discrete ? {} : { sampling })
  };
  if (args.labels === undefined && args.titleStyle === undefined) return config;
  const labels = size.inheritAppearance
    ? { ...previous.labels, offset: size.labels.offset } : size.labels ?? SIZE_LEGEND_LABELS;
  const titleStyle = size.inheritAppearance
    ? previous.titleStyle : size.titleStyle ?? SIZE_LEGEND_TITLE_STYLE;
  return { ...config, inheritAppearance: false,
    labels: normalizeLegendTextOptions(args.labels, "editLegend.labels", labels),
    titleStyle: normalizeLegendTitleOptions(args.titleStyle, "editLegend.titleStyle", titleStyle) };
}

function resolveCategoricalEdit(program, kind, previous, size, args, storedOrder = program.semanticSpec.guides.legend?.[kind]?.order) {
  if (args.values !== undefined) {
    throw new Error(
      "Combined and categorical legends require a channel block selector for exact values."
    );
  }
  if (args.gradient !== undefined) {
    throw new Error("Categorical legends do not accept gradient.");
  }
  if (args.count !== undefined && size === undefined) {
    throw new Error("Legend count requires an existing size legend.");
  }
  const titleMode = args.title;
  const inferredTitle = titleMode === "auto"
    ? true
    : typeof titleMode === "string" ? false : previous.inferredTitle;
  const titleVisible = titleMode === false ? false
    : titleMode === undefined ? previous.titleVisible !== false : true;
  const title = titleMode === "auto"
    ? previous.field
    : typeof titleMode === "string" ? titleMode : previous.title;
  const mergedLabels = mergeObject(previous.labels, args.labels);
  if (mergedLabels.format !== undefined && mergedLabels.format !== "auto" && size === undefined) {
    throw new Error("Categorical legend labels do not accept format.");
  }
  const { format: _sizeFormat, ...categoricalLabels } = mergedLabels;
  const inferredSymbol = args.symbol === undefined
    ? previous.inferredSymbol
    : args.symbol === "auto";
  const normalized = normalizeOptions({
    target: previous.target,
    channels: previous.channels,
    ...(args.overflow === undefined && previous.overflow === undefined ? {} : { overflow: args.overflow === undefined ? previous.overflow : args.overflow }),
    layout: args.layout === undefined ? previous.layout : args.layout,
    position: args.position ?? previous.position,
    align: args.align ?? previous.align,
    direction: args.direction ?? (args.position !== undefined && args.position !== previous.position
      ? undefined : previous.direction),
    ...(args.columns === undefined && previous.columns === undefined
      ? {} : { columns: args.columns ?? previous.columns }),
    offset: args.offset ?? previous.offset,
    titlePosition: args.titlePosition ?? previous.titlePosition,
    title,
    symbol: args.symbol === undefined ? previous.symbol
      : resolveLegendSymbol(
          program,
          findLayer(program, previous.target),
          previous.channels,
          args.symbol,
          kind
        ),
    labels: categoricalLabels,
    titleStyle: mergeObject(previous.titleStyle, args.titleStyle),
    itemGap: args.itemGap ?? previous.itemGap,
    border: mergeBorder(previous.border, args.border)
  }, kind, { internalSymbol: inferredSymbol });
  const config = {
    ...previous,
    ...normalized,
    inferredTitle,
    inferredSymbol,
    titleVisible
  };
  const order = args.order === undefined
    ? storedOrder
    : normalizeLegendOrder(args.order);
  // Resolve the final domain before changing semantic/config/graphic state.
  resolveDefinition(program, findLayer(program, previous.target), previous.channels, title, order);
  return { config, order, titleMode, title, titleVisible, sizeConfig: resolveCompanionSizeEdit(program, previous, size, args) };
}

function editCategorical(program, kind, previous, size, args) {
  const { config, order, titleMode, title, titleVisible, sizeConfig } = resolveCategoricalEdit(program, kind, previous, size, args);
  const newSymbols = categoricalSymbolIds(config);
  let next = program;
  if (titleMode === "auto" || typeof titleMode === "string") {
    next = next.editSemantic({
      property: `guide.legend.${kind}.title`,
      value: title
    });
  }
  if (args.order !== undefined) {
    if (order === "scale") {
      if (program.semanticSpec.guides.legend?.[kind]?.order !== undefined) {
        next = next.editSemantic({ property: `guide.legend.${kind}.order`, remove: true });
      }
    } else {
      next = next.editSemantic({ property: `guide.legend.${kind}.order`, value: order });
    }
  }
  next = next._withLegendConfig(kind, config);
  next = reconcileCategoricalSymbols(next, previous, config);
  next = reconcileGraphic(next, `${kind}LegendBackground`,
    config.border !== false, {
      type: "rect",
      before: [...newSymbols][0]
    });
  const titleId = `${kind}LegendTitle`;
  next = reconcileGraphic(next, titleId, titleVisible, {
    type: "text",
    ...(next.graphicSpec.objects.sizeLegendSymbols === undefined
      ? {} : { before: next.graphicSpec.objects.sizeLegendBackground === undefined
        ? "sizeLegendSymbols" : "sizeLegendBackground" })
  });
  if (size !== undefined) {
    next = next._withLegendConfig("size", sizeConfig);
  }
  return next.rematerializeLegend();
}


function editLegendContent(program, target, args) {
  validateLegendChannels(args.channels, "editLegend");
  const { channels, target: _target, ...patch } = args;
  const previous = program.guideConfigs.legend ?? {};
  const removed = Object.keys(previous).filter(kind => previous[kind].target === target);
  let view = removed.reduce((next, kind) => next._withoutMaterializationConfig(["guides", "legend", kind]), program);
  const creation = resolveLegendCreationPlan(view, { target, channels });
  const oldCategorical = removed.find(kind =>
    ["series", "color", "stroke"].includes(kind)
  );
  let plans = creation.steps.map(step => {
    const descriptor = resolveLegendStepConfig(view, step);
    const { kind } = descriptor;
    if (previous[kind] !== undefined && previous[kind].target !== target) {
      throw new Error(`Legend ${kind} content already belongs to another target.`);
    }
    if (["series", "color", "stroke"].includes(kind) && oldCategorical !== undefined) {
      const order = patch.order === undefined ? program.semanticSpec.guides.legend?.[oldCategorical]?.order
        : normalizeLegendOrder(patch.order);
      return { ...resolveCategoricalLegendRevision(view, oldCategorical, previous[oldCategorical],
        descriptor.config.channels, { order, validateLayout: false }), kind };
    }
    return { ...descriptor, config: previous[kind]?.target === target ? previous[kind] : descriptor.config };
  });
  const categorical = plans.find(plan =>
    ["series", "color", "stroke"].includes(plan.kind)
  );
  const size = plans.find(plan => plan.kind === "size");
  if (categorical !== undefined) {
    if (size !== undefined && previous.size?.target !== target) {
      size.config = { ...size.config, inheritAppearance: categorical.config.position === "left" ||
        patch.position === "left" || patch.labels !== undefined || patch.titleStyle !== undefined };
    }
    const edited = resolveCategoricalEdit(view, categorical.kind, categorical.config, size?.config, patch, categorical.order);
    categorical.config = edited.config;
    categorical.order = edited.order;
    if (size !== undefined) {
      size.config = edited.sizeConfig;
      if (categorical.config.layout === "legacy-bottom") {
        throw new Error('Combined size legends require layout "edge".');
      }
    }
  } else {
    const plan = plans[0];
    if (plan.kind === "size" || plan.kind === "strokeWidth") {
      plan.config = resolveSampledLegendEdit(view, plan.kind, plan.config, patch).config;
    } else if (["interval", "strokeInterval"].includes(plan.kind)) {
      plan.config = resolveIntervalEdit(
        view,
        plan.config,
        patch,
        plan.kind === "strokeInterval" ? "stroke" : "color"
      ).config;
    }
    else plan.config = resolveContinuousEdit(view, plan.kind, plan.config, patch).config;
  }
  plans = planLegendBlockTransitions(program, target, plans);
  // The complete final content and styles are validated before removing resources.
  for (const { kind, config } of plans) view = view._withLegendConfig(kind, config);
  if (categorical !== undefined) resolveLayout(view, categorical.config);
  let next = removeLegendKinds(program, removed);
  for (const { kind, config, order } of plans) {
    if (["series", "color", "stroke"].includes(kind)) {
      next = createCategoricalLegendFromConfig(next, config, order);
    }
    else next = ({ size: createSizeLegendFromConfig, strokeWidth: createStrokeWidthLegendFromConfig,
      gradient: createGradientLegendFromConfig, opacity: createOpacityLegendFromConfig,
      interval: createIntervalLegendFromConfig,
      strokeGradient: createStrokeGradientLegendFromConfig,
      strokeInterval: createStrokeIntervalLegendFromConfig })[kind](next, config);
  }
  return next.rematerializeLegend();
}

export const editLegend = /* @__PURE__ */ action(
  { op: "editLegend", description: "Edit one stable legend content, layout or appearance." },
  withGuideLayoutValidation(function (args = {}) {
    validateOptionObject(args, OPTIONS, "editLegend");
    const changes = Object.keys(args).filter(key => key !== "target");
    if (changes.length === 0) {
      throw new Error("editLegend requires at least one change.");
    }
    if (args.title !== undefined && args.title !== false && args.title !== "auto" && (
      typeof args.title !== "string" || args.title.length === 0
    )) {
      throw new TypeError('editLegend title must be a non-empty string, "auto", or false.');
    }
    const target = resolveLegendTarget(this, args.target, "editLegend");
    if (args.channels !== undefined) return editLegendContent(this, target, args);
    const configs = this.guideConfigs.legend ?? {};
    const ownedKinds = Object.keys(configs).filter(
      kind => configs[kind]?.target === target
    );
    if (args.values !== undefined && ownedKinds.length > 1) {
      throw new Error(
        "A target with multiple legend blocks requires a channel block selector for exact values."
      );
    }
    const categoricalKinds = ["series", "color", "stroke"].filter(
      kind => configs[kind]?.target === target
    );
    if (categoricalKinds.length > 1) {
      throw new Error(
        "editLegend requires channels when a target owns multiple categorical legend blocks."
      );
    }
    const categoricalKind = categoricalKinds[0];
    if (categoricalKind !== undefined) {
      return editCategorical(
        this,
        categoricalKind,
        configs[categoricalKind],
        configs.size?.target === target ? configs.size : undefined,
        args
      );
    }
    if (configs.interval?.target === target) {
      return editInterval(this, configs.interval, args);
    }
    if (configs.strokeInterval?.target === target) {
      return editInterval(this, configs.strokeInterval, args, "stroke");
    }
    if (configs.strokeWidth?.target === target) {
      return editSampledLegend(this, "strokeWidth", configs.strokeWidth, args);
    }
    if (configs.size?.target === target) {
      return editSampledLegend(this, "size", configs.size, args);
    }
    const continuousKind = ["gradient", "strokeGradient", "opacity"].find(
      kind => configs[kind]?.target === target
    );
    return editContinuous(this, continuousKind, configs[continuousKind], args);
  })
);
