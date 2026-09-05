import { action } from "../../../../core/action.js";
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
  resolveContinuousPoint,
  resolveLegendBackgroundFromBounds,
  resolveLegendTextBounds,
  sampleContinuousValues,
  styleContinuousText,
  validateNonNegative,
  validatePositive
} from "./common.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";

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
  const layer = resolveContinuousPoint(program, config.target, "opacity");
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
  const { plot, canvas } = resolveContinuousBounds(program);
  const vertical = ["right", "left"].includes(config.position);
  const values = sampleContinuousValues(scale.domain, config.count);
  const texts = formatContinuousValues(values, scale.domain, "quantitative");
  const radius = config.symbol.radius;
  let symbols;
  let labels;
  let title;
  if (vertical) {
    const baseX = config.position === "right"
      ? plot.x + plot.width + config.offset
      : plot.x - config.offset;
    const y = values.map((_, index) => plot.y + 46 + index * config.itemGap);
    symbols = y.map(itemY => ({
      x: config.position === "right" ? baseX + radius : baseX - radius,
      y: itemY
    }));
    labels = y.map(itemY => ({
      x: config.position === "right"
        ? baseX + radius * 2 + config.labels.offset - 2
        : baseX - radius * 2 - config.labels.offset + 2,
      y: itemY,
      align: config.position === "right" ? "left" : "right"
    }));
    title = {
      x: config.position === "right" ? baseX : baseX - radius * 2,
      y: plot.y + 20,
      align: config.position === "right" ? "left" : "right"
    };
  } else if (config.titlePosition === "left") {
    const titleWidth = measureTextWidth(config.title, config.titleStyle);
    const labelWidths = texts.map(text =>
      measureTextWidth(text, config.labels)
    );
    const samplesWidth = labelWidths.reduce(
      (sum, width) => sum + radius * 2 + config.labels.offset + width,
      0
    ) + config.itemGap * (values.length - 1);
    const width = titleWidth + 20 + samplesWidth;
    const startX = config.align === "left" ? plot.x
      : config.align === "right" ? plot.x + plot.width - width
        : plot.x + (plot.width - width) / 2;
    const height = Math.max(
      radius * 2,
      config.labels.fontSize,
      config.titleStyle.fontSize
    );
    const centerY = config.position === "top"
      ? plot.y - config.offset - height / 2
      : plot.y + plot.height + config.offset + height / 2;
    title = { x: startX, y: centerY, align: "left" };
    let cursor = startX + titleWidth + 20;
    symbols = [];
    labels = [];
    for (let index = 0; index < values.length; index += 1) {
      const symbolX = cursor + radius;
      symbols.push({ x: symbolX, y: centerY });
      const labelX = symbolX + radius + config.labels.offset;
      labels.push({ x: labelX, y: centerY, align: "left" });
      cursor = labelX + labelWidths[index] + config.itemGap;
    }
  } else {
    const width = (values.length - 1) * Math.max(56, config.itemGap * 2);
    const startX = config.align === "left" ? plot.x
      : config.align === "right" ? plot.x + plot.width - width
        : plot.x + (plot.width - width) / 2;
    const titleHalf = config.titleStyle.fontSize / 2;
    const labelHalf = config.labels.fontSize / 2;
    const y = config.position === "top"
      ? plot.y - config.offset - config.labels.fontSize -
        config.labels.offset - radius
      : plot.y + plot.height + config.offset +
        config.titleStyle.fontSize + 12 + radius;
    symbols = values.map((_, index) => ({
      x: startX + index * width / (values.length - 1),
      y
    }));
    labels = symbols.map(symbol => ({
      x: symbol.x,
      y: symbol.y + radius + config.labels.offset + labelHalf,
      align: "center"
    }));
    title = {
      x: startX + width / 2,
      y: y - radius - 12 - titleHalf,
      align: "center"
    };
  }
  const strokeExtent = (config.symbol.strokeWidth ?? 0) / 2;
  const symbolExtent = radius + strokeExtent;
  const titleBounds = resolveLegendTextBounds(
    title,
    config.title,
    config.titleStyle
  );
  const labelBounds = labels.map((label, index) =>
    resolveLegendTextBounds(label, texts[index], config.labels)
  );
  const symbolBounds = symbols.map(symbol => ({
    left: symbol.x - symbolExtent,
    right: symbol.x + symbolExtent,
    top: symbol.y - symbolExtent,
    bottom: symbol.y + symbolExtent
  }));
  const occupiedBounds = [titleBounds, ...labelBounds, ...symbolBounds];
  assertLegendBoundsInsideCanvas(
    occupiedBounds,
    canvas,
    "Opacity legend layout"
  );
  const background = resolveLegendBackgroundFromBounds(
    occupiedBounds,
    config.border,
    canvas,
    "Opacity legend"
  );
  return { values, texts, symbols, labels, title, background };
}

export const rematerializeOpacityLegend = /* @__PURE__ */ action(
  {
    op: "rematerializeOpacityLegend",
    description: "Rematerialize a field-opacity sample legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeOpacityLegend");
    const stored = this.guideConfigs.legend?.opacity;
    if (stored === undefined) {
      throw new Error("Opacity legend requires stored configuration.");
    }
    const { encoding, scale, config } = resolveOpacityConfig(this, stored);
    const layout = resolveOpacityLayout(this, config, scale);
    const opacities = mapLinearValues(layout.values, scale.domain, scale.range, {
      clamp: scale.clamp ?? false
    });
    let next = this
      .editSemantic({
        property: "guide.legend.opacity.scale",
        value: encoding.scale
      })
      .editSemantic({
        property: "guide.legend.opacity.title",
        value: config.title
      })
      ._withLegendConfig("opacity", config)
      .editGraphics({
        target: "opacityLegendSymbols",
        property: "length",
        value: layout.values.length
      })
      .editGraphics({
        target: "opacityLegendSymbols",
        property: "x",
        value: layout.symbols.map(symbol => symbol.x)
      })
      .editGraphics({
        target: "opacityLegendSymbols",
        property: "y",
        value: layout.symbols.map(symbol => symbol.y)
      })
      .editGraphics({
        target: "opacityLegendSymbols",
        property: "radius",
        value: config.symbol.radius
      })
      .editGraphics({
        target: "opacityLegendSymbols",
        property: "fill",
        value: config.symbol.fill
      })
      .editGraphics({
        target: "opacityLegendSymbols",
        property: "opacity",
        value: opacities
      })
      .editGraphics({
        target: "opacityLegendLabels",
        property: "length",
        value: layout.values.length
      })
      .editGraphics({
        target: "opacityLegendLabels",
        property: "x",
        value: layout.labels.map(label => label.x)
      })
      .editGraphics({
        target: "opacityLegendLabels",
        property: "y",
        value: layout.labels.map(label => label.y)
      })
      .editGraphics({
        target: "opacityLegendLabels",
        property: "text",
        value: layout.texts
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
    if (config.titleVisible === false) return next;
    next = next
      .editGraphics({
        target: "opacityLegendTitle",
        property: "x",
        value: layout.title.x
      })
      .editGraphics({
        target: "opacityLegendTitle",
        property: "y",
        value: layout.title.y
      })
      .editGraphics({
        target: "opacityLegendTitle",
        property: "text",
        value: config.title
      });
    return styleContinuousText(
      next,
      "opacityLegendTitle",
      config.titleStyle,
      { align: layout.title.align }
    );
  }
);


export function resolveOpacityLegendCreation(program, args = {}) {
  const config = normalizeContinuousLegend(args, "opacity");
  if (args.channels !== undefined && (
    !Array.isArray(args.channels) ||
    args.channels.length !== 1 ||
    args.channels[0] !== "opacity"
  )) {
    throw new Error('Opacity legend requires channels: ["opacity"].');
  }
  config.symbol = normalizeOpacitySymbol(args.symbol);
  config.titleVisible = true;
  const resolved = resolveOpacityConfig(program, config);
  return resolved;
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
    let next = this
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
    return next
      .createGraphics({
        id: "opacityLegendSymbols",
        type: "circle",
        length: 0,
        ...resolveLegendGraphicPlacement(next),
        ...(resolved.config.border === false
          ? {}
          : { after: "opacityLegendBackground" })
      })
      .createGraphics({
        id: "opacityLegendLabels",
        type: "text",
        length: 0,
        ...resolveLegendGraphicPlacement(next)
      })
      .createGraphics({
        id: "opacityLegendTitle",
        type: "text",
        ...resolveLegendGraphicPlacement(next)
      })
      .rematerializeOpacityLegend();
  }
);

export const removeOpacityLegend = /* @__PURE__ */ action(
  {
    op: "removeOpacityLegend",
    description: "Remove a field-opacity legend after switching to constant opacity."
  },
  function (args = {}) {
    validateKeys(args, [], "removeOpacityLegend");
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
