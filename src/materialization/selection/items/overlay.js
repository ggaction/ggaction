import { resolveOverlaySeries, overlaySegments } from "../../overlayItems.js";
import { finalizeItems, uniqueFields, channelMapFromRow } from "./common.js";

export function resolveOverlayItems(program, layer) {
  const binding = layer.derivedBindings.overlay;
  const series = resolveOverlaySeries(program, binding);
  const definitions = layer.mark.type === "point" ? series.flatMap(group => group.points)
    : series.flatMap(group => overlaySegments(group, binding).map(points => {
      const members = [...new Set(points.flatMap(point => point.members))];
      const fields = uniqueFields(points.map(point => point.fields));
      return { fields, channels: channelMapFromRow(fields, layer), members };
    }));
  return finalizeItems(program, layer, layer.mark.type === "point" ? "point" : "series", definitions,
    layer.mark.type === "line" ? "path" : ["circle", "rect", "path"]);
}
