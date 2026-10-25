import { textBoundsIntersect } from "../core/textMetrics.js";
import { SIDE_LEGEND_BLOCK_GAP, HORIZONTAL_LEGEND_BLOCK_GAP } from "./legendLane.js";
import { resolveLegendGroupPlacement } from "./legendGroup.js";

export function compositionLegendEdgeClearance(plot, retained, position, occupied) {
  const side = position === 'left' || position === 'right';
  const relevant = occupied ? retained.filter(value => side
    ? value.top < occupied.bottom && value.bottom > occupied.top
    : value.left < occupied.right && value.right > occupied.left) : retained;
  return Math.max(0, ...relevant.map(value => position === 'right' ? value.right - plot.x - plot.width
    : position === 'left' ? plot.x - value.left : position === 'top' ? plot.y - value.top
    : value.bottom - plot.y - plot.height));
}

// Collected legends retain the native plot-relative anchor. Reuse available
// child margins; only occupied graphics can require an additional guide lane.
export function layoutCompositionLegend(base, plot, legend, title = {}, retained = []) {
  if (!legend) return { layout: base };
  const { bounds, placement } = legend;
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  const { position = 'right', align = 'center', offset = 8, alongOffset = 0, at } = placement;
  const inferred = placement.inferredOffset ?? legend.config.inferredOffset;
  const outside = !at && ['left', 'right', 'top', 'bottom'].includes(position);
  const group = { blockLayout: 'column', inferredOffset: inferred,
    placement: at ? { at } : { position, align, offset, alongOffset } };
  const place = group => {
    const [value] = resolveLegendGroupPlacement({ blocks: [{ id: 'shared', bounds }],
      group, plot, canvas: base, allowOverflow: true, deferCanvasFit: true });
    return { left: bounds.left + value.dx, right: bounds.right + value.dx,
      top: bounds.top + value.dy, bottom: bounds.bottom + value.dy };
  };
  let occupied = place(group);
  if (outside && inferred) {
    const clearance = compositionLegendEdgeClearance(plot, retained, position, occupied);
    occupied = place({ ...group, placement: { ...group.placement, offset: offset + clearance } });
  } else if (outside && retained.some(value => textBoundsIntersect(occupied, value))) {
    throw new Error('Shared composition legend overlaps retained chart content. Increase its offset.');
  }
  const titleSpace = side => title.config?.position === side ? title.reservation + 8 : 0;
  const dx = Math.max(0, 8 + titleSpace('left') - occupied.left);
  const dy = Math.max(0, 8 + titleSpace('top') - occupied.top);
  const x = occupied.left + dx, y = occupied.top + dy;
  const layout = { ...base,
    width: Math.max(base.width + dx, x + width + 8 + titleSpace('right')),
    height: Math.max(base.height + dy, y + height + 8 + titleSpace('bottom')),
    children: base.children.map(child => ({ ...child, x: child.x + dx, y: child.y + dy })) };
  return { layout, frame: { x, y, width, height } };
}

// Every displayed block uses the same parent frame. Compatible shared color
// explanations are deduplicated upstream; independent blocks remain distinct.
// Pack overlapping outside blocks along their edge, preserving authored gaps.
export function layoutCompositionLegends(base, plot, legends, title = {}, retained = []) {
  let layout = base, currentPlot = plot, occupiedContent = retained;
  const frames = new Map(), placed = [];
  for (const legend of legends) {
    let candidate = legend;
    let result = layoutCompositionLegend(layout, currentPlot, candidate, title, occupiedContent);
    const position = legend.placement.position ?? 'right';
    const outside = !legend.placement.at && ['left', 'right', 'top', 'bottom'].includes(position);
    if (outside) {
      const side = ['left', 'right'].includes(position);
      for (let attempt = 0; attempt < placed.length; attempt++) {
        const dx = result.layout.children[0].x - layout.children[0].x;
        const dy = result.layout.children[0].y - layout.children[0].y;
        const f = result.frame;
        const overlaps = placed.filter(previous => previous.position === position).map(previous => frames.get(previous.id))
          .filter(other => textBoundsIntersect({ left: f.x, right: f.x + f.width, top: f.y, bottom: f.y + f.height },
            { left: other.x + dx, right: other.x + dx + other.width, top: other.y + dy, bottom: other.y + dy + other.height }));
        if (!overlaps.length) break;
        const shift = side ? Math.max(...overlaps.map(other => other.y + dy + other.height)) + SIDE_LEGEND_BLOCK_GAP - f.y
          : Math.max(...overlaps.map(other => other.x + dx + other.width)) + HORIZONTAL_LEGEND_BLOCK_GAP - f.x;
        candidate = { ...candidate, placement: { ...candidate.placement,
          alongOffset: (candidate.placement.alongOffset ?? 0) + shift } };
        result = layoutCompositionLegend(layout, currentPlot, candidate, title, occupiedContent);
      }
    }
    const dx = result.layout.children[0].x - layout.children[0].x;
    const dy = result.layout.children[0].y - layout.children[0].y;
    if (dx || dy) {
      for (const [id, frame] of frames) frames.set(id, { ...frame, x: frame.x + dx, y: frame.y + dy });
      occupiedContent = occupiedContent.map(b => ({ left: b.left + dx, right: b.right + dx, top: b.top + dy, bottom: b.bottom + dy }));
      currentPlot = { ...currentPlot, x: currentPlot.x + dx, y: currentPlot.y + dy };
    }
    frames.set(legend.id, result.frame);
    placed.push({ id: legend.id, position });
    layout = result.layout;
  }
  return { layout, frames };
}
