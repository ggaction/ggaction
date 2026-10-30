

import { resolveGradientLayout } from "../../../../materialization/guides/legendGradient.js";

import { inferBin2DFieldTitle } from '../../../../grammar/bin2d.js';
import { findDataset } from '../../../../selectors/datasets.js';

import{hasLegendClipGraphics}from"../../../../materialization/legendClip.js";
import { normalizeColorSymbols, materializeColorSymbols } from "./colorSymbols.js";





import { action, closedAction } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { normalizeLegendGradient, DEFAULT_LEGEND_GRADIENT } from "../../../../grammar/legendGradient.js";
import { mapScaleConsumerValues } from "../../../../materialization/scales/map.js";
import { interpolateNumber } from "../../../../grammar/numeric.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import { editLegendBackground, editGraphicProperties, normalizeContinuousLegend, requireResolvedLegendScale, resolveContinuousColorLayer, styleContinuousText } from "./common.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { resolveEffectiveLegendBlockConfig } from "../../../../materialization/guides/legendConfig.js";


export const DEFAULT_GRADIENT_SIZE = DEFAULT_LEGEND_GRADIENT;

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
  const binOwner = Object.entries(program.materializationConfigs.data?.bin2d ?? {})
    .find(([, config]) => config.current === layer.data)?.[0] ?? layer.data;
  const binTransform = findDataset(program, layer.data)?.transform?.find(transform => transform.type === 'bin2d');
  const inferredTitle = inferBin2DFieldTitle(binTransform, binOwner, encoding.field);
  return {
    layer,
    encoding,
    scale,
    config: {
      ...config,
      target: layer.id,
      scale: encoding.scale,
      fieldType: encoding.fieldType,
      title: config.inferredTitle ? inferredTitle : config.title,
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
  if (!stroke && config.representation === "symbols") return materializeColorSymbols(program, resolved, config);
  const layout = resolveGradientLayout(program, config, scale,
    stroke ? "Stroke gradient legend" : "Gradient legend", appearance?.strokeWidth ?? 0);
  const stripCount = 60;
  const stripSize = layout.length / stripCount;
  const strips = Array.from({ length: stripCount }, (_, index) => {
    const fraction = (index + 0.5) / stripCount;
    const position = layout.vertical ? 1 - fraction : fraction;
    const samplingScale = scale.midpoint === undefined ? { ...scale, type: "sequential", domain: [0, 1] } : scale;
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
  if (config.gradient.opacity !== undefined) {
    next = next.editGraphics({ target: `${prefix}Strips`, property: "opacity", value: config.gradient.opacity });
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
    if(hasLegendClipGraphics(this))return this.rematerializeLegend();
    const stored = this.guideConfigs.legend?.gradient;
    if (stored === undefined) {
      throw new Error("Gradient legend requires stored configuration.");
    }
    return materializeGradientLegend(this, resolveGradientConfig(this, stored));
  }
);


export function resolveGradientLegendCreation(program, args = {}, channel = "color") {
  const { representation, ...options } = args;
  if (representation !== undefined && !["gradient", "symbols"].includes(representation)) throw new Error("Legend representation must be gradient or symbols.");
  if (channel !== "color" && representation !== undefined) throw new Error("Legend representation requires continuous color.");
  const config = representation === "symbols" ? normalizeColorSymbols(options, undefined, "create", program.materializationConfigs.theme) : normalizeContinuousLegend(options, "gradient");
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
  if (config.representation !== "symbols") config.gradient = normalizeLegendGradient(args.gradient);
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
  if (resolved.config.representation === "symbols") {
    next = next.createGraphics({ id: `${prefix}Symbols`, type: "circle", length: 0, ...resolveLegendGraphicPlacement(next) });
  } else next = next
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
    });
  next = next.createGraphics({
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
    if (this.guideConfigs.legend?.gradient !== undefined) {
      throw new Error(
        "createGradientLegend requires a missing gradient legend."
      );
    }
    return createGradientLegendFromConfig(this, resolved.config);
  }
);
