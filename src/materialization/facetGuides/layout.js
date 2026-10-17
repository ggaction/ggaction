import { cartesianAxisOwners } from "../../selectors/axes.js";
import { PLOT_LEGEND_POSITIONS } from "../../layout/legend.js";
import { resolveConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { resolveFacetOuterSides } from "../../grammar/facets/guides.js";
import { resolveTextBounds, textBoundsIntersect } from "../../core/textMetrics.js";
import { axisGraphicIds } from "../guides/resources.js";
import { resolveFacetHeaderItems } from "../facetHeaders.js";

function translated(bounds, x, y) {
  return { left: bounds.left + x, right: bounds.right + x,
    top: bounds.top + y, bottom: bounds.bottom + y };
}

function retainedGuideBounds(program, layout, plots, headers) {
  const profile = program.materializationConfigs.textMetrics;
  const outer = resolveFacetOuterSides({ placements: layout.children });
  const bounds = [];
  for (const cell of layout.children) {
    const child = program.children[cell.id];
    for (const owner of cartesianAxisOwners(child)) {
      for (const [index, component] of [[2, "labels"], [3, "title"]]) {
        const position = owner.config?.[component]?.position;
        if (program.compositionSpec.facet.guides.axes === "outer" && !outer[position]?.includes(cell.id)) continue;
        const id = axisGraphicIds(owner.channel, owner.id)[index];
        if (child.graphicSpec.objects[id] === undefined) continue;
        const value = resolveConcreteGraphicBounds(child.graphicSpec, id, profile);
        if (value !== undefined) bounds.push(translated(value, cell.x, cell.y));
      }
    }
  }
  const { items } = resolveFacetHeaderItems(layout, plots, headers);
  for (const item of items) {
    if (item.properties.text !== "") bounds.push(resolveTextBounds(item.properties, profile));
  }
  return bounds;
}

function placedBounds(bounds, plot, position, align, offset) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const left = position === "right" ? plot.x + plot.width + offset
    : position === "left" ? plot.x - offset - width
    : align === "left" ? plot.x : align === "right"
      ? plot.x + plot.width - width : plot.x + (plot.width - width) / 2;
  const top = ["left", "right"].includes(position) ? plot.y
    : position === "top" ? plot.y - offset - height
    : plot.y + plot.height + offset;
  return { left, right: left + width, top, bottom: top + height };
}

// The parent Canvas is inferred. Retain the explicit child snapshots, then fit
// the concrete promoted guide instead of adding a second child-margin lane.
export function resolvePromotedFacetLegendLayout(program, {
  layout, plot, plots, title, preparedHeaders, prepared
}) {
  if (prepared?.mode !== "promoted") return { layout, plot };
  const group = prepared.occupiedGroup;
  if (group?.placement.at !== undefined ||
      PLOT_LEGEND_POSITIONS.includes(group?.placement.position)) return { layout, plot };
  const position = prepared.reservation.position;
  const align = prepared.reservation.align;
  const configs = prepared.kinds.map(kind => prepared.source.guideConfigs.legend[kind]);
  const offset = prepared.reservation.gap;
  const inferred = group === undefined
    ? configs.every(config => config.inferredOffset === true)
    : group.inferredOffset === true;
  let occupied = placedBounds(prepared.bounds, plot, position, align, offset);
  const guides = retainedGuideBounds(program, layout, plots, preparedHeaders);
  // Omitted offsets clear the actual retained guide lane. Explicit offsets
  // retain their authored position and fail atomically on a real collision.
  const laneDistances = guides.map(guide => position === "right" ? guide.right - (plot.x + plot.width)
    : position === "left" ? plot.x - guide.left
    : position === "top" ? plot.y - guide.top
    : guide.bottom - (plot.y + plot.height));
  if (inferred) {
    occupied = placedBounds(prepared.bounds, plot, position, align,
      Math.max(offset, ...laneDistances.map(distance => distance + offset)));
  } else if (guides.some(guide => textBoundsIntersect(occupied, guide))) {
    throw new Error("Facet shared legend overlaps retained axes or headers.");
  }
  const dx = Math.max(0, layout.padding.left - occupied.left);
  const dy = Math.max(0, title.height + layout.padding.top - occupied.top);
  const children = layout.children.map(cell => ({ ...cell, x: cell.x + dx, y: cell.y + dy }));
  const nextPlot = { ...plot, x: plot.x + dx, y: plot.y + dy };
  occupied = translated(occupied, dx, dy);
  return {
    plot: nextPlot,
    layout: { ...layout, children,
      width: Math.ceil(Math.max(layout.width + dx, occupied.right + layout.padding.right)),
      height: Math.ceil(Math.max(layout.height + dy, occupied.bottom + layout.padding.bottom)),
      legend: { position, x: occupied.left, y: occupied.top,
        width: occupied.right - occupied.left, height: occupied.bottom - occupied.top,
        translation: { x: occupied.left - prepared.bounds.left, y: occupied.top - prepared.bounds.top } }
    }
  };
}
