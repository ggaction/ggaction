import { textBoundsIntersect } from "../core/textMetrics.js";
import { resolveLegendGroupPlacement } from "./legendGroup.js";

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
    const side = position === 'left' || position === 'right';
    const relevant = retained.filter(value => side
      ? value.top < occupied.bottom && value.bottom > occupied.top
      : value.left < occupied.right && value.right > occupied.left);
    const clearance = Math.max(0, ...relevant.map(value => position === 'right' ? value.right - plot.x - plot.width
      : position === 'left' ? plot.x - value.left : position === 'top' ? plot.y - value.top
      : value.bottom - plot.y - plot.height));
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
