import { requestedRectStyleDetails } from "../../../../grammar/roundedRect.js";
import { requestedStrokeDetails } from "../../../../grammar/strokeStyle.js";
import { findLayerMatching } from "../../../../selectors/layers.js";

export function resolveLegendSymbol(program, layer, channels, requested, kind) {
  if (requested !== undefined && requested !== "auto") return requested;
  const config = program.markConfigs[layer.id] ?? {};
  const bar = config.barAppearance ?? {};
  const styleOwner = layer.mark.type === "bar" ? bar : layer.mark.type === "table" ? config.tablePlot.cells : layer.mark.type === "pyramid" ? config.pyramidPlot.stages : layer.mark.type === "ohlc" ? config.ohlcPlot.body : layer.mark.type === "waterfall" ? config.waterfallPlot.bars : layer.mark.type === "geo" ? config.geo : layer.mark.type === "trail" ? config.trailPlot.body : config;
  const outline = styleOwner.outline;
  const strokeDetails = {
    ...requestedStrokeDetails(styleOwner, "Legend source"),
    ...(styleOwner.shadow === undefined || styleOwner.shadow === false ? {} : { shadow: styleOwner.shadow }),
    ...(outline === undefined || outline === false || channels?.includes("stroke") ? {} : { outline })
  };
  const rectDetails = ["bar", "rect"].includes(layer.mark.type)
    ? { ...requestedRectStyleDetails(styleOwner, "Legend source"), ...strokeDetails }
    : strokeDetails;
  if (layer.mark.type === "geo" && channels?.length === 1 && channels[0] === "color") {
    if (layer.geoBinding.mode === "line") return { layers: [{ type: "line", length: 32, lineWidth: styleOwner.strokeWidth, ...strokeDetails }] };
    if (layer.geoBinding.mode === "point") return { layers: [{ type: "point", size: styleOwner.radiusPx, stroke: styleOwner.stroke, strokeWidth: styleOwner.strokeWidth, ...strokeDetails }] };
  }
  if (channels?.length === 1 && channels[0] === "stroke") {
    const strokeWidth = bar.strokeWidth ?? config.strokeWidth ?? ({
      point: 1,
      line: 2,
      area: 1,
      bar: 0.5,
      rect: 1,
      arc: 1,
      rule: 2,
      tick: 2
    }[layer.mark.type] ?? 1);
    if (["line", "rule", "tick"].includes(layer.mark.type)) {
      return { layers: [{
        type: "line",
        length: 32,
        lineWidth: strokeWidth,
        ...strokeDetails
      }] };
    }
    if (layer.mark.type === "point") {
      return { layers: [{
        type: "point",
        size: 5,
        fill: config.fill ?? "#4c78a8",
        stroke: "white",
        strokeWidth,
        ...strokeDetails
      }] };
    }
    return { layers: [{
      type: "swatch",
      width: 14,
      height: 12,
      stroke: "white",
      strokeWidth,
      ...rectDetails
    }] };
  }
  if (layer.mark?.type === "point" && channels?.includes("shape")) {
    const color = channels.includes("color") ? layer.encoding?.color : undefined;
    const matchingLine = color?.scale === undefined
      ? undefined
      : findLayerMatching(program, candidate =>
        candidate.mark?.type === "line" &&
        candidate.encoding?.color?.field === color.field &&
        candidate.encoding?.color?.scale === color.scale
      );
    const lineStyle = matchingLine === undefined ? {} : program.markConfigs[matchingLine.id] ?? {};
    const lineDetails = matchingLine === undefined
      ? {}
      : requestedStrokeDetails(
          lineStyle,
          "Legend line source"
        );
    return { layers: [
      ...(matchingLine !== undefined ? [{
        type: "line",
        length: 32,
        lineWidth: 3,
        ...lineDetails,
        ...(lineStyle.shadow === undefined || lineStyle.shadow === false ? {} : { shadow: lineStyle.shadow })
      }] : []),
      {
        type: "point",
        size: Math.sqrt(64 / Math.PI),
        stroke: "white",
        strokeWidth: 0,
        ...strokeDetails
      }
    ] };
  }
  if (layer.mark.type === "line" && channels?.length === 1 && channels[0] === "color") {
    return { layers: [{ type: "line", length: 32, lineWidth: 2, ...strokeDetails }] };
  }
  if (Object.keys(rectDetails).length === 0) return undefined;
  return kind === "series"
    ? { layers: [{ type: "line", length: 32, lineWidth: 2, ...strokeDetails }] }
    : { layers: [{
        type: "swatch",
        width: 14,
        height: 12,
        stroke: "white",
        strokeWidth: 0.5,
        ...rectDetails
      }] };
}
