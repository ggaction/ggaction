import { resolveOverlaySeries, overlaySegments } from "../../overlayItems.js";
import { finalizeItems, uniqueFields, channelMapFromRow } from "./common.js";

export function resolveOverlayItems(program, layer, selectionResolvers) {
  const binding = layer.derivedBindings.overlay;
  const series = resolveOverlaySeries(program, binding, { geometry: !selectionResolvers?.sourceOnly,
    pointAppearance: selectionResolvers?.pointAppearance, resolvers: selectionResolvers });
  let graphicIndex = 0;
  const definitions = layer.mark.type === "point" ? series.flatMap(group => group.points.map(point => ({ ...point, semanticIdentity: ["point", point.key] })))
    : series.map(group => {
      const segments = overlaySegments(group, binding);
      const points = segments.flat();
      const members = [...new Set(points.flatMap(point => point.members))];
      const fields = uniqueFields(points.map(point => point.fields));
      return { fields, channels: channelMapFromRow(fields, layer), members,
        semanticIdentity: ["series", group.key],
        topologyKeys: segments.map(segment => segment.map(point => point.key)),
        graphicIndices: segments.map(() => graphicIndex++),
        graphicRoles: segments.map(segment => segments.length === 1 ? "body" : JSON.stringify(["segment", segment[0].key, segment.at(-1).key])) };
    });
  return finalizeItems(program, layer, layer.mark.type === "point" ? "point" : "series", definitions,
    layer.mark.type === "line" ? "path" : ["circle", "rect", "path"], { selectionResolvers });
}
