import { annotateError, getErrorDetails } from "../core/diagnostics.js";
import { validateWorkLimit } from "../core/validation.js";
import { resolveTextBounds, textBoundsFitCanvas, textBoundsIntersect } from "../core/textMetrics.js";
import { mapContinuousScaleValues, mapOrdinalPositionValues } from "../grammar/scales/index.js";
import { canvasOverflowError } from "../layout/canvas.js";
import { prepareAxisLabelLayout, resolvePreparedAxisLabelLayout } from "./axisLabelLayout.js";

const RESPONSIVE_FAILURES = new Set(["label-overlap", "label-lines", "label-size"]);

// All resource lookup and authored-option validation stay with the caller.
// This owner consumes resolved native inputs and keeps candidate selection and
// measured placement identical for native actions and prepared frame sampling.
function candidate(input, config, indices) {
  const { channel, canvas, measuring, titleBounds } = input;
  const prepared = prepareAxisLabelLayout({ ...input, config, indices });
  const layout = resolvePreparedAxisLabelLayout(prepared);
  const { resolved, labelBounds, orderedBounds, requiredBounds, rotatedOverlap } = layout;
  if (!canvas || measuring !== true && !labelBounds.every(item => textBoundsFitCanvas(item, canvas))) {
    throw canvasOverflowError(`The ${channel}-axis labels do not fit the Canvas margin.`, labelBounds, canvas);
  }
  if (config.overlap === "error" && orderedBounds.some((item, index) => rotatedOverlap
    ? orderedBounds.slice(0, index).some(previous => textBoundsIntersect(previous, item))
    : index > 0 && textBoundsIntersect(orderedBounds[index - 1], item))) {
    throw annotateError(new Error(`The ${channel}-axis labels overlap each other.`), { reason: "label-overlap", requiredBounds });
  }
  if (titleBounds && labelBounds.some(item => textBoundsIntersect(item, titleBounds))) {
    throw new Error(`The ${channel}-axis labels overlap the axis title.`);
  }
  return { ...resolved, labelBounds, requiredBounds };
}

function responsiveLabelWidth({ scale, bounds, canvas, responsive, margin, values, channel }, config, indices) {
  if (config.maxWidth !== undefined) return config.maxWidth;
  if (channel === "y") {
    return Math.max(1, canvas.width - responsive.minPlotSize.width -
      (config.position === "left" ? margin.right : margin.left) - config.offset);
  }
  const chosen = indices.map(index => values[index]);
  const positions = (["ordinal", "band", "point"].includes(scale.type)
    ? mapOrdinalPositionValues(chosen, scale) : mapContinuousScaleValues(chosen, scale)).toSorted((a, b) => a - b);
  let width = bounds.width;
  for (let index = 1; index < positions.length; index += 1) width = Math.min(width, positions[index] - positions[index - 1]);
  return Math.max(1, width);
}

export function resolveAxisLabelCandidates(input) {
  const { config, responsive, values, channel, axisId = channel, canvas, profile } = input;
  const policy = config.responsive;
  if (policy === undefined || responsive === undefined) return candidate(input, config);
  validateWorkLimit(values.length * (3 + policy.rotationCandidates.length), "Responsive label candidate work");
  const all = values.map((_, index) => index);
  const skipped = all.filter(index => index % policy.skipStride === 0);
  let lastReason = "native-fit";
  let requiredBounds;
  const candidates = [
    { stage: "native", indices: all, options: config },
    { stage: "wrap", indices: all, options: { ...config, maxWidth: responsiveLabelWidth(input, config, all), wrap: config.wrap ?? "word" } },
    { stage: "skip", indices: skipped, options: { ...config, maxWidth: responsiveLabelWidth(input, config, skipped), wrap: config.wrap ?? "word" } }
  ];
  const rotated = candidates.at(-1);
  for (const rotation of policy.rotationCandidates) {
    if (config.flush === true && rotation !== 0) continue;
    candidates.push({ ...rotated, stage: "rotate", options: { ...rotated.options, rotation } });
  }
  for (const current of candidates) {
    try {
      const resolved = candidate(input, current.options, current.indices);
      requiredBounds = resolved.requiredBounds;
      const counts = new Map();
      for (const group of resolved.groups) counts.set(group, (counts.get(group) ?? 0) + 1);
      if ([...counts.values()].some(count => count > policy.maxLines)) {
        throw annotateError(new Error("Responsive label exceeds maxLines."), { reason: "label-lines" });
      }
      if (resolved.text.some(text => {
        const measured = resolveTextBounds({ text, x: 0, y: 0, fontSize: config.fontSize,
          fontFamily: config.fontFamily, fontWeight: config.fontWeight, rotation: current.options.rotation }, profile);
        return measured.right - measured.left > canvas.width || measured.bottom - measured.top > canvas.height;
      })) throw annotateError(new Error("Responsive label exceeds Canvas dimensions."), { reason: "label-size" });
      return { ...resolved, responsiveResult: { stage: current.stage, reason: lastReason,
        indices: resolved.indices, rotation: current.options.rotation,
        ...(current.options.maxWidth === undefined ? {} : { maxWidth: current.options.maxWidth, wrap: current.options.wrap }) } };
    } catch (error) {
      const reason = getErrorDetails(error)?.reason;
      if (!RESPONSIVE_FAILURES.has(reason)) throw error;
      requiredBounds = getErrorDetails(error)?.requiredBounds ?? requiredBounds;
      lastReason = reason;
    }
  }
  throw annotateError(new Error(`Responsive ${channel}-axis labels cannot satisfy the declared fallback policy.`), {
    reason: "layout-unsatisfied", layout: { owner: axisId, reason: lastReason, requiredBounds,
      requiredPlotSize: responsive.minPlotSize }
  });
}
