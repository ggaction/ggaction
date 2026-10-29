import { formatAxisValue, formatNumericAxisTicks } from "../grammar/axisFormat.js";
import { formatTimeTick, formatTimeTicks } from "../grammar/ticks.js";
import { formatTransformedTick, isTransformedScaleType } from "../grammar/scales/index.js";
import { resolveDisplayLabel } from "../grammar/displayLabels.js";
import { wrapText } from "../layout/text.js";

// Text and line grouping are shared by explicit materialization and read-only hit metadata.
export function axisLabelTexts(values, scale, config) {
  const fallback = value => formatAxisValue(value, scale.type, config.format,
    item => scale.type === "time" ? formatTimeTick(item, scale.domain)
      : isTransformedScaleType(scale.type) ? formatTransformedTick(scale.type, item) : String(item));
  const automatic = config.format === "ticks" ? formatNumericAxisTicks(values, scale.type)
    : scale.type === "time" && config.format === "auto" ? formatTimeTicks(values, scale.domain) : undefined;
  return values.map((value, index) => resolveDisplayLabel(value, config.labelMap, raw => automatic?.[index] ?? fallback(raw)));
}

export function axisLabelLines(text, config, profile) {
  return config.maxWidth === undefined ? text.split(/\r\n|\r|\n/u) : wrapText(text, {
    maxWidth: config.maxWidth, mode: config.wrap,
    style: { fontSize: config.fontSize, fontFamily: config.fontFamily, fontWeight: config.fontWeight }, profile
  });
}
