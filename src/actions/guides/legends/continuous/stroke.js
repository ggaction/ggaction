import { action } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { validateKeys, validateOptionObject } from
  "../../../../core/validation.js";
import { formatDiscretizedIntervals } from
  "../../../../grammar/scales/index.js";
import { inverseLerp, interpolateNumber } from
  "../../../../grammar/numeric.js";
import { resolveLegendItemLayout } from "../../../../layout/legendItems.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { mapScaleConsumerValues } from
  "../../../../materialization/scales/map.js";
import { findLayer } from "../../../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import {
  assertLegendBoundsInsideCanvas,
  editGraphicProperties,
  editLegendBackground,
  formatContinuousValues,
  normalizeContinuousLegend,
  requireResolvedLegendScale,
  resolveContinuousBounds,
  resolveContinuousColorLayer,
  resolveLegendBackgroundFromBounds,
  resolveLegendTextBounds,
  sampleContinuousValues,
  styleContinuousText,
  validateNonNegative,
  validatePositive
} from "./common.js";
import { DEFAULT_GRADIENT_SIZE } from "./gradient.js";
import { normalizeIntervalLegend } from "./interval.js";
import { resolveEffectiveLegendBlockConfig } from "../blocks.js";

const GRADIENT_OPTIONS = Object.freeze(["length", "thickness"]);

function requireChannels(args, operation) {
  if (
    !Array.isArray(args.channels) ||
    args.channels.length !== 1 ||
    args.channels[0] !== "stroke"
  ) {
    throw new Error(`${operation} requires channels: ["stroke"].`);
  }
}

function strokeWidth(program, target) {
  const config = program.markConfigs[target] ?? {};
  return config.barAppearance?.strokeWidth ?? config.strokeWidth ?? ({
    point: 1,
    line: 2,
    area: 1,
    bar: 0.5,
    rect: 1,
    arc: 1,
    rule: 2,
    tick: 2
  }[findLayer(program, target)?.mark?.type] ?? 1);
}

function sampleFill(program, target) {
  const graphic = program.graphicSpec.objects[target];
  const properties = graphic?.items?.[0]?.properties ?? graphic?.properties;
  return properties?.fill ?? DEFAULT_COLORS.mark;
}

function resolveGradientConfig(program, stored) {
  const layer = resolveContinuousColorLayer(program, stored.target, "stroke");
  const encoding = layer.encoding.stroke;
  if (!["quantitative", "temporal"].includes(encoding.fieldType)) {
    throw new Error("Stroke gradient legend requires quantitative or temporal stroke.");
  }
  const scale = requireResolvedLegendScale(program, encoding.scale, "sequential");
  return {
    encoding,
    scale,
    config: {
      ...stored,
      target: layer.id,
      scale: encoding.scale,
      fieldType: encoding.fieldType,
      title: stored.inferredTitle ? encoding.field : stored.title,
      domain: scale.domain
    }
  };
}

function resolveGradientLayout(program, config, scale) {
  const { plot, canvas } = resolveContinuousBounds(program);
  const vertical = ["right", "left"].includes(config.position);
  const { length, thickness } = config.gradient;
  const titleGap = config.blockGap ?? 12;
  let x;
  let y;
  if (config.position === "right") {
    x = plot.x + plot.width + config.offset;
    y = plot.y + 46 + titleGap - 12;
  } else if (config.position === "left") {
    x = plot.x - config.offset - thickness;
    y = plot.y + 46 + titleGap - 12;
  } else {
    x = config.align === "left" ? plot.x
      : config.align === "right" ? plot.x + plot.width - length
        : plot.x + (plot.width - length) / 2;
    y = config.position === "top"
      ? plot.y - config.offset - thickness - config.labels.offset -
        config.labels.fontSize
      : plot.y + plot.height + config.offset +
        (config.titleVisible === false ? 0 : config.titleStyle.fontSize + titleGap);
  }
  const title = vertical
    ? { x, y: plot.y + 20, align: "left" }
    : { x: x + length / 2, y: y - titleGap - config.titleStyle.fontSize / 2,
        align: "center" };
  const values = [...sampleContinuousValues(scale.domain, config.count)];
  if (scale.midpoint !== undefined && !values.includes(scale.midpoint)) {
    values.push(scale.midpoint);
    values.sort((a, b) => scale.domain[1] > scale.domain[0] ? a - b : b - a);
  }
  const texts = formatContinuousValues(
    values,
    scale.domain,
    config.fieldType,
    config.labels.format
  );
  const fractions = values.map((value, index) => scale.midpoint === undefined
    ? index / (values.length - 1)
    : inverseLerp(value, ...scale.domain));
  const labels = vertical
    ? fractions.map(fraction => ({
        x: config.position === "right"
          ? x + thickness + config.labels.offset
          : x - config.labels.offset,
        y: y + length * (1 - fraction),
        align: config.position === "right" ? "left" : "right"
      }))
    : fractions.map(fraction => ({
        x: x + length * fraction,
        y: y + thickness + config.labels.offset + config.labels.fontSize / 2,
        align: "center"
      }));
  const ticks = vertical
    ? labels.map(label => ({
        x1: config.position === "right" ? x + thickness : x,
        y1: label.y,
        x2: config.position === "right" ? x + thickness + 6 : x - 6,
        y2: label.y
      }))
    : labels.map(label => ({
        x1: label.x,
        y1: y + thickness,
        x2: label.x,
        y2: y + thickness + 6
      }));
  const occupied = [
    { left: x, right: x + (vertical ? thickness : length), top: y,
      bottom: y + (vertical ? length : thickness) },
    ...ticks.map(tick => ({
      left: Math.min(tick.x1, tick.x2) - 0.5,
      right: Math.max(tick.x1, tick.x2) + 0.5,
      top: Math.min(tick.y1, tick.y2) - 0.5,
      bottom: Math.max(tick.y1, tick.y2) + 0.5
    })),
    ...labels.map((label, index) =>
      resolveLegendTextBounds(label, texts[index], config.labels)),
    ...(config.titleVisible === false ? [] : [
      resolveLegendTextBounds(title, config.title, config.titleStyle)
    ])
  ];
  assertLegendBoundsInsideCanvas(occupied, canvas, "Stroke gradient legend layout", config);
  return {
    vertical,
    x,
    y,
    length,
    thickness,
    values,
    texts,
    labels,
    ticks,
    title,
    background: resolveLegendBackgroundFromBounds(
      occupied,
      config.border,
      canvas,
      "Stroke gradient legend",
      config
    )
  };
}

export function resolveStrokeGradientLegendCreation(program, args = {}) {
  requireChannels(args, "Stroke gradient legend");
  const config = normalizeContinuousLegend(args, "gradient");
  if (args.gradient !== undefined && !isPlainObject(args.gradient)) {
    throw new TypeError("createLegend.gradient must be a plain object.");
  }
  validateKeys(args.gradient ?? {}, GRADIENT_OPTIONS, "createLegend.gradient");
  config.gradient = {
    length: args.gradient?.length ?? DEFAULT_GRADIENT_SIZE.length,
    thickness: args.gradient?.thickness ?? DEFAULT_GRADIENT_SIZE.thickness
  };
  config.titleVisible = true;
  validatePositive(config.gradient.length, "Gradient length");
  validatePositive(config.gradient.thickness, "Gradient thickness");
  return resolveGradientConfig(program, config);
}

export const rematerializeStrokeGradientLegend = /* @__PURE__ */ action(
  {
    op: "rematerializeStrokeGradientLegend",
    description: "Rematerialize a continuous stroke gradient legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeStrokeGradientLegend");
    const stored = this.guideConfigs.legend?.strokeGradient;
    if (stored === undefined) {
      throw new Error("Stroke gradient legend requires stored configuration.");
    }
    const { encoding, scale, config: currentConfig } = resolveGradientConfig(this, stored);
    const config = resolveEffectiveLegendBlockConfig(this, "strokeGradient", currentConfig);
    const layout = resolveGradientLayout(this, config, scale);
    const fill = sampleFill(this, config.target);
    const width = strokeWidth(this, config.target);
    const stripCount = 60;
    const stripSize = layout.length / stripCount;
    const strips = Array.from({ length: stripCount }, (_, index) => {
      const fraction = (index + 0.5) / stripCount;
      const position = layout.vertical ? 1 - fraction : fraction;
      const samplingScale = scale.midpoint === undefined
        ? { ...scale, domain: [0, 1] }
        : scale;
      const value = scale.midpoint === undefined
        ? position
        : interpolateNumber(...scale.domain, position);
      const [color] = mapScaleConsumerValues([value], samplingScale, "stroke");
      return {
        x: layout.x + (layout.vertical ? 0 : index * stripSize),
        y: layout.y + (layout.vertical ? index * stripSize : 0),
        width: layout.vertical ? layout.thickness : stripSize,
        height: layout.vertical ? stripSize : layout.thickness,
        fill,
        stroke: color,
        strokeWidth: width
      };
    });
    let next = this
      .editSemantic({ property: "guide.legend.stroke.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.stroke.title", value: config.title })
      ._withLegendConfig("strokeGradient", currentConfig);
    next = editLegendBackground(
      next,
      "strokeGradientBackground",
      layout.background,
      config.border
    );
    next = editGraphicProperties(next, "strokeGradientStrips", {
      length: strips.length,
      x: strips.map(strip => strip.x),
      y: strips.map(strip => strip.y),
      width: strips.map(strip => strip.width),
      height: strips.map(strip => strip.height),
      fill: strips.map(strip => strip.fill),
      stroke: strips.map(strip => strip.stroke),
      strokeWidth: strips.map(strip => strip.strokeWidth)
    });
    next = editGraphicProperties(next, "strokeGradientTicks", {
      length: layout.ticks.length,
      x1: layout.ticks.map(tick => tick.x1),
      y1: layout.ticks.map(tick => tick.y1),
      x2: layout.ticks.map(tick => tick.x2),
      y2: layout.ticks.map(tick => tick.y2),
      stroke: DEFAULT_COLORS.mutedText,
      strokeWidth: 1
    });
    next = editGraphicProperties(next, "strokeGradientLabels", {
      length: layout.labels.length,
      x: layout.labels.map(label => label.x),
      y: layout.labels.map(label => label.y),
      text: layout.texts
    });
    next = styleContinuousText(next, "strokeGradientLabels", config.labels, {
      align: layout.labels[0].align
    });
    if (config.titleVisible === false) return next;
    next = editGraphicProperties(next, "strokeGradientTitle", {
      x: layout.title.x,
      y: layout.title.y,
      text: config.title
    });
    return styleContinuousText(next, "strokeGradientTitle", config.titleStyle, {
      align: layout.title.align
    });
  }
);

export function createStrokeGradientLegendFromConfig(program, config) {
  const resolved = resolveGradientConfig(program, config);
  resolveGradientLayout(program, resolved.config, resolved.scale);
  let next = program
    .editSemantic({
      property: "guide.legend.stroke.scale",
      value: resolved.encoding.scale
    })
    .editSemantic({
      property: "guide.legend.stroke.title",
      value: resolved.config.title
    })
    ._withLegendConfig("strokeGradient", resolved.config);
  const placement = resolveLegendGraphicPlacement(next);
  if (resolved.config.border !== false) {
    next = next.createGraphics({
      id: "strokeGradientBackground",
      type: "rect",
      ...placement
    });
  }
  next = next
    .createGraphics({
      id: "strokeGradientStrips",
      type: "rect",
      length: 0,
      ...resolveLegendGraphicPlacement(next, resolved.config.border === false
        ? {}
        : { after: "strokeGradientBackground" })
    })
    .createGraphics({ id: "strokeGradientTicks", type: "line", length: 0,
      ...resolveLegendGraphicPlacement(next) })
    .createGraphics({ id: "strokeGradientLabels", type: "text", length: 0,
      ...resolveLegendGraphicPlacement(next) });
  if (resolved.config.titleVisible !== false) {
    next = next.createGraphics({ id: "strokeGradientTitle", type: "text",
      ...resolveLegendGraphicPlacement(next) });
  }
  return next.rematerializeStrokeGradientLegend();
}

export const createStrokeGradientLegend = /* @__PURE__ */ action(
  {
    op: "createStrokeGradientLegend",
    description: "Create a continuous stroke gradient legend."
  },
  function (args = {}) {
    const resolved = resolveStrokeGradientLegendCreation(this, args);
    if (this.guideConfigs.legend?.strokeGradient !== undefined) {
      throw new Error("createStrokeGradientLegend requires a missing stroke legend.");
    }
    return createStrokeGradientLegendFromConfig(this, resolved.config);
  }
);

export function resolveStrokeIntervalConfig(program, stored) {
  const layer = resolveContinuousColorLayer(program, stored.target, "stroke");
  const encoding = layer.encoding.stroke;
  if (encoding.fieldType !== "quantitative") {
    throw new Error("Stroke interval legend requires quantitative stroke.");
  }
  const scale = program.resolvedScales[encoding.scale];
  if (!["quantize", "quantile", "threshold"].includes(scale?.type)) {
    throw new Error(
      `Stroke interval legend requires a resolved discretized scale "${encoding.scale}".`
    );
  }
  return { encoding, scale, config: {
    ...stored,
    target: layer.id,
    scale: encoding.scale,
    title: stored.inferredTitle ? encoding.field : stored.title,
    ...(stored.inferredStrokeWidth === true ? {
      symbol: { ...stored.symbol, strokeWidth: strokeWidth(program, layer.id) }
    } : {})
  } };
}

export function resolveStrokeIntervalLayout(program, config, scale) {
  const { plot, canvas } = resolveContinuousBounds(program);
  const labels = formatDiscretizedIntervals(scale.thresholds, config.labels.format);
  const layout = resolveLegendItemLayout(plot, config, labels, config.symbol);
  assertLegendBoundsInsideCanvas(
    layout.bounds,
    canvas,
    "Stroke interval legend layout",
    config
  );
  return {
    labels,
    ...layout,
    background: resolveLegendBackgroundFromBounds(
      layout.bounds,
      config.border,
      canvas,
      "Stroke interval legend",
      config
    )
  };
}

export function resolveStrokeIntervalLegendCreation(program, args = {}) {
  requireChannels(args, "Stroke interval legend");
  const config = normalizeIntervalLegend({ ...args, channels: undefined });
  const layer = resolveContinuousColorLayer(program, config.target, "stroke");
  config.symbol = {
    ...config.symbol,
    ...(args.symbol?.strokeWidth === undefined
      ? { strokeWidth: strokeWidth(program, layer.id) }
      : {})
  };
  config.inferredStrokeWidth = args.symbol?.strokeWidth === undefined;
  validateNonNegative(config.symbol.strokeWidth, "Legend symbol strokeWidth");
  return resolveStrokeIntervalConfig(program, config);
}

export const rematerializeStrokeIntervalLegend = /* @__PURE__ */ action(
  {
    op: "rematerializeStrokeIntervalLegend",
    description: "Rematerialize a discretized stroke interval legend."
  },
  function (args = {}) {
    validateKeys(args, [], "rematerializeStrokeIntervalLegend");
    const stored = this.guideConfigs.legend?.strokeInterval;
    if (stored === undefined) {
      throw new Error("Stroke interval legend requires stored configuration.");
    }
    const { encoding, scale, config: currentConfig } = resolveStrokeIntervalConfig(this, stored);
    const config = resolveEffectiveLegendBlockConfig(this, "strokeInterval", currentConfig);
    const layout = resolveStrokeIntervalLayout(this, config, scale);
    const fill = config.blockSymbol?.fill ?? sampleFill(this, config.target);
    let next = this
      .editSemantic({ property: "guide.legend.stroke.scale", value: encoding.scale })
      .editSemantic({ property: "guide.legend.stroke.title", value: config.title })
      ._withLegendConfig("strokeInterval", currentConfig);
    next = editGraphicProperties(next, "strokeIntervalSymbols", {
      length: scale.range.length,
      x: layout.symbolX,
      y: layout.itemY.map(value => value - config.symbol.height / 2),
      width: config.symbol.width,
      height: config.symbol.height,
      fill,
      stroke: scale.range,
      strokeWidth: config.symbol.strokeWidth,
      ...(config.blockSymbol?.opacity === undefined
        ? {}
        : { opacity: config.blockSymbol.opacity })
    });
    next = editGraphicProperties(next, "strokeIntervalLabels", {
      length: layout.labels.length,
      x: layout.labelX,
      y: layout.itemY,
      text: layout.labels
    });
    next = editLegendBackground(
      next,
      "strokeIntervalBackground",
      layout.background,
      config.border
    );
    next = styleContinuousText(next, "strokeIntervalLabels", config.labels);
    if (config.titleVisible === false) return next;
    next = editGraphicProperties(next, "strokeIntervalTitle", {
      x: layout.title.x,
      y: layout.title.y,
      text: config.title
    });
    return styleContinuousText(next, "strokeIntervalTitle", config.titleStyle, {
      align: layout.title.align
    });
  }
);

export function createStrokeIntervalLegendFromConfig(program, config) {
  const resolved = resolveStrokeIntervalConfig(program, config);
  resolveStrokeIntervalLayout(program, resolved.config, resolved.scale);
  let next = program
    .editSemantic({
      property: "guide.legend.stroke.scale",
      value: resolved.encoding.scale
    })
    .editSemantic({
      property: "guide.legend.stroke.title",
      value: resolved.config.title
    })
    ._withLegendConfig("strokeInterval", resolved.config);
  const placement = resolveLegendGraphicPlacement(next);
  if (resolved.config.border !== false) {
    next = next.createGraphics({ id: "strokeIntervalBackground", type: "rect",
      ...placement });
  }
  next = next
    .createGraphics({ id: "strokeIntervalSymbols", type: "rect", length: 0,
      ...resolveLegendGraphicPlacement(next, resolved.config.border === false
        ? {}
        : { after: "strokeIntervalBackground" }) })
    .createGraphics({ id: "strokeIntervalLabels", type: "text", length: 0,
      ...placement });
  if (resolved.config.titleVisible !== false) {
    next = next.createGraphics({ id: "strokeIntervalTitle", type: "text",
      ...placement });
  }
  return next.rematerializeStrokeIntervalLegend();
}

export const createStrokeIntervalLegend = /* @__PURE__ */ action(
  {
    op: "createStrokeIntervalLegend",
    description: "Create a discretized stroke interval legend."
  },
  function (args = {}) {
    validateOptionObject(args, undefined, "createStrokeIntervalLegend");
    const resolved = resolveStrokeIntervalLegendCreation(this, args);
    if (this.guideConfigs.legend?.strokeInterval !== undefined) {
      throw new Error("createStrokeIntervalLegend requires a missing stroke legend.");
    }
    return createStrokeIntervalLegendFromConfig(this, resolved.config);
  }
);

export function registerStrokeColorLegendActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, {
    createStrokeGradientLegend,
    rematerializeStrokeGradientLegend,
    createStrokeIntervalLegend,
    rematerializeStrokeIntervalLegend
  });
}
