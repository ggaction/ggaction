import { guideCanvasProperties } from "./canvas.js";
import { resolveGraphicBounds, canvasOverflowError } from "../../layout/canvas.js";
import { findCanvasGraphic } from "../graphicHierarchy.js";
import { resolveTextBounds } from "../../core/textMetrics.js";
import { resolveLegendTitleText } from "../../layout/legendText.js";
import { isHorizontalEdgeLegend } from "../../layout/legendLane.js";
import { formatTimeTick } from "../../grammar/ticks.js";
import { formatValue, validateValueFormat } from "../../grammar/valueFormat.js";
import { formatDistinctNumericSamples, sampleNumericRange } from "../../grammar/numeric.js";

export function resolveContinuousBounds(
  program,
  message = "Continuous legend layout requires Canvas bounds."
) {
  const plot = resolveGraphicBounds(program);
  const canvas = findCanvasGraphic(program);
  if (
    plot === undefined ||
    ![plot.x, plot.y, plot.width, plot.height].every(Number.isFinite) ||
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height)
  ) {
    throw new Error(message);
  }
  return { plot, canvas: guideCanvasProperties(program) };
}

export function sampleContinuousValues(domain, count) {
  return sampleNumericRange(
    domain[0],
    domain[1],
    count,
    "Continuous legend domain"
  );
}

export function formatContinuousValues(values, domain, fieldType, format = "auto") {
  const resolved = validateValueFormat(format, "Legend label format");
  if (resolved === "auto") {
    return fieldType === "temporal"
      ? values.map(value => formatTimeTick(value, domain))
      : formatDistinctNumericSamples(values);
  }
  return values.map(value => formatValue(value, {
    format: resolved,
    valueType: fieldType === "temporal" ? "temporal" : "quantitative",
    label: "Legend label format"
  }));
}

export function resolveLegendTextBounds(position, text, style, profile, { hardBreaks = true } = {}) {
  return resolveTextBounds({
    x: position.x,
    y: position.y,
    text: String(text),
    ...style,
    ...(hardBreaks ? { lines: resolveLegendTitleText(text, style, profile).lines } : {}),
    textAlign: position.align ?? "left",
    textBaseline: "middle"
  }, profile);
}

export function assertLegendBoundsInsideCanvas(bounds, canvas, label, config) {
  // Outside content is intrinsic until its shared edge lane places the final
  // concrete bounds. In-plot and legacy layouts validate their own anchors.
  if (canvas.deferCanvasFit || config?.groupIntrinsic || isHorizontalEdgeLegend(config) || ["left", "right"].includes(config?.position)) return;
  if (bounds.some(item =>
    item.left < 0 || item.right > canvas.width ||
    item.top < 0 || item.bottom > canvas.height
  )) {
    throw canvasOverflowError(`${label} requires more Canvas margin space.`, bounds, canvas);
  }
}

export function resolveLegendBackgroundFromBounds(
  bounds,
  border,
  canvas,
  label,
  config
) {
  if (border === false) return undefined;
  const strokeExtent = border.lineWidth / 2;
  let x = Infinity;
  let y = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const item of bounds) {
    x = Math.min(x, item.left);
    y = Math.min(y, item.top);
    right = Math.max(right, item.right);
    bottom = Math.max(bottom, item.bottom);
  }
  x -= border.padding;
  y -= border.padding;
  right += border.padding;
  bottom += border.padding;
  if (!canvas.deferCanvasFit && !config?.groupIntrinsic && !isHorizontalEdgeLegend(config) && !["left", "right"].includes(config?.position) && (
    x - strokeExtent < 0 || y - strokeExtent < 0 ||
    right + strokeExtent > canvas.width ||
    bottom + strokeExtent > canvas.height
  )) {
    throw canvasOverflowError(`${label} background requires more Canvas margin space.`, [{
      left: x - strokeExtent, right: right + strokeExtent,
      top: y - strokeExtent, bottom: bottom + strokeExtent
    }], canvas);
  }
  return { x, y, width: right - x, height: bottom - y };
}
