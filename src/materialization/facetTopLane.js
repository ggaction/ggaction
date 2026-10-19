import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { resolveConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { assertFacetTopLaneBounds } from "../layout/facetTopLane.js";

export function assertFacetTopLane(program, { layout, plots, headerId, titleIds }) {
  if (program.compositionSpec.topLane === undefined) return;
  const titles = [], headers = [], retained = [];
  const graphic = program.graphicSpec, profile = program.materializationConfigs.textMetrics;
  const collect = entry => {
    const type = entry.object.type ?? entry.owner?.type;
    const properties = entry.object.properties;
    if (type !== "text" || properties === undefined || properties.text === "" || properties.opacity === 0) return;
    const bounds = resolveConcreteGraphicBounds(graphic, entry.id, profile);
    if (bounds === undefined) return;
    const owner = entry.ownerId ?? entry.id;
    if (titleIds.includes(owner)) titles.push(bounds);
    else if (owner === headerId) headers.push(bounds);
    else retained.push(bounds);
  };
  walkGraphicTreeEvents(graphic, { enter: collect, item: collect });
  assertFacetTopLaneBounds({ canvas: graphic.objects.canvas.properties, titles, headers, retained,
    plots: layout.children.map((cell, index) => ({ left: cell.x + plots[index].x,
      right: cell.x + plots[index].x + plots[index].width, top: cell.y + plots[index].y,
      bottom: cell.y + plots[index].y + plots[index].height })) });
}
