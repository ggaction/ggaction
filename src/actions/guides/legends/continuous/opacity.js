import { alignLegendLabels } from "../../../../layout/legendText.js";
import{validateLegendClip}from"../../../../grammar/legendClip.js";
import{hasLegendClipGraphics,applyLegendClipGraphics}from"../../../../materialization/legendClip.js";
import { intrinsicLegendConfig } from "../../../../materialization/legendGroups.js";
import { alignLegendTitle, resolveLegendTitleText } from "../../../../layout/legendText.js";
import {resolveLegendContentSpacing} from "../../../../layout/legendSpacing.js";
import {validateLegendSpacing} from "../../../../grammar/legendSpacing.js";
import { editGraphicProperties } from "../../../primitives/graphicProperties.js";
import { action, closedAction } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { validateKeys } from "../../../../core/validation.js";
import { mapLinearValues } from "../../../../grammar/scales/index.js";
import { measureTextWidth } from "../../../../core/textMetrics.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import {
  assertLegendBoundsInsideCanvas,
  editLegendBackground,
  formatContinuousValues,
  normalizeContinuousLegend,
  requireResolvedLegendScale,
  resolveContinuousBounds,
  resolveContinuousLegendLayer,
  resolveLegendBackgroundFromBounds,
  resolveLegendTextBounds,
  styleContinuousText,
  validateNonNegative,
  validatePositive
} from "./common.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { resolveLegendSampleValues } from "../../../../grammar/legendSampling.js";
import { resolveEffectiveLegendBlockConfig } from "../../../../materialization/guides/legendConfig.js";
import { legendLabelLineHeight } from "../../../../layout/legend.js";

const SYMBOL_OPTIONS = Object.freeze([
  "type", "radius", "fill", "stroke", "strokeWidth"
]);

export function normalizeOpacitySymbol(value) {
  if (value === undefined) {
    return { type: "point", radius: 7, fill: DEFAULT_COLORS.mark };
  }
  if (!isPlainObject(value)) {
    throw new TypeError("createLegend.symbol must be one point recipe object.");
  }
  validateKeys(value, SYMBOL_OPTIONS, "createLegend.symbol");
  const symbol = {
    type: "point",
    radius: 7,
    fill: DEFAULT_COLORS.mark,
    ...value
  };
  if (symbol.type !== "point") {
    throw new Error("Opacity legend symbol must have type point.");
  }
  validatePositive(symbol.radius, "Opacity legend symbol radius");
  if (typeof symbol.fill !== "string" || symbol.fill.length === 0) {
    throw new TypeError("Opacity legend symbol fill must be non-empty.");
  }
  if (symbol.stroke !== undefined && (
    typeof symbol.stroke !== "string" || symbol.stroke.length === 0
  )) {
    throw new TypeError("Opacity legend symbol stroke must be non-empty.");
  }
  if (symbol.strokeWidth !== undefined) {
    validateNonNegative(
      symbol.strokeWidth,
      "Opacity legend symbol strokeWidth"
    );
  }
  return symbol;
}

function resolveOpacityConfig(program, config) {
  const layer = resolveContinuousLegendLayer(program, config.target, "opacity");
  const encoding = layer.encoding.opacity;
  if (encoding.fieldType !== "quantitative") {
    throw new Error("Opacity legend requires quantitative field opacity.");
  }
  const scale = requireResolvedLegendScale(program, encoding.scale, "linear");
  return {
    layer,
    encoding,
    scale,
    config: {
      ...config,
      target: layer.id,
      scale: encoding.scale,
      title: config.inferredTitle ? encoding.field : config.title,
      domain: scale.domain
    }
  };
}

function resolveOpacityLayout(program, config, scale) {
  validateLegendClip("opacity",config);
  validateLegendSpacing("opacity",config);
  config = intrinsicLegendConfig(program, config);
  const { plot, canvas } = resolveContinuousBounds(program);
  const vertical = ["right", "left"].includes(config.position);
  const values = resolveLegendSampleValues(config, scale, "Opacity legend");
  const texts = formatContinuousValues(
    values,
    scale.domain,
    "quantitative",
    config.labels.format
  );
  const symbolExtent = config.symbol.radius + (config.symbol.strokeWidth ?? 0) / 2;
  const visibleExtent=Math.min(symbolExtent,config.clipHeight===undefined?Infinity:config.clipHeight/2);
  const titleText = config.titleVisible === false ? { width: 0, height: 0 }
    : resolveLegendTitleText(config.title, config.titleStyle, program.materializationConfigs.textMetrics);
  const labelWidths = texts.map(text => measureTextWidth(text, config.labels, program.materializationConfigs.textMetrics));
  let symbols;
  let labels;
  let title;
  if (vertical) {
    const baseX = config.position === "right"
      ? plot.x + plot.width + config.offset
      : plot.x - config.offset;
    const itemHeight = Math.max(visibleExtent * 2, legendLabelLineHeight(config.labels.fontSize));
    const pitch = Math.max(config.itemGap, itemHeight);
    const firstY = Math.max(plot.y + 46, config.titleVisible === false ? plot.y + 46
      : plot.y + 20 + titleText.height / 2 + 12 + itemHeight / 2);
    const y = values.map((_, index) => firstY + index * pitch);
    symbols = y.map(itemY => ({
      x: config.position === "right" ? baseX + symbolExtent : baseX - symbolExtent,
      y: itemY
    }));
    labels = y.map(itemY => ({
      x: config.position === "right"
        ? baseX + symbolExtent * 2 + config.labels.offset
        : baseX - symbolExtent * 2 - config.labels.offset,
      y: itemY,
      align: config.position === "right" ? "left" : "right"
    }));
    title = {
      x: config.position === "right" ? baseX : baseX - symbolExtent * 2,
      y: plot.y + 20,
      align: config.position === "right" ? "left" : "right"
    };
  } else if (config.titlePosition === "left") {
    const titleWidth = titleText.width;
    const titlePrefix = config.titleVisible === false ? 0 : titleWidth + 20;
    const samplesWidth = labelWidths.reduce(
      (sum, width) => sum + symbolExtent * 2 + config.labels.offset + width,
      0
    ) + config.itemGap * (values.length - 1);
    const width = titlePrefix + samplesWidth;
    const startX = config.align === "left" ? plot.x
      : config.align === "right" ? plot.x + plot.width - width
        : plot.x + (plot.width - width) / 2;
    const height = Math.max(
      visibleExtent * 2,
      config.labels.fontSize,
      titleText.height
    );
    const centerY = config.position === "top"
      ? plot.y - config.offset - height / 2
      : plot.y + plot.height + config.offset + height / 2;
    title = { x: startX, y: centerY, align: "left" };
    let cursor = startX + titlePrefix;
    symbols = [];
    labels = [];
    for (let index = 0; index < values.length; index += 1) {
      const symbolX = cursor + symbolExtent;
      symbols.push({ x: symbolX, y: centerY });
      const labelX = symbolX + symbolExtent + config.labels.offset;
      labels.push({ x: labelX, y: centerY, align: "left" });
      cursor = labelX + labelWidths[index] + config.itemGap;
    }
  } else {
    const pitch = Math.max(56, config.itemGap * 2,
      symbolExtent * 2 + config.itemGap, Math.max(...labelWidths) + config.itemGap);
    const width = (values.length - 1) * pitch;
    const startX = config.align === "left" ? plot.x
      : config.align === "right" ? plot.x + plot.width - width
        : plot.x + (plot.width - width) / 2;
    const titleHalf = titleText.height / 2;
    const labelHalf = config.labels.fontSize / 2;
    const y = config.position === "top"
      ? plot.y - config.offset - config.labels.fontSize -
        config.labels.offset - visibleExtent
      : plot.y + plot.height + config.offset +
        (config.titleVisible === false ? 0 : titleText.height + 12) + visibleExtent;
    const samplePitch = values.length === 1 ? 0 : width / (values.length - 1);
    symbols = values.map((_, index) => ({
      x: startX + index * samplePitch,
      y
    }));
    labels = symbols.map(symbol => ({
      x: symbol.x,
      y: symbol.y + visibleExtent + config.labels.offset + labelHalf,
      align: "center"
    }));
    title = {
      x: startX + width / 2,
      y: y - visibleExtent - 12 - titleHalf,
      align: "center"
    };
  }
  labels = alignLegendLabels(labels, texts, config.labels, program.materializationConfigs.textMetrics);
  const labelBounds = labels.map((label, index) =>
    resolveLegendTextBounds(label, texts[index], config.labels, program.materializationConfigs.textMetrics)
  );
  const symbolBounds = symbols.map(symbol => ({
    left: symbol.x - symbolExtent,
    right: symbol.x + symbolExtent,
    top: symbol.y - visibleExtent,
    bottom: symbol.y + visibleExtent
  }));
  if (config.titleVisible !== false) title = alignLegendTitle(title, config.title, config.titleStyle,
    [...labelBounds, ...symbolBounds], program.materializationConfigs.textMetrics);
  const titleBounds = config.titleVisible === false ? undefined : resolveLegendTextBounds(
    title,
    config.title,
    config.titleStyle
  , program.materializationConfigs.textMetrics, { hardBreaks: true });
  let occupiedBounds = [...(config.titleVisible === false ? [] : [titleBounds]), ...labelBounds, ...symbolBounds];
  const spacing = config.rowPadding === undefined && config.titlePadding === undefined ? undefined
    : resolveLegendContentSpacing(config,symbols.map((symbol,index) => ({
    row:vertical ? index : 0,x:symbol.x,y:symbol.y,
    bounds:[symbolBounds[index],...(texts[index] === "" ? [] : [labelBounds[index]])]
  })),titleBounds);
  if (spacing !== undefined) {
    symbols = symbols.map((point,index) => ({...point,x:point.x+spacing.offsets[index].dx,y:point.y+spacing.offsets[index].dy}));
    labels = labels.map((point,index) => ({...point,x:point.x+spacing.offsets[index].dx,y:point.y+spacing.offsets[index].dy}));
    title = {...title,x:title.x+spacing.titleOffset.dx,y:title.y+spacing.titleOffset.dy};
    occupiedBounds = spacing.bounds;
  }
  assertLegendBoundsInsideCanvas(
    occupiedBounds,
    canvas,
    "Opacity legend layout", config
  );
  const background = resolveLegendBackgroundFromBounds(
    occupiedBounds,
    config.border,
    canvas,
    "Opacity legend", config
  );
  return { values, texts, symbols, labels, title, background };
}

export const rematerializeOpacityLegend = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeOpacityLegend",
    description: "Rematerialize a field-opacity sample legend."
  }, [],
  function (args = {}) {
    if(hasLegendClipGraphics(this))return this.rematerializeLegend();
    const stored = this.guideConfigs.legend?.opacity;
    if (stored === undefined) {
      throw new Error("Opacity legend requires stored configuration.");
    }
    const { encoding, scale, config: currentConfig } = resolveOpacityConfig(this, stored);
    const config = resolveEffectiveLegendBlockConfig(this, "opacity", currentConfig);
    const layout = resolveOpacityLayout(this, config, scale);
    const opacities = mapLinearValues(layout.values, scale.domain, scale.range, {
      clamp: scale.clamp ?? false
    });
    let next = editGraphicProperties(editGraphicProperties(editGraphicProperties(this
      .editSemantic({
        property: "guide.legend.opacity.scale",
        value: encoding.scale
      })
      .editSemantic({
        property: "guide.legend.opacity.title",
        value: config.title
      })
      ._withLegendConfig("opacity", currentConfig), "opacityLegendSymbols", {
      length: layout.values.length,
      x: layout.symbols.map(symbol => symbol.x),
      y: layout.symbols.map(symbol => symbol.y)
    }), "opacityLegendSymbols", {
      radius: config.symbol.radius,
      fill: config.symbol.fill,
      opacity: opacities
    }), "opacityLegendLabels", {
      length: layout.values.length,
      x: layout.labels.map(label => label.x),
      y: layout.labels.map(label => label.y),
      text: layout.texts
    });
    next = editLegendBackground(
      next,
      "opacityLegendBackground",
      layout.background,
      config.border
    );
    if (config.symbol.stroke !== undefined) {
      next = next.editGraphics({
        target: "opacityLegendSymbols",
        property: "stroke",
        value: config.symbol.stroke
      });
    }
    if (config.symbol.strokeWidth !== undefined) {
      next = next.editGraphics({
        target: "opacityLegendSymbols",
        property: "strokeWidth",
        value: config.symbol.strokeWidth
      });
    }
    next = styleContinuousText(
      next,
      "opacityLegendLabels",
      config.labels,
      { align: layout.labels[0].align }
    );
    if (config.titleVisible === false) return applyLegendClipGraphics(next);
    next = editGraphicProperties(next, "opacityLegendTitle", {
      x: layout.title.x,
      y: layout.title.y,
      text: config.title
    });
    return applyLegendClipGraphics(styleContinuousText(
      next,
      "opacityLegendTitle",
      config.titleStyle,
      { align: layout.title.align }
    ));
  }
);


export function resolveOpacityLegendCreation(program, args = {}) {
  const config = normalizeContinuousLegend(args, "opacity", program.materializationConfigs.theme);
  if (args.channels !== undefined && (
    !Array.isArray(args.channels) ||
    args.channels.length !== 1 ||
    args.channels[0] !== "opacity"
  )) {
    throw new Error('Opacity legend requires channels: ["opacity"].');
  }
  config.symbol = normalizeOpacitySymbol(args.symbol);
  const resolved = resolveOpacityConfig(program, config);
  return resolved;
}

export function createOpacityLegendFromConfig(program, config) {
  const resolved = resolveOpacityConfig(program, config);
  resolveOpacityLayout(program, resolved.config, resolved.scale);
  let next = program
    .editSemantic({
      property: "guide.legend.opacity.scale",
      value: resolved.encoding.scale
    })
    .editSemantic({
      property: "guide.legend.opacity.title",
      value: resolved.config.title
    })
    ._withLegendConfig("opacity", resolved.config);
  if (resolved.config.border !== false) {
    next = next.createGraphics({
      id: "opacityLegendBackground",
      type: "rect",
      ...resolveLegendGraphicPlacement(next)
    });
  }
  next = next
    .createGraphics({
      id: "opacityLegendSymbols",
      type: "circle",
      length: 0,
      ...resolveLegendGraphicPlacement(next, resolved.config.border === false
        ? {}
        : { after: "opacityLegendBackground" })
    })
    .createGraphics({
      id: "opacityLegendLabels",
      type: "text",
      length: 0,
      ...resolveLegendGraphicPlacement(next)
    });
  if (resolved.config.titleVisible !== false) {
    next = next.createGraphics({
      id: "opacityLegendTitle",
      type: "text",
      ...resolveLegendGraphicPlacement(next)
    });
  }
  return next.rematerializeOpacityLegend();
}

export const createOpacityLegend = /* @__PURE__ */ action(
  {
    op: "createOpacityLegend",
    description: "Create a field-opacity sample legend."
  },
  function (args = {}) {
    const resolved = resolveOpacityLegendCreation(this, args);
    resolveOpacityLayout(this, resolved.config, resolved.scale);
    if (this.graphicSpec.objects.opacityLegendSymbols !== undefined) {
      throw new Error(
        "createOpacityLegend requires a missing opacity legend."
      );
    }
    return createOpacityLegendFromConfig(this, resolved.config);
  }
);

export const removeOpacityLegend = /* @__PURE__ */ closedAction(
  {
    op: "removeOpacityLegend",
    description: "Remove a field-opacity legend after switching to constant opacity."
  }, [],
  function (args = {}) {
    if (this.guideConfigs.legend?.opacity === undefined) return this;
    const targets = [
      "opacityLegendBackground",
      "opacityLegendSymbols",
      "opacityLegendLabels",
      "opacityLegendTitle"
    ];
    let next = this.editSemantic({
      property: "guide.legend.opacity",
      remove: true
    });
    for (const target of targets) {
      if (next.graphicSpec.objects[target] !== undefined) {
        next = next.editGraphics({ target, remove: true });
      }
    }
    return next._withoutMaterializationConfig([
      "guides", "legend", "opacity"
    ]);
  }
);
