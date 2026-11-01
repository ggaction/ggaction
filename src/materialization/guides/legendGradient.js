import { alignLegendLabels, alignLegendTitle, resolveLegendTitleText } from "../../layout/legendText.js";
import { validateLegendClip } from "../../grammar/legendClip.js";
import { validateLegendSpacing } from "../../grammar/legendSpacing.js";
import { resolveLegendContentSpacing } from "../../layout/legendSpacing.js";
import { intrinsicLegendConfig } from "../legendGroups.js";
import { mapContinuousScaleValues, sampleSymlogValues, transformedTicks } from "../../grammar/scales/index.js";
import { inverseLerp } from "../../grammar/numeric.js";
import { readLegendSampling, validateSamplingAgainstScale } from "../../grammar/legendSampling.js";
import { resolveColorSymbolsLayout } from "./legendSamples.js";
import { resolveContinuousBounds, formatContinuousValues, sampleContinuousValues, resolveLegendTextBounds, assertLegendBoundsInsideCanvas, resolveLegendBackgroundFromBounds } from "./legendLayout.js";

function automaticTickIndices(bounds, values, vertical) {
  const start = vertical ? "top" : "left";
  const end = vertical ? "bottom" : "right";
  const selected = [];
  // Keep the extent and zero before optional intermediate ticks. Authored
  // exact values bypass this selection, including intentional close labels.
  const priority = new Set([0, values.length - 1, values.indexOf(0),
    ...values.map((_, index) => index)]);
  for (const index of priority) {
    if (index < 0) continue;
    if (selected.every(other => bounds[index][end] + 4 <= bounds[other][start] ||
      bounds[other][end] + 4 <= bounds[index][start])) selected.push(index);
  }
  return selected.sort((a, b) => a - b);
}

export function resolveGradientLayout(program, config, scale, label = "Gradient legend", stripStrokeWidth = 0) {
  validateLegendClip("gradient",config);
  validateLegendSpacing("gradient",config);
  if (config.representation === "symbols") return resolveColorSymbolsLayout(program, config, scale);
  config = intrinsicLegendConfig(program, config);
  const { plot, canvas } = resolveContinuousBounds(program);
  return resolveGradientLayoutValues({ plot, canvas, config, scale, profile: program.materializationConfigs.textMetrics, label, stripStrokeWidth });
}

// Native legend geometry also consumes explicit prepared inputs during a
// transition. Neither path needs a mutable program or graphical action.
export function resolveGradientLayoutValues({ plot, canvas, config, scale, profile, label = "Gradient legend", stripStrokeWidth = 0 }) {
  const vertical = config.gradientDirection === undefined
    ? ["right", "left"].includes(config.position) : config.gradientDirection === "vertical";
  const stripWidth = vertical ? config.gradient.thickness : config.gradient.length;
  const stripHeight = vertical ? config.gradient.length : config.gradient.thickness;
  const length = config.gradient.length;
  const thickness = config.gradient.thickness;
  const titleText = config.titleVisible === false ? { height: 0, extraHeight: 0 }
    : resolveLegendTitleText(config.title, config.titleStyle, profile);
  const titleGap = config.blockGap ?? 12;
  let x;
  let y;
  if (config.position === "right") {
    x = plot.x + plot.width + config.offset;
    y = plot.y + 46 + titleGap - 12 + titleText.extraHeight / 2;
  } else if (config.position === "left") {
    x = plot.x - config.offset - stripWidth;
    y = plot.y + 46 + titleGap - 12 + titleText.extraHeight / 2;
  } else {
    x = config.align === "left" ? plot.x
      : config.align === "right" ? plot.x + plot.width - stripWidth
        : plot.x + (plot.width - stripWidth) / 2;
    y = config.position === "top"
      ? plot.y - config.offset - stripHeight - config.labels.offset -
        config.labels.fontSize
      : plot.y + plot.height + config.offset +
        (config.titleVisible === false ? 0 : titleText.height + titleGap);
  }
  let title = vertical
    ? { x, y: ["right", "left"].includes(config.position) ? plot.y + 20
      : y - titleGap - titleText.height / 2, align: "left" }
    : {
        x: x + length / 2,
        y: y - titleGap - titleText.height / 2,
        align: "center"
      };
  const transformed = ["log", "pow", "sqrt", "symlog"].includes(scale.type);
  const sampling = validateSamplingAgainstScale(readLegendSampling(config), scale, label);
  const exact = sampling.mode === "values";
  let values = exact ? [...sampling.values] : scale.type === "symlog"
    ? sampleSymlogValues(scale.domain, config.count, { constant: scale.constant }) : transformed
    ? transformedTicks(scale.type, scale.domain, config.count,
        scale.type === "log" ? {base: scale.base}
          : scale.type === "pow" ? {exponent: scale.exponent}
          : scale.type === "symlog" ? {constant: scale.constant} : {})
    : [...sampleContinuousValues(scale.domain, config.count)];
  if (!exact && scale.midpoint !== undefined && !values.includes(scale.midpoint)) {
    values.push(scale.midpoint);
    values.sort((a, b) => scale.domain[1] > scale.domain[0] ? a - b : b - a);
  }
  let texts = formatContinuousValues(
    values,
    scale.domain,
    config.fieldType,
    config.labels.format
  );
  const fractions = transformed || exact ? mapContinuousScaleValues(values, {...scale, range: [0, 1]})
    : values.map((value, index) => !exact && scale.midpoint === undefined
    ? index / (values.length - 1)
    : inverseLerp(value, ...scale.domain));
  const labelOffset = config.labels.offset;
  let labels = vertical
    ? fractions.map(fraction => ({
        x: config.position === "left"
          ? x - labelOffset : x + thickness + labelOffset,
        y: y + length * (1 - fraction),
        align: config.position === "left" ? "right" : "left"
      }))
    : fractions.map(fraction => ({
        x: x + length * fraction,
        y: y + thickness + labelOffset + config.labels.fontSize / 2,
        align: "center"
      }));
  if (!exact && transformed) {
    const bounds = labels.map((label, index) => resolveLegendTextBounds(
      label, texts[index], config.labels, profile));
    const indices = automaticTickIndices(bounds, values, vertical);
    values = indices.map(index => values[index]);
    texts = indices.map(index => texts[index]);
    labels = indices.map(index => labels[index]);
  }
  let ticks = vertical
    ? labels.map(label => ({
        x1: config.position === "left" ? x : x + thickness,
        y1: label.y,
        x2: config.position === "left" ? x - 6 : x + thickness + 6,
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
  labels = alignLegendLabels(labels, texts, config.labels, profile);
  const labelBounds = labels.map((label, index) =>
    resolveLegendTextBounds(label, texts[index], config.labels, profile)
  );
  if (config.titlePosition === "bottom" && config.titleVisible !== false) {
    const bottom = Math.max(stripBounds.bottom + stripStrokeWidth / 2,
      ...tickBounds.map(bounds => bounds.bottom), ...labelBounds.map(bounds => bounds.bottom));
    title = { x: vertical ? x : x + length / 2,
      y: bottom + titleGap + titleText.height / 2, align: vertical ? "left" : "center" };
  }
  if (config.titleVisible !== false) title = alignLegendTitle(title, config.title, config.titleStyle,
    [{ left: stripBounds.left - stripStrokeWidth / 2, right: stripBounds.right + stripStrokeWidth / 2,
      top: stripBounds.top - stripStrokeWidth / 2, bottom: stripBounds.bottom + stripStrokeWidth / 2 },
      ...tickBounds, ...labelBounds], profile);
  const titleBounds = config.titleVisible === false ? undefined : resolveLegendTextBounds(
    title,
    config.title,
    config.titleStyle
  , profile, { hardBreaks: true });
  let occupiedBounds = [stripBounds, ...tickBounds, ...labelBounds,
    ...(config.titleVisible === false ? [] : [titleBounds])];
  const spacing = config.titlePadding === undefined ? undefined : resolveLegendContentSpacing(config,[{row:0,x,y,bounds:[
    {left:stripBounds.left-stripStrokeWidth/2,right:stripBounds.right+stripStrokeWidth/2,
      top:stripBounds.top-stripStrokeWidth/2,bottom:stripBounds.bottom+stripStrokeWidth/2},
    ...tickBounds,...labelBounds.filter((_,index) => texts[index] !== "")
  ]}],titleBounds);
  if (spacing !== undefined) {
    const {dx,dy}=spacing.offsets[0];x+=dx;y+=dy;
    labels=labels.map(point=>({...point,x:point.x+dx,y:point.y+dy}));
    ticks=ticks.map(tick=>({...tick,x1:tick.x1+dx,x2:tick.x2+dx,y1:tick.y1+dy,y2:tick.y2+dy}));
    title={...title,x:title.x+spacing.titleOffset.dx,y:title.y+spacing.titleOffset.dy};
    occupiedBounds=spacing.bounds;
  }
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

export const GRADIENT_STRIP_COUNT = 60;
export function gradientStripGeometry(layout, index) {
  const size = layout.length / GRADIENT_STRIP_COUNT;
  return {
    x: layout.x + (layout.vertical ? 0 : index * size),
    y: layout.y + (layout.vertical ? index * size : 0),
    width: layout.vertical ? layout.thickness : size,
    height: layout.vertical ? size : layout.thickness
  };
}
