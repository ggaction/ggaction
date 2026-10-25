// Place one collected legend using its existing authored anchor. Child slots,
// plot geometry and the outer Canvas all consume this same resolved layout.
export function layoutCompositionLegend(base, plot, legend, title = {}) {
  if (!legend) return { layout: base };
  const { bounds, placement } = legend;
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  const { position = 'right', align = 'center', offset = 8, at } = placement;
  const titleSpace = side => title.config?.position === side ? title.reservation + 8 : 0;
  let x, y, dx = 0, dy = 0, extraWidth = 0, extraHeight = 0;
  const horizontal = position === 'top' || position === 'bottom';
  const alignX = () => align === 'left' ? plot.x : align === 'right' ? plot.x + plot.width - width : plot.x + (plot.width - width) / 2;
  if (at) { x = at.x; y = at.y; }
  else if (horizontal) {
    x = alignX(); extraHeight = height + offset + 8;
    if (position === 'top') { y = titleSpace('top') + 8; dy = extraHeight; }
    else y = base.height - titleSpace('bottom') + offset;
  } else if (position === 'left' || position === 'right') {
    y = plot.y; extraWidth = width + offset + 8;
    if (position === 'left') { x = titleSpace('left') + 8; dx = extraWidth; }
    else x = base.width - titleSpace('right') + offset;
  } else {
    x = position.endsWith('left') ? plot.x + offset : plot.x + plot.width - width - offset;
    y = position.startsWith('top') ? plot.y + offset : plot.y + plot.height - height - offset;
  }
  // Oversized legends grow the enclosing composition, never scale its text or
  // clip the opposite title. Keep the plot-aligned anchor while shifting slots.
  const shiftX = Math.max(0, 8 + titleSpace('left') - x);
  const shiftY = Math.max(0, 8 + titleSpace('top') - y);
  x += shiftX; y += shiftY; dx += shiftX; dy += shiftY;
  const layout = { ...base,
    width: Math.max(base.width + extraWidth + shiftX, x + width + 8 + titleSpace('right')),
    height: Math.max(base.height + extraHeight + shiftY, y + height + 8 + titleSpace('bottom')),
    children: base.children.map(child => ({ ...child, x: child.x + dx, y: child.y + dy })) };
  return { layout, frame: { x, y, width, height } };
}
