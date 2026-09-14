import { action, closedAction } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { validateKeys } from "../../../../core/validation.js";
import { mapScaleConsumerValues } from "../../../../materialization/scales/map.js";
import { inverseLerp, interpolateNumber } from "../../../../grammar/numeric.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import {
  assertLegendBoundsInsideCanvas,
  editLegendBackground,
  editGraphicProperties,
  formatContinuousValues,
  normalizeContinuousLegend,
  requireResolvedLegendScale,
  resolveContinuousBounds,
  resolveContinuousColorLayer,
  resolveLegendBackgroundFromBounds,
  resolveLegendTextBounds,
  sampleContinuousValues,
  styleContinuousText,
  validatePositive
} from "./common.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { resolveEffectiveLegendBlockConfig } from "../blocks.js";

export const DEFAULT_GRADIENT_SIZE = Object.freeze({ length: 120, thickness: 12 });

const GRADIENT_OPTIONS = Object.freeze(["length", "thickness"]);

export function resolveGradientLayout(program, config, scale, label = "Gradient legend") {
  const { plot, canvas } = resolveContinuousBounds(program);
  const vertical = ["right", "left"].includes(config.position);
  const length = config.gradient.length;
  const thickness = config.gradient.thickness;
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
    : {
        x: x + length / 2,
        y: y - titleGap - config.titleStyle.fontSize / 2,
        align: "center"
      };
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
  const labelOffset = config.labels.offset;
  const labels = vertical
    ? fractions.map(fraction => ({
        x: config.position === "right"
          ? x + thickness + labelOffset
          : x - labelOffset,
        y: y + length * (1 - fraction),
        align: config.position === "right" ? "left" : "right"
      }))
    : fractions.map(fraction => ({
        x: x + length * fraction,
        y: y + thickness + labelOffset + config.labels.fontSize / 2,
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
  const stripBounds = {
    left: x,
    right: x + (vertical ? thickness : length),
    top: y,
    bottom: y + (vertical ? length : thickness)
  };
  const tickBounds = ticks.map(tick => ({
    left: Math.min(tick.x1, tick.x2) - 0.5,
    right: Math.max(tick.x1, tick.x2) + 0.5,
    top: Math.min(tick.y1, tick.y2) - 0.5,
    bottom: Math.max(tick.y1, tick.y2) + 0.5
  }));
  const labelBounds = labels.map((label, index) =>
    resolveLegendTextBounds(label, texts[index], config.labels, program.materializationConfigs.textMetrics)
  );
  const titleBounds = config.titleVisible === false ? undefined : resolveLegendTextBounds(
    title,
    config.title,
    config.titleStyle
  , program.materializationConfigs.textMetrics);
  const occupiedBounds = [stripBounds, ...tickBounds, ...labelBounds,
    ...(config.titleVisible === false ? [] : [titleBounds])];
  assertLegendBoundsInsideCanvas(
    occupiedBounds,
    canvas,
    `${label} layout`, config
  );
  const background = resolveLegendBackgroundFromBounds(
    occupiedBounds,
    config.border,
    canvas,
    label, config
  );
  return {
    vertical, x, y, length, thickness, values, texts, labels, ticks, title,
    background
  };
}

export function resolveGradientConfig(program, config, channel = "color") {
  const layer = resolveContinuousColorLayer(program, config.target, channel);
  const encoding = layer.encoding[channel];
  if (!["quantitative", "temporal"].includes(encoding.fieldType)) {
    throw new Error(`${channel === "color" ? "Gradient" : "Stroke gradient"} legend requires quantitative or temporal ${channel}.`);
  }
  const scale = requireResolvedLegendScale(
    program,
    encoding.scale,
    "sequential"
  );
  return {
    layer,
    encoding,
    scale,
    config: {
      ...config,
      target: layer.id,
      scale: encoding.scale,
      fieldType: encoding.fieldType,
      title: config.inferredTitle ? encoding.field : config.title,
      domain: scale.domain
    }
  };
}

// Both channels use the same positions and width policy. Their paint and
// semantic/graphic namespaces remain explicit channel-owned choices.
export function materializeGradientLegend(program, resolved, appearance) {
  const stroke = appearance !== undefined;
  const channel = stroke ? "stroke" : "color";
  const kind = stroke ? "strokeGradient" : "gradient";
  const prefix = `${channel}Gradient`;
  const { scale, encoding, config: currentConfig } = resolved;
  const config = resolveEffectiveLegendBlockConfig(program, kind, currentConfig);
  const layout = resolveGradientLayout(program, config, scale,
    stroke ? "Stroke gradient legend" : "Gradient legend");
  const stripCount = 60;
  const stripSize = layout.length / stripCount;
  const strips = Array.from({ length: stripCount }, (_, index) => {
    const fraction = (index + 0.5) / stripCount;
    const position = layout.vertical ? 1 - fraction : fraction;
    const samplingScale = scale.midpoint === undefined ? { ...scale, domain: [0, 1] } : scale;
    const value = scale.midpoint === undefined ? position : interpolateNumber(...scale.domain, position);
    const [color] = mapScaleConsumerValues([value], samplingScale, channel);
    return {
      x: layout.x + (layout.vertical ? 0 : index * stripSize),
      y: layout.y + (layout.vertical ? index * stripSize : 0),
      width: layout.vertical ? layout.thickness : stripSize,
      height: layout.vertical ? stripSize : layout.thickness,
      fill: stroke ? appearance.fill : color,
      stroke: color,
      strokeWidth: stroke ? appearance.strokeWidth : 0
    };
  });
  let next = program
    .editSemantic({ property: `guide.legend.${channel}.scale`, value: encoding.scale })
    .editSemantic({ property: `guide.legend.${channel}.title`, value: config.title })
    ._withLegendConfig(kind, currentConfig);
  // Preserve each channel's established primitive trace order.
  if (!stroke) next = next.editGraphics({ target: `${prefix}Strips`, property: "length", value: strips.length });
  next = editLegendBackground(next, `${prefix}Background`, layout.background, config.border);
  if (stroke) next = next.editGraphics({ target: `${prefix}Strips`, property: "length", value: strips.length });
  for (const property of ["x", "y", "width", "height", "fill", "stroke", "strokeWidth"]) {
    next = next.editGraphics({ target: `${prefix}Strips`, property, value: strips.map(strip => strip[property]) });
  }
  next = next.editGraphics({ target: `${prefix}Ticks`, property: "length", value: layout.ticks.length });
  for (const property of ["x1", "y1", "x2", "y2"]) {
    next = next.editGraphics({ target: `${prefix}Ticks`, property, value: layout.ticks.map(tick => tick[property]) });
  }
  next = editGraphicProperties(next, `${prefix}Ticks`, { stroke: DEFAULT_COLORS.mutedText, strokeWidth: 1 });
  next = editGraphicProperties(next, `${prefix}Labels`, {
    length: layout.labels.length, x: layout.labels.map(label => label.x),
    y: layout.labels.map(label => label.y), text: layout.texts
  });
  next = styleContinuousText(next, `${prefix}Labels`, config.labels, { align: layout.labels[0].align });
  if (config.titleVisible === false) return next;
  next = editGraphicProperties(next, `${prefix}Title`, { x: layout.title.x, y: layout.title.y, text: config.title });
  return styleContinuousText(next, `${prefix}Title`, config.titleStyle, { align: layout.title.align });
}

export const rematerializeGradientLegend = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeGradientLegend",
    description: "Rematerialize a continuous color gradient legend."
  }, [],
  function (args = {}) {
    const stored = this.guideConfigs.legend?.gradient;
    if (stored === undefined) {
      throw new Error("Gradient legend requires stored configuration.");
    }
    return materializeGradientLegend(this, resolveGradientConfig(this, stored));
  }
);


export function resolveGradientLegendCreation(program, args = {}, channel = "color") {
  const config = normalizeContinuousLegend(args, "gradient");
  if (args.channels !== undefined && (
    !Array.isArray(args.channels) ||
    args.channels.length !== 1 ||
    args.channels[0] !== channel
  )) {
    throw new Error(`Gradient legend requires channels: ["${channel}"].`);
  }
  if (args.gradient !== undefined && !isPlainObject(args.gradient)) {
    throw new TypeError("createLegend.gradient must be a plain object.");
  }
  validateKeys(
    args.gradient ?? {},
    GRADIENT_OPTIONS,
    "createLegend.gradient"
  );
  config.gradient = {
    length: args.gradient?.length ?? DEFAULT_GRADIENT_SIZE.length,
    thickness: args.gradient?.thickness ?? DEFAULT_GRADIENT_SIZE.thickness
  };
  config.titleVisible = true;
  validatePositive(config.gradient.length, "Gradient length");
  validatePositive(config.gradient.thickness, "Gradient thickness");
  const resolved = resolveGradientConfig(program, config, channel);
  return resolved;
}

export function createGradientLegendFromConfig(program, config, channel = "color") {
  const prefix = `${channel}Gradient`;
  const kind = channel === "color" ? "gradient" : "strokeGradient";
  const resolved = resolveGradientConfig(program, config, channel);
  resolveGradientLayout(program, resolved.config, resolved.scale, channel === "color" ? "Gradient legend" : "Stroke gradient legend");
  let next = program
    .editSemantic({
      property: `guide.legend.${channel}.scale`,
      value: resolved.encoding.scale
    })
    .editSemantic({
      property: `guide.legend.${channel}.title`,
      value: resolved.config.title
    })
    ._withLegendConfig(kind, resolved.config);
  if (resolved.config.border !== false) {
    next = next.createGraphics({
      id: `${prefix}Background`,
      type: "rect",
      ...resolveLegendGraphicPlacement(next)
    });
  }
  next = next
    .createGraphics({
      id: `${prefix}Strips`,
      type: "rect",
      length: 0,
      ...resolveLegendGraphicPlacement(next, resolved.config.border === false
        ? {}
        : { after: `${prefix}Background` })
    })
    .createGraphics({
      id: `${prefix}Ticks`,
      type: "line",
      length: 0,
      ...resolveLegendGraphicPlacement(next)
    })
    .createGraphics({
      id: `${prefix}Labels`,
      type: "text",
      length: 0,
      ...resolveLegendGraphicPlacement(next)
    });
  if (resolved.config.titleVisible !== false) {
    next = next.createGraphics({
      id: `${prefix}Title`,
      type: "text",
      ...resolveLegendGraphicPlacement(next)
    });
  }
  return next[channel === "color" ? "rematerializeGradientLegend" : "rematerializeStrokeGradientLegend"]();
}

export const createGradientLegend = /* @__PURE__ */ action(
  {
    op: "createGradientLegend",
    description: "Create a continuous color gradient legend."
  },
  function (args = {}) {
    const resolved = resolveGradientLegendCreation(this, args);
    resolveGradientLayout(this, resolved.config, resolved.scale);
    if (this.graphicSpec.objects.colorGradientStrips !== undefined) {
      throw new Error(
        "createGradientLegend requires a missing gradient legend."
      );
    }
    return createGradientLegendFromConfig(this, resolved.config);
  }
);
