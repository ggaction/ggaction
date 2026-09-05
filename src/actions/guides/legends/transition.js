import { isDiscretizedColorScaleType } from "../../../grammar/scales/types.js";
import { normalizeContinuousLegend } from "./continuous/common.js";
import { DEFAULT_GRADIENT_SIZE } from "./continuous/gradient.js";
import { normalizeIntervalLegend } from "./continuous/interval.js";

const family = type => type === "sequential" ? "gradient"
  : isDiscretizedColorScaleType(type) ? "interval" : undefined;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function planColorLegendTransition(program, scale, nextType) {
  const from = family(scale.type), to = family(nextType);
  if (from === undefined || to === undefined || from === to) return undefined;
  const stored = program.guideConfigs.legend?.[from];
  if (stored?.scale !== scale.id) return undefined;
  const side = ["left", "right"].includes(stored.position);
  const defaults = from === "gradient" ? normalizeContinuousLegend({ position: stored.position }, "gradient")
    : normalizeIntervalLegend({ position: stored.position });
  const custom = from === "gradient"
    ? stored.count !== defaults.count || !same(stored.gradient, DEFAULT_GRADIENT_SIZE) || stored.itemGap !== defaults.itemGap
    : !same(stored.symbol, defaults.symbol) || stored.itemGap !== defaults.itemGap ||
      stored.direction !== defaults.direction || (stored.columns !== undefined && !(side && stored.columns === 1));
  if (custom) {
    throw new Error("Color legend transition cannot discard custom family settings; remove and recreate the legend explicitly.");
  }
  const args = {
    target: stored.target, channels: ["color"], position: stored.position,
    labels: stored.labels, titleStyle: stored.titleStyle, border: stored.border,
    align: stored.align, offset: stored.offset, titlePosition: stored.titlePosition,
    ...(stored.inferredTitle ? {} : { title: stored.title })
  };
  try {
    if (to === "interval") normalizeIntervalLegend(args);
    else normalizeContinuousLegend(args, "gradient");
  } catch (error) {
    throw new Error(`Color legend transition has incompatible layout or style: ${error.message}`);
  }
  return { args, titleVisible: stored.titleVisible !== false };
}

export function applyColorLegendTransition(program, plan) {
  const next = program.createLegend(plan.args);
  return plan.titleVisible ? next : next.editLegend({ target: plan.args.target, title: false });
}
