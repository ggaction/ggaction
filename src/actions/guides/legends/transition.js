import { isDiscretizedColorScaleType } from "../../../grammar/scales/types.js";
import { normalizeContinuousLegend } from "./continuous/common.js";
import { DEFAULT_GRADIENT_SIZE } from "./continuous/gradient.js";
import { normalizeIntervalLegend } from "./continuous/interval.js";

const family = (channel, type) => type === "sequential"
  ? channel === "stroke" ? "strokeGradient" : "gradient"
  : isDiscretizedColorScaleType(type)
    ? channel === "stroke" ? "strokeInterval" : "interval"
    : type === "ordinal"
      ? channel === "stroke" ? "stroke" : "color"
    : undefined;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function categoricalFamilyCustom(program, kind, stored) {
  const side = ["left", "right"].includes(stored.position);
  const direction = side ? "vertical" : "horizontal";
  const itemGap = side ? 28 : stored.position === "top" ? 24 : 20;
  const order = program.semanticSpec.guides.legend?.[kind]?.order;
  return stored.inferredSymbol !== true ||
    stored.direction !== direction ||
    (stored.columns !== undefined && !(side && stored.columns === 1)) ||
    stored.itemGap !== itemGap || stored.layout !== "edge" ||
    order !== undefined;
}

function planChannelLegendTransition(program, scale, nextType, channel) {
  const from = family(channel, scale.type), to = family(channel, nextType);
  if (from === undefined || to === undefined || from === to) return undefined;
  const stored = program.guideConfigs.legend?.[from];
  if ((stored?.scale ?? stored?.scales?.[0]) !== scale.id) return undefined;
  const side = ["left", "right"].includes(stored.position);
  const categorical = ["color", "stroke"].includes(from);
  const gradientFamily = from.toLowerCase().endsWith("gradient");
  const defaults = gradientFamily ? normalizeContinuousLegend({ position: stored.position }, "gradient")
    : normalizeIntervalLegend({ position: stored.position });
  const comparableSymbol = channel === "stroke" && stored.inferredStrokeWidth === true
    ? { ...stored.symbol, strokeWidth: defaults.symbol?.strokeWidth }
    : stored.symbol;
  const custom = categorical
    ? categoricalFamilyCustom(program, from, stored)
    : gradientFamily
    ? stored.count !== defaults.count || !same(stored.gradient, DEFAULT_GRADIENT_SIZE) || stored.itemGap !== defaults.itemGap
    : !same(comparableSymbol, defaults.symbol) || stored.itemGap !== defaults.itemGap ||
      stored.direction !== defaults.direction || (stored.columns !== undefined && !(side && stored.columns === 1));
  if (custom) {
    throw new Error(`${channel} legend transition cannot discard custom family settings; remove and recreate the legend explicitly.`);
  }
  const args = {
    target: stored.target, channels: [channel], position: stored.position,
    labels: stored.labels, titleStyle: stored.titleStyle, border: stored.border,
    align: stored.align, offset: stored.offset, titlePosition: stored.titlePosition,
    ...(stored.inferredTitle ? {} : { title: stored.title })
  };
  try {
    if (["interval", "strokeInterval"].includes(to)) {
      normalizeIntervalLegend({ ...args, channels: undefined });
    }
    else if (["gradient", "strokeGradient"].includes(to)) {
      normalizeContinuousLegend(args, "gradient");
    }
  } catch (error) {
    throw new Error(`${channel} legend transition has incompatible layout or style: ${error.message}`);
  }
  return { args, channel, titleVisible: stored.titleVisible !== false };
}

export function planColorLegendTransitions(program, scale, nextType) {
  return ["color", "stroke"].flatMap(channel => {
    const plan = planChannelLegendTransition(program, scale, nextType, channel);
    return plan === undefined ? [] : [plan];
  });
}

export function planColorLegendTransition(program, scale, nextType) {
  return planColorLegendTransitions(program, scale, nextType)[0];
}

export function applyColorLegendTransition(program, plan) {
  const next = program.createLegend(plan.args);
  return plan.titleVisible ? next : next.editLegend({ target: plan.args.target, title: false });
}
