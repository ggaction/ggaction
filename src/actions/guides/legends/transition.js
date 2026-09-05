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
  if (stored.position !== "right" || (stored.direction ?? "vertical") !== "vertical") {
    throw new Error("Color legend transition requires right/vertical placement; remove and recreate the legend for other layouts.");
  }
  const defaults = from === "gradient" ? normalizeContinuousLegend({}, "gradient") : normalizeIntervalLegend({});
  const custom = from === "gradient"
    ? stored.count !== defaults.count || !same(stored.gradient, DEFAULT_GRADIENT_SIZE) || stored.itemGap !== defaults.itemGap
    : !same(stored.symbol, defaults.symbol) || stored.itemGap !== defaults.itemGap;
  if (custom) {
    throw new Error("Color legend transition cannot discard custom family settings; remove and recreate the legend explicitly.");
  }
  const args = {
    target: stored.target, channels: ["color"], position: "right",
    labels: stored.labels, titleStyle: stored.titleStyle, border: stored.border,
    align: stored.align, offset: stored.offset,
    ...(stored.inferredTitle ? {} : { title: stored.title })
  };
  return { args, titleVisible: stored.titleVisible !== false };
}

export function applyColorLegendTransition(program, plan) {
  const next = program.createLegend(plan.args);
  return plan.titleVisible ? next : next.editLegend({ target: plan.args.target, title: false });
}
