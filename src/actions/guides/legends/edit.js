import { validateLegendCombine, validateMappedSizeShapeSymbol } from "../../../grammar/legendCombinations.js";
import { legendBlockDescriptors } from "./target.js";
import { editFacetParentLegend } from "../../../materialization/facetGuides/edit.js";
import { localLegendPosition, localLegendPlacement } from "../../../materialization/legendGroups.js";
import { mergeLegendTitleStyle } from "../../../grammar/legendTitleStyle.js";
import { recordLegendOffsetIntent } from "./group.js";
import { prepareLegendGroup } from "./group.js";
import { PLOT_LEGEND_POSITIONS } from "../../../layout/legend.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { resolveLegendStepConfig } from "./creation.js";
import { normalizeLegendOrder } from "../../../grammar/categoryOrder.js";
import { resolveDefinition } from "./categorical/resolve.js";
import { action } from "../../../core/action.js";
import {
  validateOptionObject
} from "../../../core/validation.js";
import { normalizeLegendOverflow, normalizeOptions } from "./categorical/options.js";
import { resolveLegendSymbol } from "./categorical/recipes.js";
import { resolveLayout } from "./categorical/layout.js";
import { resolveLegendCreationPlan } from "./categorical/actions.js";
import { categoricalSymbolIds, reconcileCategoricalSymbols, createCategoricalLegendFromConfig, resolveCategoricalLegendRevision, removeLegendKinds } from "./lifecycle.js";
import { normalizeColorSymbols } from "./continuous/colorSymbols.js";
import { readLegendSampling } from "./sampling.js";
import { createGradientLegendFromConfig } from "./continuous/gradient.js";
import { normalizeLegendGradient } from "../../../grammar/legendGradient.js";
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
import { resolveLegendBlock, resolveLegendTarget, validateLegendChannels } from "./target.js";
import { isEnumeratedSizeScaleType } from "../../../grammar/scales/index.js";
import { SIZE_LEGEND_LABELS, SIZE_LEGEND_TITLE_STYLE, resolveSizeLegendLayout, createSizeLegendFromConfig } from "./size.js";
import {
  STROKE_WIDTH_LEGEND_LABELS,
  STROKE_WIDTH_LEGEND_TITLE_STYLE,
  resolveStrokeWidthLegendLayout,
  createStrokeWidthLegendFromConfig
} from "./strokeWidth.js";
import { normalizeLegendSampling } from "./sampling.js";
import { patchLegendBlockOverride } from "./blocks.js";
import { LEGEND_POSITIONS } from "../../../core/vocabulary.js";
import { planLegendBlockTransitions } from "./transition.js";

const OPTIONS = Object.freeze([
  "target", "channel", "channels", "position", "layout", "align", "direction", "columns", "offset",
  "titlePosition", "title", "symbol", "labels", "titleStyle", "itemGap",
  "border", "count", "values", "gradient", "representation", "order", "overflow", "blockLayout", "at", "combine"
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

function resolveColorRepresentationEdit(program, previous, args) {
  const representation = args.representation ?? previous.representation ?? "gradient";
  if (!["gradient", "symbols"].includes(representation)) throw new Error("Legend representation must be gradient or symbols.");
  const allowed = ["target", "representation", "position", "align", "offset", "title", "labels", "titleStyle", "titlePosition", "border", "count", ...(representation === "symbols" ? ["symbol", "values", "itemGap", "layout", "direction", "columns"] : ["gradient", "direction"])];
  for (const key of Object.keys(args)) if (!allowed.includes(key)) throw new Error(`Color ${representation} legend does not accept ${key}.`);
  const switching = (previous.representation ?? "gradient") !== representation;
  const titleMode = args.title;
  const title = titleMode === "auto" ? findLayer(program, previous.target)?.encoding?.color?.field : typeof titleMode === "string" ? titleMode : previous.title;
  const common = {
    target: previous.target, position: args.position ?? previous.position,
    align: args.align ?? previous.align, offset: args.offset ?? previous.offset,
    title, labels: mergeObject(previous.labels, args.labels), titleStyle: mergeLegendTitleStyle(previous.titleStyle, args.titleStyle, { edit: true }),
    border: mergeBorder(previous.border, args.border),
    titlePosition: args.titlePosition ?? (switching && (representation === "gradient" || previous.titlePosition === "bottom") ? "top" : previous.titlePosition)
  };
  let normalized;
  if (representation === "symbols") {
    if (args.symbol !== undefined && args.symbol !== "auto") validateOptionObject(args.symbol, ["type", "radius", "stroke", "strokeWidth"], "Sampled color symbol");
    const sample = switching ? { count: previous.count } : {};
    for (const key of ["values", "count"]) if (Object.hasOwn(args, key)) sample[key] = args[key];
    if (Object.hasOwn(args, "values")) delete sample.count;
    if (Object.hasOwn(args, "count")) sample.count = args.count;
    normalized = normalizeColorSymbols({ ...common, ...sample,
      layout: args.layout ?? (switching ? undefined : previous.layout),
      direction: args.direction ?? (switching || args.position !== undefined && args.position !== previous.position ? undefined : previous.direction),
      columns: args.columns ?? (switching ? undefined : previous.columns),
      itemGap: args.itemGap ?? (switching ? undefined : previous.itemGap),
      symbol: args.symbol === "auto" ? "auto" : args.symbol === undefined ? (switching ? undefined : previous.symbol) : { ...(switching ? {} : previous.symbol), ...args.symbol }
    }, switching ? { count: previous.count } : previous, "edit");
  } else {
    normalized = normalizeContinuousLegend({ ...common,
      ...(args.direction === "auto" ? {} : args.direction !== undefined
        ? { direction: args.direction } : previous.gradientDirection === undefined ? {} : { direction: previous.gradientDirection }),
      count: args.count ?? (switching ? readLegendSampling(previous).count : previous.count) }, "gradient");
    const gradient = normalizeLegendGradient(args.gradient, switching ? undefined : previous.gradient);
    normalized.gradient = gradient;
  }
  const { representation: _rep, sampling: _sampling, symbol: _symbol, layout: _layout, direction: _direction, columns: _columns, gradient: _gradient, count: _count, ...retained } = previous;
  const blockOverrides = switching && representation === "gradient" && previous.blockOverrides !== undefined
    ? Object.fromEntries(Object.entries(previous.blockOverrides).map(([key, value]) => {
      const { symbol: _symbol, labelMap: _labelMap, ...common } = value; return [key, common];
    })) : previous.blockOverrides;
  if (representation === "gradient" && args.direction === "auto") delete retained.gradientDirection;
  return { config: { ...retained, ...normalized,
    ...(blockOverrides === undefined ? {} : { blockOverrides }),
    inferredTitle: titleMode === "auto" ? true : typeof titleMode === "string" ? false : previous.inferredTitle,
    titleVisible: titleMode === false ? false : titleMode === undefined ? previous.titleVisible !== false : true
  }, titleMode, title, titleVisible: titleMode === false ? false : titleMode === undefined ? previous.titleVisible !== false : true };
}

function resolveContinuousEdit(program, kind, previous, args) {
  if (kind === "gradient" && (previous.representation === "symbols" || args.representation !== undefined)) return resolveColorRepresentationEdit(program, previous, args);
  const gradient = ["gradient", "strokeGradient"].includes(kind);
  const allowed = gradient
    ? ["target", "position", "align", "offset", "title", "labels",
      "titleStyle", "titlePosition", "border", "count", "gradient", "representation", "direction"]
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
    ...(gradient ? { count: args.count ?? previous.count,
      ...(args.direction === "auto" ? {} : args.direction !== undefined ? { direction: args.direction }
        : previous.gradientDirection === undefined ? {} : { direction: previous.gradientDirection }) } : {}),
    titlePosition,
    title,
    labels: enteringInline && args.labels?.offset === undefined
      ? { ...labels, offset: 8 }
      : labels,
    titleStyle: mergeLegendTitleStyle(previous.titleStyle, args.titleStyle, { edit: true }),
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
    if (args.direction === "auto") delete config.gradientDirection;
    const gradient = normalizeLegendGradient(args.gradient, previous.gradient);
    config.gradient = gradient;
  } else {
    config.symbol = normalizeOpacitySymbol(args.symbol ?? previous.symbol);
  }
  return { config, titleMode, title, titleVisible };
}

function editContinuous(program, kind, previous, args) {
  const { config, titleMode, title, titleVisible } = resolveContinuousEdit(program, kind, previous, args);
  if (kind === "gradient" && (previous.representation ?? "gradient") !== (config.representation ?? "gradient")) {
    return createGradientLegendFromConfig(removeLegendKinds(program, [kind]), config).rematerializeLegend();
  }
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
      ? `${prefix}${config.representation === "symbols" ? "Symbols" : "Strips"}`
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
    titleStyle: mergeLegendTitleStyle(previous.titleStyle, args.titleStyle, { edit: true }),
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

function resolveSampledLegendEdit(program, kind, previous, args, preserveAppearance = false) {
  const size = kind === "size";
  const label = size ? "size" : "stroke-width";
  const allowed = ["target", "title", "count", "values", "labels", "titleStyle",
    "position", "layout", "align", "direction", "columns", "titlePosition", "offset", "itemGap", "border"];
  if (size) allowed.push("overflow");
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) {
      throw new Error(`${label} legend does not accept ${key}.`);
    }
  }
  const discrete = size &&
    isEnumeratedSizeScaleType(program.resolvedScales[previous.scale]?.type);
  const ordinalSize = size && program.resolvedScales[previous.scale]?.type === "ordinal";
  if (args.overflow !== undefined && !ordinalSize) {
    throw new Error("Size legend overflow requires an ordinal scale.");
  }
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
    ...(ordinalSize && (args.overflow !== undefined || previous.overflow !== undefined)
      ? { overflow: normalizeLegendOverflow(args.overflow === undefined ? previous.overflow : args.overflow) }
      : {}),
    ...(size ? { inheritAppearance: preserveAppearance && previous.inheritAppearance === true,
      ...(args.position === undefined ? {} : { inheritPosition: false }) } : {}),
    labels: normalizeLegendTextOptions(
      args.labels,
      "editLegend.labels",
      previous.labels ?? (size ? SIZE_LEGEND_LABELS : STROKE_WIDTH_LEGEND_LABELS)
    ),
    titleStyle: normalizeLegendTitleOptions(
      args.titleStyle,
      "editLegend.titleStyle",
      previous.titleStyle ?? (size ? SIZE_LEGEND_TITLE_STYLE : STROKE_WIDTH_LEGEND_TITLE_STYLE), true
    )
  };
  Object.assign(config, normalizeItemLegendLayout({ ...previous, ...args, titleStyle: config.titleStyle,
    direction: args.direction ?? (args.position !== undefined && args.position !== previous.position
      ? undefined : previous.direction) }));
  config.border = normalizeLegendBorder(mergeBorder(previous.border, args.border));
  (size ? resolveSizeLegendLayout : resolveStrokeWidthLegendLayout)(program, config);
  return { config, titleMode, title, titleVisible };
}

function editSampledLegend(program, kind, previous, args, preserveAppearance = false) {
  const { config, titleMode, title, titleVisible } = resolveSampledLegendEdit(program, kind, previous, args, preserveAppearance);
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
    ...(discrete ? {} : { sampling }),
    ...(args.overflow !== undefined && program.resolvedScales[size.scale]?.type === "ordinal"
      ? { overflow: normalizeLegendOverflow(args.overflow) } : {})
  };
  if (args.labels === undefined && args.titleStyle === undefined) return config;
  const labels = size.inheritAppearance
    ? { ...previous.labels, offset: size.labels.offset } : size.labels ?? SIZE_LEGEND_LABELS;
  const titleStyle = size.inheritAppearance
    ? previous.titleStyle : size.titleStyle ?? SIZE_LEGEND_TITLE_STYLE;
  return { ...config, inheritAppearance: false,
    labels: normalizeLegendTextOptions(args.labels, "editLegend.labels", labels),
    titleStyle: normalizeLegendTitleOptions(args.titleStyle, "editLegend.titleStyle", titleStyle, true) };
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
    titleStyle: mergeLegendTitleStyle(previous.titleStyle, args.titleStyle, { edit: true }),
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
  if (previous.combine === "size-shape") validateMappedSizeShapeSymbol(args.symbol);
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
  const { channels, target: _target, combine: requestedCombine, ...patch } = args;
  const previous = program.guideConfigs.legend ?? {};
  const removed = Object.keys(previous).filter(kind => previous[kind].target === target);
  let view = removed.reduce((next, kind) => next._withoutMaterializationConfig(["guides", "legend", kind]), program);
  const colorRepresentation = patch.representation ?? (channels.includes("color") && previous.gradient?.target === target ? previous.gradient.representation : undefined);
  if (patch.representation !== undefined && !channels.includes("color")) throw new Error("Legend representation requires selected continuous color.");
  const oldCombined = Object.values(previous).find(config=>config.target===target&&config.combine==="size-shape");
  const hasPair = channels.includes("shape") && channels.includes("size");
  if (oldCombined && requestedCombine === undefined && !hasPair && channels.some(channel=>["shape","size"].includes(channel))) {
    throw new Error("An edited combined legend keeps its combination; explicitly choose separate to split it.");
  }
  const combine = requestedCombine ?? (oldCombined && hasPair ? "size-shape" : undefined);
  let creation;
  if (requestedCombine === "separate" && oldCombined) {
    const pair = channels.filter(channel=>["shape","size"].includes(channel));
    const plans = [pair, ...channels.filter(channel=>!["shape","size"].includes(channel)).map(channel=>[channel])]
      .filter(channels=>channels.length).map(channels=>resolveLegendCreationPlan(view,{target,channels}));
    creation = {steps: plans.flatMap(plan=>plan.steps),
      ...(program.guideConfigs.legendGroups?.[target] === undefined ? {} : {legendGroup:{target,config:program.guideConfigs.legendGroups[target]}})};
  } else creation = resolveLegendCreationPlan(view, { target, channels,
    ...(combine === undefined ? {} : {combine}),
    ...(colorRepresentation === undefined ? {} : { representation: colorRepresentation }) }, program.semanticSpec.layers, channels);
  if (creation.legendGroup !== undefined) view = view._withMaterializationConfig(
    ["guides", "legendGroups", target], creation.legendGroup.config);
  const oldCategorical = removed.find(kind =>
    ["series", "color", "stroke"].includes(kind)
  );
  let plans = creation.steps.map(step => {
    const descriptor = resolveLegendStepConfig(view, step);
    const { kind } = descriptor;
    if (previous[kind] !== undefined && previous[kind].target !== target) {
      throw new Error(`Legend ${kind} content already belongs to another target.`);
    }
    if (descriptor.config.combine === "size-shape" && previous.series?.combine !== "size-shape") return descriptor;
    if (kind === "size" && oldCombined) {
      const shared = Object.fromEntries(["title", "inferredTitle", "titleVisible", "labels", "titleStyle", "position", "align", "direction", "columns", "offset", "titlePosition", "itemGap", "border", "layout"].map(key=>[key,oldCombined[key]]));
      return {...descriptor,config:{...descriptor.config,...shared,inheritAppearance:false}};
    }
    if (["series", "color", "stroke"].includes(kind) && oldCategorical !== undefined) {
      const priorKind = previous[kind]?.target === target ? kind : oldCategorical;
      const order = patch.order === undefined ? program.semanticSpec.guides.legend?.[priorKind]?.order
        : normalizeLegendOrder(patch.order);
      return { ...resolveCategoricalLegendRevision(view, priorKind, previous[priorKind],
        descriptor.config.channels, { order, validateLayout: false }), kind };
    }
    return { ...descriptor, config: previous[kind]?.target === target ? previous[kind] : descriptor.config };
  });
  const categorical = plans.find(plan =>
    ["series", "color", "stroke"].includes(plan.kind)
  );
  const size = plans.find(plan => plan.kind === "size");
  if (patch.representation !== undefined || plans.some(plan => plan.kind === "gradient" && plan.config.representation === "symbols")) {
    const color = plans.find(plan => plan.kind === "gradient");
    if (color === undefined) throw new Error("Legend representation requires continuous color.");
    color.config = resolveContinuousEdit(view, "gradient", color.config, patch).config;
  } else if (categorical !== undefined) {
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
  plans = planLegendBlockTransitions(program, target, plans, args.position);
  // The complete final content and styles are validated before removing resources.
  for (const { kind, config } of plans) view = view._withLegendConfig(kind, config);
  if (categorical !== undefined) resolveLayout(view, categorical.config);
  let next = removeLegendKinds(program, removed);
  if (creation.legendGroup !== undefined) next = next._withMaterializationConfig(
    ["guides", "legendGroups", target], creation.legendGroup.config);
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

function editLegendImplementation(args = {}, skipGroup = false) {
    validateOptionObject(args, OPTIONS, "editLegend");
    const changes = Object.keys(args).filter(key => key !== "target" && key !== "channel");
    if (changes.length === 0) {
      throw new Error("editLegend requires at least one change.");
    }
    if (args.title !== undefined && args.title !== false && args.title !== "auto" && (
      typeof args.title !== "string" || args.title.length === 0
    )) {
      throw new TypeError('editLegend title must be a non-empty string, "auto", or false.');
    }
    const target = resolveLegendTarget(this, args.target, "editLegend");
    if (Object.hasOwn(args, "channel")) {
      if (Object.hasOwn(args, "channels")) {
        throw new Error("editLegend cannot combine channel and channels.");
      }
      if (Object.hasOwn(args, "combine")) throw new Error("Selected legend edits cannot change combine.");
      if (args.blockLayout !== undefined || args.at !== undefined) {
        throw new Error("Selected legend blocks do not accept whole-group blockLayout or at.");
      }
      let program = this;
      const descriptor = resolveLegendBlock(program, args, "editLegend");
      const selectedPositionChanged = Object.hasOwn(args, "position");
      if (selectedPositionChanged) {
        if (args.position !== "inherit" && !LEGEND_POSITIONS.includes(args.position)) throw new Error("Selected legend position requires an anchor or inherit.");
        const blockOverrides = patchLegendBlockOverride(descriptor.config, descriptor.key,
          args.position === "inherit" ? {removePosition: true} : {position: args.position});
        const {blockOverrides: _old, ...config} = descriptor.config;
        program = program._withLegendConfig(descriptor.kind, blockOverrides === undefined ? config : {...config, blockOverrides});
        const {position: _position, ...rest} = args;
        args = rest;
      }
      const size = program.guideConfigs.legend?.size;
      const categorical = ["series", "color", "stroke"]
        .map(kind => program.guideConfigs.legend?.[kind])
        .find(config => config?.target === target);
      // A selected edit must not propagate through legacy shared typography.
      if (size?.target === target && size.inheritAppearance === true && categorical &&
          (descriptor.kind === "size" || ["series", "color", "stroke"].includes(descriptor.kind))) {
        program = program._withLegendConfig("size", {
          ...size, inheritAppearance: false,
          labels: { ...categorical.labels, offset: size.labels.offset },
          titleStyle: { ...categorical.titleStyle }
        });
      }
      const { kind } = descriptor;
      const config = program.guideConfigs.legend[kind];
      const { channel: _channel, ...patch } = args;
      // Validate layout leaves in the local frame without adding another stored
      // placement owner. The existing family frame is restored after editing.
      const local = localLegendPlacement(config);
      const selectedFrame = local === undefined ? config : {...config, ...local};
      const selected = selectedPositionChanged && !["gradient", "strokeGradient", "opacity"].includes(kind)
        ? {...selectedFrame, direction: undefined} : selectedFrame;
      const finish = result => local === undefined ? result : result._withLegendConfig(kind, {
        ...result.guideConfigs.legend[kind], position: config.position,
        ...(patch.align === undefined ? {align: config.align} : {}),
        ...(patch.offset === undefined ? {offset: config.offset, inferredOffset: config.inferredOffset} : {})
      }).rematerializeLegend();
      if (["series", "color", "stroke"].includes(kind)) {
        return finish(editCategorical(program, kind, selected, undefined, patch));
      }
      if (["size", "strokeWidth"].includes(kind)) {
        return finish(editSampledLegend(program, kind, selected, patch));
      }
      if (["interval", "strokeInterval"].includes(kind)) {
        return finish(editInterval(program, selected, patch, kind === "strokeInterval" ? "stroke" : "color"));
      }
      return finish(editContinuous(program, kind, selected, patch));
    }
    const existingGroup = this.guideConfigs.legendGroups?.[target];
    const needsGroup = !skipGroup && (existingGroup !== undefined || args.blockLayout !== undefined || args.at !== undefined ||
      PLOT_LEGEND_POSITIONS.includes(args.position) && Object.values(this.guideConfigs.legend ?? {}).some(config => config.target === target && config.kind === undefined));
    if (needsGroup) {
      const prepared = prepareLegendGroup(this, args, target, { corner: PLOT_LEGEND_POSITIONS.includes(args.position) });
      const { channels, ...patch } = prepared.options;
      if (channels !== undefined) return editLegendContent(prepared.program, target, prepared.options);
      const layoutKeys = ["position", "layout", "align", "direction", "columns", "offset", "titlePosition", "itemGap"];
      const layoutOnly = Object.keys(patch).every(key => key === "target" || layoutKeys.includes(key));
      if (layoutOnly) {
        let next = prepared.program;
        const entries = Object.entries(next.guideConfigs.legend ?? {}).filter(([, config]) => config.target === target);
        for (const [kind] of entries) {
          const previous = next.guideConfigs.legend[kind];
          const familyPatch = { ...patch };
          if (localLegendPosition(previous) !== undefined) {
            for (const key of ["position", "align", "offset"]) delete familyPatch[key];
          }
          if (["gradient", "strokeGradient", "opacity"].includes(kind) && previous.representation !== "symbols") {
            for (const key of kind === "opacity" ? ["layout", "columns", "direction"] : ["layout", "columns"]) {
              if (Object.hasOwn(args, key)) throw new Error(`${kind} legend does not accept ${key}.`);
              delete familyPatch[key];
            }
          }
          if (["gradient", "strokeGradient"].includes(kind) && previous.representation !== "symbols") delete familyPatch.itemGap;
          if (["series", "color", "stroke"].includes(kind)) next = editCategorical(next, kind, previous, undefined, familyPatch);
          else if (["size", "strokeWidth"].includes(kind)) next = editSampledLegend(next, kind, previous, familyPatch, true);
          else if (["interval", "strokeInterval"].includes(kind)) next = editInterval(next, previous, familyPatch, kind === "strokeInterval" ? "stroke" : "color");
          else next = editContinuous(next, kind, previous, familyPatch);
        }
        return next.rematerializeLegend();
      }
      if (args.combine === undefined && Object.values(this.guideConfigs.legend ?? {}).some(config=>config.target===target&&config.combine==="size-shape")) {
        let edited = prepared.program;
        const shared = {...args};
        for (const key of ["position","align","offset","blockLayout","at"]) delete shared[key];
        for (const block of legendBlockDescriptors(edited, target)) {
          edited = editLegendImplementation.call(edited,{...shared,target,channel:block.channels[0]},true);
        }
        return edited.rematerializeLegend();
      }
      // Shared appearance edits still use their established owner. Preserve the
      // local frame when a whole-group anchor accompanies those edits.
      let edited = editLegendImplementation.call(prepared.program, prepared.options, true);
      for (const [kind, previous] of Object.entries(this.guideConfigs.legend ?? {})) {
        if (previous.target !== target || localLegendPosition(previous) === undefined || edited.guideConfigs.legend[kind] === undefined) continue;
        edited = edited._withLegendConfig(kind, {...edited.guideConfigs.legend[kind],
          position: previous.position, align: previous.align, offset: previous.offset,
          inferredOffset: previous.inferredOffset,
          ...(args.direction === undefined ? {direction: previous.direction} : {})});
      }
      return edited.rematerializeLegend();
    }
    if (Object.hasOwn(args, "combine")) {
      validateLegendCombine(args.combine);
      if (args.combine === "size-shape" && args.channels !== undefined &&
        !(args.channels.length === 2 && args.channels.includes("size") && args.channels.includes("shape"))) {
        throw new Error("size-shape combine requires exactly shape and size channels.");
      }
      const channels = args.channels ?? [...new Set(legendBlockDescriptors(this, target).flatMap(block=>block.channels))];
      return editLegendContent(this, target, {...args, channels});
    }
    if (args.channels !== undefined) return editLegendContent(this, target, args);
    const configs = this.guideConfigs.legend ?? {};
    const ownedKinds = Object.keys(configs).filter(
      kind => configs[kind]?.target === target
    );
    if (args.representation !== undefined) {
      if (configs.gradient?.target !== target) throw new Error("Legend representation requires continuous color.");
      return editContinuous(this, "gradient", configs.gradient, args);
    }
    if (configs.gradient?.target === target && configs.gradient.representation === "symbols" && ownedKinds.length > 1) {
      throw new Error("Multiple legend blocks require editLegendBlock with an explicit channel for appearance or samples.");
    }
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
}

export const editLegend = /* @__PURE__ */ action(
  { op: "editLegend", description: "Edit one stable legend content, layout or appearance.", scope: "any" },
  withGuideLayoutValidation(function (args = {}) {
    if (this.compositionSpec !== undefined) return editFacetParentLegend(this, "editLegend", args);
    return recordLegendOffsetIntent(this, editLegendImplementation.call(this, args), args);
  })
);
