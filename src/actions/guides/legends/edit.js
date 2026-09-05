import { normalizeLegendOrder } from "../../../grammar/categoryOrder.js";
import { resolveDefinition } from "./categorical/resolve.js";
import { action } from "../../../core/action.js";
import {
  validateGeneratedItemLimit,
  validateOptionObject
} from "../../../core/validation.js";
import { normalizeOptions } from "./categorical/options.js";
import { resolveLegendSymbol } from "./categorical/recipes.js";
import { symbolGraphic } from "./categorical/layout.js";
import {
  normalizeLegendTextOptions,
  normalizeContinuousLegend,
  validatePositive
} from "./continuous/common.js";
import { normalizeOpacitySymbol } from "./continuous/opacity.js";
import { normalizeIntervalLegend } from "./continuous/interval.js";
import { findLayer } from "../../../selectors/layers.js";
import { resolveLegendGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { resolveLegendTarget } from "./target.js";
import { SIZE_LEGEND_LABELS, SIZE_LEGEND_TITLE_STYLE } from "./size.js";
import {
  STROKE_WIDTH_LEGEND_LABELS,
  STROKE_WIDTH_LEGEND_TITLE_STYLE
} from "./strokeWidth.js";

const OPTIONS = Object.freeze([
  "target", "position", "layout", "align", "direction", "columns", "offset",
  "titlePosition", "title", "symbol", "labels", "titleStyle", "itemGap",
  "border", "count", "gradient", "order"
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
      ...resolveLegendGraphicPlacement(program)
    });
  }
  return program;
}

function editContinuous(program, kind, previous, args) {
  const allowed = kind === "gradient"
    ? ["target", "position", "align", "offset", "title", "labels",
      "titleStyle", "border", "count", "gradient"]
    : ["target", "position", "align", "offset", "title", "symbol", "labels",
      "titleStyle", "titlePosition", "itemGap", "border", "count"];
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
  const inferred = layer?.encoding?.[kind === "gradient" ? "color" : "opacity"]?.field;
  const title = titleMode === "auto"
    ? inferred
    : typeof titleMode === "string" ? titleMode : previous.title;
  const titlePosition = args.titlePosition ?? previous.titlePosition;
  const enteringInline = kind === "opacity" &&
    titlePosition === "left" && previous.titlePosition !== "left";
  const labels = mergeObject(previous.labels, args.labels);
  const normalized = normalizeContinuousLegend({
    target: previous.target,
    position: args.position ?? previous.position,
    align: args.align ?? previous.align,
    offset: args.offset ?? previous.offset,
    count: args.count ?? previous.count,
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
  }, kind);
  const config = {
    ...previous,
    ...normalized,
    inferredTitle,
    titleVisible
  };
  if (kind === "gradient") {
    const gradient = mergeObject(previous.gradient, args.gradient);
    validatePositive(gradient.length, "Gradient length");
    validatePositive(gradient.thickness, "Gradient thickness");
    config.gradient = gradient;
  } else {
    config.symbol = normalizeOpacitySymbol(args.symbol ?? previous.symbol);
  }
  const prefix = kind === "gradient" ? "colorGradient" : "opacityLegend";
  let next = program;
  if (titleMode === "auto" || typeof titleMode === "string") {
    next = next.editSemantic({
      property: `guide.legend.${kind === "gradient" ? "color" : "opacity"}.title`,
      value: title
    });
  }
  next = next._withLegendConfig(kind, config);
  next = reconcileGraphic(next, `${prefix}Background`, config.border !== false, {
    type: "rect",
    before: kind === "gradient" ? "colorGradientStrips" : "opacityLegendSymbols"
  });
  next = reconcileGraphic(next, `${prefix}Title`, titleVisible, { type: "text" });
  return next.rematerializeLegend();
}

function editInterval(program, previous, args) {
  for (const key of Object.keys(args)) {
    if (![
      "target", "position", "align", "direction", "offset", "title",
      "symbol", "labels", "titleStyle", "itemGap", "border"
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
    ? layer?.encoding?.color?.field
    : typeof titleMode === "string" ? titleMode : previous.title;
  const normalized = normalizeIntervalLegend({
    target: previous.target,
    position: args.position ?? previous.position,
    align: args.align ?? previous.align,
    direction: args.direction ?? previous.direction,
    offset: args.offset ?? previous.offset,
    title,
    symbol: mergeObject(previous.symbol, args.symbol),
    labels: mergeObject(previous.labels, args.labels),
    titleStyle: mergeObject(previous.titleStyle, args.titleStyle),
    itemGap: args.itemGap ?? previous.itemGap,
    border: mergeBorder(previous.border, args.border)
  });
  let next = program._withLegendConfig("interval", {
    ...previous,
    ...normalized,
    inferredTitle,
    titleVisible
  });
  if (titleMode === "auto" || typeof titleMode === "string") {
    next = next.editSemantic({
      property: "guide.legend.color.title",
      value: title
    });
  }
  next = reconcileGraphic(next, "colorLegendTitle", titleVisible, {
    type: "text"
  });
  next = reconcileGraphic(
    next,
    "colorLegendBackground",
    normalized.border !== false,
    { type: "rect", before: "colorLegendSymbols" }
  );
  return next.rematerializeLegend();
}

function editSampledLegend(program, kind, previous, args) {
  const size = kind === "size";
  const label = size ? "size" : "stroke-width";
  const prefix = size ? "sizeLegend" : "strokeWidthLegend";
  const allowed = ["target", "title", "count", "labels", "titleStyle"];
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) {
      throw new Error(`${label} legend does not accept ${key}.`);
    }
  }
  if (args.titleStyle !== undefined) {
    validateOptionObject(args.titleStyle, ["color", "fontSize", "fontFamily", "fontWeight"], "editLegend.titleStyle");
  }
  const count = args.count ?? previous.count;
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError(
      `${label} legend count must be an integer of at least 2.`
    );
  }
  validateGeneratedItemLimit(count, `${label} legend count`);
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
  const config = {
    ...previous,
    title,
    inferredTitle,
    titleVisible,
    count,
    ...(size ? { inheritAppearance: false } : {}),
    labels: normalizeLegendTextOptions(
      args.labels,
      "editLegend.labels",
      previous.labels ?? (size ? SIZE_LEGEND_LABELS : STROKE_WIDTH_LEGEND_LABELS)
    ),
    titleStyle: normalizeLegendTextOptions(
      args.titleStyle,
      "editLegend.titleStyle",
      previous.titleStyle ?? (size ? SIZE_LEGEND_TITLE_STYLE : STROKE_WIDTH_LEGEND_TITLE_STYLE)
    )
  };
  let next = program;
  if (titleMode === "auto" || typeof titleMode === "string") {
    next = next.editSemantic({
      property: `guide.legend.${kind}.title`,
      value: title
    });
  }
  next = next._withLegendConfig(kind, config);
  next = reconcileGraphic(next, `${prefix}Title`, titleVisible, {
    type: "text"
  });
  return next.rematerializeLegend();
}

function categoricalSymbolIds(config) {
  return new Set(config.symbol.layers.map(layer => symbolGraphic(config, layer.type)));
}

function editCategorical(program, kind, previous, size, args) {
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
  const normalized = normalizeOptions({
    target: previous.target,
    channels: previous.channels,
    layout: args.layout === undefined ? previous.layout : args.layout,
    position: args.position ?? previous.position,
    align: args.align ?? previous.align,
    direction: args.direction ?? (args.position === "left"
      ? "vertical"
      : previous.direction),
    ...(args.columns === undefined && previous.columns === undefined
      ? {} : { columns: args.columns ?? previous.columns }),
    offset: args.offset ?? previous.offset,
    titlePosition: args.titlePosition ?? previous.titlePosition,
    title,
    symbol: args.symbol === undefined ? previous.symbol
      : resolveLegendSymbol(program, findLayer(program, previous.target), previous.channels, args.symbol),
    labels: mergeObject(previous.labels, args.labels),
    titleStyle: mergeObject(previous.titleStyle, args.titleStyle),
    itemGap: args.itemGap ?? previous.itemGap,
    border: mergeBorder(previous.border, args.border)
  }, kind);
  const config = {
    ...previous,
    ...normalized,
    inferredTitle,
    inferredSymbol: args.symbol === undefined ? previous.inferredSymbol : args.symbol === "auto",
    titleVisible
  };
  const order = args.order === undefined
    ? program.semanticSpec.guides.legend?.[kind]?.order
    : normalizeLegendOrder(args.order);
  // Resolve the final domain before changing semantic/config/graphic state.
  resolveDefinition(program, findLayer(program, previous.target), previous.channels, title, order);
  const oldSymbols = categoricalSymbolIds(previous);
  const newSymbols = categoricalSymbolIds(config);
  const sameSymbolOrder = oldSymbols.size === newSymbols.size &&
    [...oldSymbols].every((id, index) => id === [...newSymbols][index]);
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
  for (const id of oldSymbols) {
    if (!sameSymbolOrder && next.graphicSpec.objects[id] !== undefined) {
      next = next.editGraphics({ target: id, remove: true });
    }
  }
  for (const layer of config.symbol.layers) {
    const id = symbolGraphic(config, layer.type);
    if (next.graphicSpec.objects[id] === undefined) {
      const suffix = { line: "Lines", point: "Points", swatch: "Swatches" }[layer.type];
      next = next[`createLegendSymbol${suffix}`]();
    }
  }
  next = reconcileGraphic(next, `${kind === "series" ? "series" : "color"}LegendBackground`,
    config.border !== false, {
      type: "rect",
      before: [...newSymbols][0]
    });
  const titleId = `${kind === "series" ? "series" : "color"}LegendTitle`;
  next = reconcileGraphic(next, titleId, titleVisible, {
    type: "text",
    ...(next.graphicSpec.objects.sizeLegendSymbols === undefined
      ? {} : { before: "sizeLegendSymbols" })
  });
  if (size !== undefined) {
    if (args.count !== undefined && (!Number.isInteger(args.count) || args.count < 2)) {
      throw new RangeError("Size legend count must be an integer of at least 2.");
    }
    if (args.count !== undefined) {
      validateGeneratedItemLimit(args.count, "Size legend count");
    }
    next = next._withLegendConfig("size", {
      ...size,
      count: args.count ?? size.count,
      inheritAppearance: true
    });
  }
  return next.rematerializeLegend();
}

export const editLegend = action(
  { op: "editLegend", description: "Edit one stable legend layout or appearance." },
  function (args = {}) {
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
    const configs = this.guideConfigs.legend ?? {};
    const categoricalKind = ["series", "color"].find(
      kind => configs[kind]?.target === target
    );
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
    if (configs.strokeWidth?.target === target) {
      return editSampledLegend(this, "strokeWidth", configs.strokeWidth, args);
    }
    if (configs.size?.target === target) {
      return editSampledLegend(this, "size", configs.size, args);
    }
    const continuousKind = ["gradient", "opacity"].find(
      kind => configs[kind]?.target === target
    );
    return editContinuous(this, continuousKind, configs[continuousKind], args);
  }
);
