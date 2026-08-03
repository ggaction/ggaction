export const SIDE_LEGEND_BLOCK_GAP = 24;
export const SIDE_LEGEND_SYMBOL_CENTER = 16;
export const SIDE_LEGEND_LABEL_START = 44;

function unionBounds(bounds) {
  return {
    left: Math.min(...bounds.map(item => item.left)),
    right: Math.max(...bounds.map(item => item.right)),
    top: Math.min(...bounds.map(item => item.top)),
    bottom: Math.max(...bounds.map(item => item.bottom))
  };
}

function decoration(border) {
  return border === false
    ? 0
    : border.padding + border.lineWidth / 2;
}

function horizontalExtent(blocks) {
  const left = [0];
  const right = [0];
  for (const block of blocks) {
    if (block.title !== undefined) right.push(block.title.width);
    left.push(
      SIDE_LEGEND_SYMBOL_CENTER + block.symbol.left - block.symbol.centerX
    );
    right.push(
      SIDE_LEGEND_SYMBOL_CENTER + block.symbol.right - block.symbol.centerX
    );
    right.push(SIDE_LEGEND_LABEL_START + block.labels.width);
  }
  return { left: Math.min(...left), right: Math.max(...right) };
}

function placeBlock(block, cursor) {
  let dy;
  if (block.title === undefined) {
    dy = cursor - block.bounds.top;
  } else {
    const desiredTitleY = Math.ceil(cursor + block.title.fontSize / 2);
    dy = desiredTitleY - block.title.y;
    const futureTop = block.bounds.top + dy;
    if (futureTop < cursor) dy += cursor - futureTop;
  }
  const bounds = {
    left: block.bounds.left,
    right: block.bounds.right,
    top: block.bounds.top + dy,
    bottom: block.bounds.bottom + dy
  };
  return {
    id: block.id,
    dy,
    titleDx: block.title === undefined
      ? undefined
      : -block.title.x,
    symbolDx: SIDE_LEGEND_SYMBOL_CENTER - block.symbol.centerX,
    labelDx: SIDE_LEGEND_LABEL_START - block.labels.x,
    bounds
  };
}

function overlap(a, b) {
  return a.left < b.right && a.right > b.left &&
    a.top < b.bottom && a.bottom > b.top;
}

export function resolveSideLegendLane({
  side,
  plot,
  canvas,
  groups,
  axisBounds
}) {
  if (!["right", "left"].includes(side)) {
    throw new Error(`Unsupported side legend lane "${side}".`);
  }
  const blocks = groups.flatMap(group => group.blocks);
  if (blocks.length < 2) return undefined;
  const laneExtent = horizontalExtent(blocks);
  const offset = Math.max(...blocks.map(block => block.offset));
  const titleStartX = side === "right"
    ? plot.x + plot.width + offset
    : plot.x - offset - laneExtent.right;
  const symbolCenterX = titleStartX + SIDE_LEGEND_SYMBOL_CENTER;
  const labelStartX = titleStartX + SIDE_LEGEND_LABEL_START;
  const first = blocks[0];
  let cursor = first.title === undefined
    ? plot.y + 12
    : plot.y + 20 - first.title.fontSize / 2;
  const placements = [];
  const backgrounds = [];
  const occupiedGroups = [];

  for (const group of groups) {
    const inset = decoration(group.border);
    if (occupiedGroups.length > 0) cursor += inset;
    const groupPlacements = [];
    for (const block of group.blocks) {
      const placement = placeBlock(block, cursor);
      groupPlacements.push(placement);
      placements.push({
        ...placement,
        titleDx: placement.titleDx === undefined
          ? undefined
          : placement.titleDx + titleStartX,
        symbolDx: placement.symbolDx + titleStartX,
        labelDx: placement.labelDx + titleStartX
      });
      cursor = placement.bounds.bottom + SIDE_LEGEND_BLOCK_GAP;
    }
    const vertical = unionBounds(groupPlacements.map(item => item.bounds));
    const groupExtent = horizontalExtent(group.blocks);
    const foreground = {
      left: titleStartX + groupExtent.left,
      right: titleStartX + groupExtent.right,
      top: vertical.top,
      bottom: vertical.bottom
    };
    const occupied = {
      left: foreground.left - inset,
      right: foreground.right + inset,
      top: foreground.top - inset,
      bottom: foreground.bottom + inset
    };
    occupiedGroups.push(occupied);
    if (group.backgroundId !== undefined) {
      backgrounds.push({
        id: group.backgroundId,
        x: foreground.left - group.border.padding,
        y: foreground.top - group.border.padding,
        width: foreground.right - foreground.left + group.border.padding * 2,
        height: foreground.bottom - foreground.top + group.border.padding * 2
      });
    }
    cursor = occupied.bottom + SIDE_LEGEND_BLOCK_GAP;
  }

  const occupied = unionBounds(occupiedGroups);
  if (
    occupied.left < 0 || occupied.right > canvas.width ||
    occupied.top < 0 || occupied.bottom > canvas.height
  ) {
    throw new Error(`Legend lane requires more ${side}-margin or vertical Canvas space.`);
  }
  if (axisBounds !== undefined && overlap(occupied, axisBounds)) {
    throw new Error(`${side[0].toUpperCase()}${side.slice(1)} legend lane and y-axis guides require more margin space.`);
  }
  return {
    side,
    titleStartX,
    symbolCenterX,
    labelStartX,
    placements,
    backgrounds,
    occupied
  };
}
