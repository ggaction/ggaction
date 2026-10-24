import { legendResourcePolicy } from "../../../materialization/guides/resources.js";
import { isContinuousColorScaleType } from "../../../grammar/scales/types.js";
import { isDiscretizedColorScaleType } from "../../../grammar/scales/types.js";
import { normalizeContinuousLegend } from "./continuous/common.js";
import { DEFAULT_GRADIENT_SIZE } from "./continuous/gradient.js";
import { normalizeIntervalLegend } from "./continuous/interval.js";
import {
  describeLegendBlock,
  legendBlockDescriptors,
  resolveLegendBlock
} from "./target.js";
import { validateLegendBlockOverride } from "./blocks.js";
import { DEFAULT_VERTICAL_LEGEND_ITEM_GAP } from "../../../theme/defaults.js";
import {LEGEND_SPACING_KEYS,normalizeLegendSpacing,validateLegendSpacing} from "../../../grammar/legendSpacing.js";

const family = (channel, type) => isContinuousColorScaleType(type)
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
  const itemGap = side ? DEFAULT_VERTICAL_LEGEND_ITEM_GAP : stored.position === "top" ? 24 : 20;
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
  if (["gradient","strokeGradient"].includes(to) && stored.rowPadding !== undefined) {
    throw new Error(`${channel} legend transition requires resetting rowPadding before creating a gradient block.`);
  }
  const oldDescriptor = describeLegendBlock(program, from, stored);
  const overrideKeys = Object.keys(stored.blockOverrides ?? {});
  if (overrideKeys.some(key => key !== oldDescriptor.key)) {
    throw new Error(`${channel} legend transition found stale legend block overrides.`);
  }
  const storedOverride = stored.blockOverrides?.[oldDescriptor.key];
  const { symbol: _sampleSymbol, labelMap: _sampleMap, gap: _sampleGap, ...commonOverride } = storedOverride ?? {};
  const blockOverride = stored.representation === "symbols" && storedOverride !== undefined ? commonOverride : storedOverride;
  const side = ["left", "right"].includes(stored.position);
  const categorical = ["color", "stroke"].includes(from);
  const gradientFamily = from.toLowerCase().endsWith("gradient");
  const defaults = gradientFamily ? normalizeContinuousLegend({ position: stored.position }, "gradient")
    : normalizeIntervalLegend({ position: stored.position });
  const comparableSymbol = channel === "stroke" && stored.inferredStrokeWidth === true
    ? { ...stored.symbol, strokeWidth: defaults.symbol?.strokeWidth }
    : stored.symbol;
  const sampledColor = from === "gradient" && stored.representation === "symbols";
  const custom = sampledColor ? false : categorical
    ? categoricalFamilyCustom(program, from, stored)
    : gradientFamily
    ? stored.sampling?.mode === "values" || stored.gradientDirection !== undefined || stored.count !== defaults.count || !same({ ...stored.gradient, opacity: stored.gradient?.opacity ?? 1 }, { ...DEFAULT_GRADIENT_SIZE, opacity: 1 }) || stored.itemGap !== defaults.itemGap
    : !same(comparableSymbol, defaults.symbol) || stored.itemGap !== defaults.itemGap ||
      stored.direction !== defaults.direction || (stored.columns !== undefined && !(side && stored.columns === 1));
  if (custom) {
    throw new Error(`${channel} legend transition cannot discard custom family settings; remove and recreate the legend explicitly.`);
  }
  if (blockOverride?.title !== undefined) {
    throw new Error(`${channel} legend transition cannot distribute a legend block title; edit the destination block explicitly.`);
  }
  if (blockOverride?.labelMap !== undefined) {
    throw new Error(`${channel} legend transition cannot distribute a legend block labelMap; edit the destination block explicitly.`);
  }
  if (blockOverride?.symbol !== undefined && ["gradient", "strokeGradient"].includes(to)) {
    throw new Error(`${channel} legend transition cannot apply symbol overrides to a gradient block.`);
  }
  const args = {
    target: stored.target, channels: [channel], position: stored.position,
    labels: stored.labels, titleStyle: stored.titleStyle, border: stored.border,
    align: stored.align, offset: stored.offset, titlePosition: sampledColor ? "top" : stored.titlePosition,
    ...normalizeLegendSpacing(stored),
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
  return { args, channel, titleVisible: stored.titleVisible !== false, inferredOffset: stored.inferredOffset, blockOverride };
}

export function planColorLegendTransitions(program, scale, nextType, { channel: requestedChannel, target } = {}) {
  return ["color", "stroke"].flatMap(channel => {
    if (requestedChannel !== undefined && channel !== requestedChannel) return [];
    if (target !== undefined && program.guideConfigs.legend?.[family(channel, scale.type)]?.target !== target) return [];
    const plan = planChannelLegendTransition(program, scale, nextType, channel);
    return plan === undefined ? [] : [plan];
  });
}

export function applyColorLegendTransition(program, plan) {
  let next = program.createLegend(plan.args);
  for (const [kind, config] of Object.entries(next.guideConfigs.legend ?? {})) {
    if (config.target === plan.args.target && legendResourcePolicy(kind).semanticKind === plan.channel) {
      next = next._withLegendConfig(kind, { ...config, inferredOffset: plan.inferredOffset === true });
    }
  }
  if (!plan.titleVisible) {
    next = next.editLegend({ target: plan.args.target, title: false });
  }
  if (plan.blockOverride === undefined) return next;
  const descriptor = resolveLegendBlock(next, {
    target: plan.args.target,
    channel: plan.channel
  }, `${plan.channel} legend transition`);
  validateLegendBlockOverride(descriptor, plan.blockOverride);
  next = next._withLegendConfig(descriptor.kind, {
    ...descriptor.config,
    blockOverrides: { [descriptor.key]: plan.blockOverride }
  });
  return next.rematerializeLegend();
}

function intersects(left, right) {
  return left.channels.some(channel => right.channels.includes(channel));
}

function explicitOrder(program, descriptor) {
  if (descriptor.family !== "categorical") return undefined;
  return program.semanticSpec.guides.legend?.[descriptor.kind]?.order;
}

function sameBlockValue(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length &&
      left.every((value, index) => sameBlockValue(value, right[index]));
  }
  if (left !== null && right !== null &&
    typeof left === "object" && typeof right === "object" &&
    !Array.isArray(left) && !Array.isArray(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index] &&
        sameBlockValue(left[key], right[key]));
  }
  return false;
}

function transitionError(target, oldDescriptors, nextDescriptor, field) {
  const oldKeys = oldDescriptors.map(item => item.key).join(", ");
  throw new Error(
    `Legend block transition for target "${target}" from ${oldKeys} to ${nextDescriptor.key} conflicts on ${field}.`
  );
}

function withoutBlockOverrides(config) {
  const { blockOverrides: _removed, ...rest } = config;
  return rest;
}

export function planLegendBlockTransitions(program, target, plans, position, spacingPatch = {}) {
  const oldDescriptors = legendBlockDescriptors(program, target);
  const nextDescriptors = plans.map(plan =>
    describeLegendBlock(program, plan.kind, plan.config));
  return plans.map((plan, index) => {
    const descriptor = nextDescriptors[index];
    const incoming = oldDescriptors.filter(old => intersects(old, descriptor));
    let override;
    if (["size-shape","color-size"].includes(descriptor.config.combine) && incoming.length > 1) {
      const positions = incoming.map(old=>old.config.blockOverrides?.[old.key]?.position);
      if (position === undefined && !positions.every(value=>value===positions[0])) transitionError(target, incoming, descriptor, "position");
      override = position === undefined && positions[0] !== undefined ? {position: positions[0]} : undefined;
    } else if (incoming.length === 1 && incoming[0].key === descriptor.key) {
      override = incoming[0].config.blockOverrides?.[incoming[0].key];
      if (incoming[0].config.representation === "symbols" && descriptor.kind === "gradient" && descriptor.config.representation !== "symbols" && override !== undefined) {
        const { symbol: _symbol, labelMap: _labelMap, ...common } = override; override = common;
      }
    } else if (incoming.length === 1) {
      const old = incoming[0];
      override = old.config.blockOverrides?.[old.key];
      if (["size-shape","color-size"].includes(incoming[0].config.combine) && override !== undefined) {
        const {title: _title, ...rest} = override; override = Object.keys(rest).length ? rest : undefined;
      }
      if(old.config.combine==='color-size'&&descriptor.kind==='gradient'&&override!==undefined){
        const {symbol:_symbol,labelMap:_map,gap:_gap,...common}=override;override=Object.keys(common).length?common:undefined;
      }
      if(old.config.combine==='color-size'&&descriptor.kind==='size'){
        const {type:_type,...style}=old.config.symbol;
        override={...override,symbol:{...style,...override?.symbol}};
      }
      if (override?.title !== undefined) {
        transitionError(target, incoming, descriptor, "title");
      }
      if (override?.labelMap !== undefined && !(old.config.combine==='color-size'&&descriptor.kind==='size')) {
        transitionError(target, incoming, descriptor, "labelMap");
      }
    } else if (incoming.length > 1) {
      const overrides = incoming.map(old => {
        const override = old.config.blockOverrides?.[old.key];
        if (position === undefined || override === undefined) return override;
        const {position: _local, ...rest} = override;
        return Object.keys(rest).length ? rest : undefined;
      });
      if (!overrides.every(value => sameBlockValue(value, overrides[0]))) {
        transitionError(target, incoming, descriptor, "block override");
      }
      const orders = incoming.map(old => explicitOrder(program, old));
      if (!orders.every(value => sameBlockValue(value, orders[0]))) {
        transitionError(target, incoming, descriptor, "order");
      }
      override = overrides[0];
    }
    if (override !== undefined) validateLegendBlockOverride(descriptor, override);
    const config = withoutBlockOverrides(plan.config);
    for (const key of LEGEND_SPACING_KEYS) {
      let value=config[key];
      if (spacingPatch[key] !== undefined) value=spacingPatch[key] === "auto" ? undefined
        : normalizeLegendSpacing({[key]:spacingPatch[key]})[key];
      else if (incoming.length > 0) {
        const values=incoming.map(old=>old.config[key]);
        if (!values.every(value=>value===values[0])) transitionError(target,incoming,descriptor,key);
        value=values[0];
      }
      if (value === undefined) delete config[key];else config[key]=value;
    }
    validateLegendSpacing(plan.kind,config);
    return {
      ...plan,
      config: override === undefined
        ? config
        : { ...config, blockOverrides: { [descriptor.key]: override } }
    };
  });
}
