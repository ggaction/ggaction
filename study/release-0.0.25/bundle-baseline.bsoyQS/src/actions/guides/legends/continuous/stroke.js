import { action, closedAction } from "../../../../core/action.js";

import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { findLayer } from "../../../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import {
  editGraphicProperties,
  editLegendBackground,
  resolveContinuousColorLayer,
  styleContinuousText,
  validateNonNegative,
} from "./common.js";
import { materializeGradientLegend, resolveGradientConfig, resolveGradientLegendCreation, createGradientLegendFromConfig } from "./gradient.js";
import { normalizeIntervalLegend, resolveIntervalLayout, resolveIntervalConfig } from "./interval.js";
import { resolveEffectiveLegendBlockConfig } from "../blocks.js";

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

export function resolveStrokeGradientLegendCreation(program, args = {}) {
  requireChannels(args, "Stroke gradient legend");
  return resolveGradientLegendCreation(program, args, "stroke");
}

export const rematerializeStrokeGradientLegend = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeStrokeGradientLegend",
    description: "Rematerialize a continuous stroke gradient legend."
  }, [],
  function (args = {}) {
    const stored = this.guideConfigs.legend?.strokeGradient;
    if (stored === undefined) {
      throw new Error("Stroke gradient legend requires stored configuration.");
    }
    const resolved = resolveGradientConfig(this, stored, "stroke");
    return materializeGradientLegend(this, resolved, {
      fill: sampleFill(this, resolved.config.target),
      strokeWidth: strokeWidth(this, resolved.config.target)
    });
  }
);

export function createStrokeGradientLegendFromConfig(program, config) {
  return createGradientLegendFromConfig(program, config, "stroke");
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
  const resolved = resolveIntervalConfig(program, stored, "stroke");
  if (stored.inferredStrokeWidth !== true) return resolved;
  return { ...resolved, config: { ...resolved.config,
    symbol: { ...stored.symbol, strokeWidth: strokeWidth(program, resolved.config.target) }
  } };
}

export function resolveStrokeIntervalLayout(program, config, scale) {
  return resolveIntervalLayout(program, config, scale, "Stroke interval legend");
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

export const rematerializeStrokeIntervalLegend = /* @__PURE__ */ closedAction(
  {
    op: "rematerializeStrokeIntervalLegend",
    description: "Rematerialize a discretized stroke interval legend."
  }, [],
  function (args = {}) {
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

export const createStrokeIntervalLegend = /* @__PURE__ */ closedAction(
  {
    op: "createStrokeIntervalLegend",
    description: "Create a discretized stroke interval legend."
  }, undefined,
  function (args = {}) {
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
