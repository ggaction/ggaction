import { localLegendPlacement } from "../../grammar/legendGroups.js";
import { PLOT_LEGEND_POSITIONS } from "../../core/vocabulary.js";
import { resolveLegendGroupPlacement } from "../../layout/legendGroup.js";
import { textBoundsIntersect } from "../../core/textMetrics.js";

const shift = (bounds, x, y) => ({ left: bounds.left + x, right: bounds.right + x,
  top: bounds.top + y, bottom: bounds.bottom + y });

function nativeGroup(blocks) {
  const config = blocks[0].config;
  const positions = new Set(blocks.map(block => block.config.position));
  if (positions.size > 1) throw new Error("Parent legend inherited blocks require one common anchor.");
  const placement = { position: config.position ?? "right", align: config.align ?? "center",
    offset: Math.max(...blocks.map(block => block.config.offset ?? 0)) };
  return { placement, blockLayout: "wrap", inferredOffset: blocks.every(block => block.config.inferredOffset === true) };
}

export function resolveAuthoredFacetLegendLayout(program, { layout, plot, title, prepared, guides }) {
  const partitions = [];
  const targets = [...new Set(prepared.blocks.map(block => block.config.target))];
  for (const target of targets) {
    const owned = prepared.blocks.filter(block => block.config.target === target);
    const inherited = owned.filter(block => localLegendPlacement(block.config) === undefined);
    if (inherited.length) partitions.push({ blocks: inherited,
      group: prepared.source.guideConfigs.legendGroups?.[target] ?? nativeGroup(inherited) });
    for (const block of owned) {
      const placement = localLegendPlacement(block.config);
      if (placement !== undefined) partitions.push({ blocks: [block],
        group: { placement, blockLayout: "column", inferredOffset: placement.inferredOffset } });
    }
  }
  const placements = [];
  for (const { blocks, group } of partitions) {
    const position = group.placement.position;
    const inside = group.placement.at !== undefined || PLOT_LEGEND_POSITIONS.includes(position);
    let effective = group;
    if (!inside && group.inferredOffset === true) {
      const base = group.placement.offset;
      const distances = guides.map(bound => position === "right" ? bound.right - plot.x - plot.width
        : position === "left" ? plot.x - bound.left : position === "top" ? plot.y - bound.top
        : bound.bottom - plot.y - plot.height);
      effective = { ...group, placement: { ...group.placement, offset: Math.max(base, ...distances.map(value => value + base)) } };
    }
    const plans = resolveLegendGroupPlacement({ blocks: blocks.map(block => ({ id: block.kind, bounds: block.bounds })),
      group: effective, plot, canvas: layout, deferCanvasFit: true });
    for (const plan of plans) {
      const block = blocks.find(block => block.kind === plan.id);
      const bounds = shift(block.bounds, plan.dx, plan.dy);
      if (inside && (bounds.left < plot.x || bounds.right > plot.x + plot.width ||
          bounds.top < plot.y || bounds.bottom > plot.y + plot.height)) {
        throw new Error("Facet parent legend does not fit the final plot union.");
      }
      if (guides.some(bound => textBoundsIntersect(bounds, bound))) {
        throw new Error("Facet parent legend overlaps retained axes or headers.");
      }
      if (placements.some(other => textBoundsIntersect(bounds, other.bounds))) {
        throw new Error("Facet parent legend blocks overlap.");
      }
      placements.push({ kind: block.kind, dx: plan.dx, dy: plan.dy, bounds, inside });
    }
  }
  const dx = Math.max(0, ...placements.map(item => layout.padding.left - item.bounds.left));
  const dy = Math.max(0, ...placements.map(item => title.height + layout.padding.top - item.bounds.top));
  const moved = placements.map(item => ({ ...item, dx: item.dx + dx, dy: item.dy + dy,
    bounds: shift(item.bounds, dx, dy) }));
  return { plot: { ...plot, x: plot.x + dx, y: plot.y + dy },
    layout: { ...layout, children: layout.children.map(cell => ({ ...cell, x: cell.x + dx, y: cell.y + dy })),
      width: Math.ceil(Math.max(layout.width + dx, ...moved.map(item => item.bounds.right + layout.padding.right))),
      height: Math.ceil(Math.max(layout.height + dy, ...moved.map(item => item.bounds.bottom + layout.padding.bottom))),
      parentLegendPlacements: moved } };
}
