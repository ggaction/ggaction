export const SIDE_LEGEND_BLOCK_GAP = 24;
export const HORIZONTAL_LEGEND_BLOCK_GAP = 40;
export const SIDE_LEGEND_SYMBOL_CENTER = 16;
export const SIDE_LEGEND_LABEL_START = 44;
export const HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP = 12;

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

function translateBounds(bounds, dy) {
  return {
    left: bounds.left,
    right: bounds.right,
    top: bounds.top + dy,
    bottom: bounds.bottom + dy
  };
}

function translateBoundsX(bounds, dx) {
  return {
    left: bounds.left + dx,
    right: bounds.right + dx,
    top: bounds.top,
    bottom: bounds.bottom
  };
}

function expandBounds(bounds, inset) {
  return {
    left: bounds.left - inset,
    right: bounds.right + inset,
    top: bounds.top - inset,
    bottom: bounds.bottom + inset
  };
}

function packHorizontalRows(groups, plot) {
  const rows = [];
  let row = [];
  let cursor = plot.x;
  for (const group of groups) {
    const interval = expandBounds(group.horizontal, group.inset);
    const width = interval.right - interval.left;
    if (width > plot.width) {
      throw new Error("Horizontal legend block requires more plot width.");
    }
    let dx = cursor - interval.left;
    let placed = translateBoundsX(interval, dx);
    if (row.length > 0 && placed.right > plot.x + plot.width) {
      rows.push(row);
      row = [];
      cursor = plot.x;
      dx = cursor - interval.left;
      placed = translateBoundsX(interval, dx);
    }
    row.push({ group, interval: placed, dx });
    cursor = placed.right + HORIZONTAL_LEGEND_BLOCK_GAP;
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

function normalizeHorizontalRow(entries) {
  const stacked = entries.filter(entry =>
    entry.group.title !== undefined && entry.group.inline !== true
  );
  const commonTitleY = stacked[0]?.group.title.y;
  const titleDescent = stacked.length === 0
    ? 0
    : Math.max(...stacked.map(
        entry => entry.group.title.bounds.bottom - entry.group.title.y
      ));
  const elementAnchor = commonTitleY === undefined
    ? (entries[0].group.element.top + entries[0].group.element.bottom) / 2
    : commonTitleY + titleDescent + HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP;
  return entries.map(({ group, dx }) => {
    const contentDy = commonTitleY === undefined
      ? elementAnchor - (group.element.top + group.element.bottom) / 2
      : elementAnchor - group.element.top;
    const titleDy = group.title === undefined
      ? 0
      : group.inline === true
        ? contentDy
        : commonTitleY - group.title.y;
    const foreground = unionBounds([
      ...(group.title === undefined
        ? []
        : [translateBoundsX(translateBounds(group.title.bounds, titleDy), dx)]),
      translateBoundsX(translateBounds(group.content, contentDy), dx)
    ]);
    return {
      id: group.id,
      dx,
      titleDy,
      contentDy,
      foreground,
      occupied: expandBounds(foreground, group.inset),
      padding: group.padding,
      backgroundId: group.backgroundId
    };
  });
}

function translateHorizontalPlacement(placement, dy) {
  return {
    ...placement,
    titleDy: placement.titleDy + dy,
    contentDy: placement.contentDy + dy,
    foreground: translateBounds(placement.foreground, dy),
    occupied: translateBounds(placement.occupied, dy)
  };
}

export function resolveHorizontalLegendLane({
  edge,
  plot,
  canvas,
  groups,
  collisionBounds = []
}) {
  if (!["top", "bottom"].includes(edge)) {
    throw new Error(`Unsupported horizontal legend lane "${edge}".`);
  }
  if (groups.length < 2) return undefined;
  const packed = packHorizontalRows(groups, plot);
  const normalized = packed.map(normalizeHorizontalRow);
  const placements = [];
  let previousRowBounds;
  for (let index = 0; index < normalized.length; index += 1) {
    const row = normalized[index];
    const rowBounds = unionBounds(row.map(item => item.occupied));
    let dy;
    if (index === 0) {
      const anchor = edge === "top"
        ? Math.max(...packed[index].map(item => item.group.horizontal.bottom))
        : Math.min(...packed[index].map(item => item.group.horizontal.top));
      dy = edge === "top"
        ? anchor - rowBounds.bottom
        : anchor - rowBounds.top;
    } else {
      dy = edge === "bottom"
        ? previousRowBounds.bottom + HORIZONTAL_LEGEND_BLOCK_GAP - rowBounds.top
        : previousRowBounds.top - HORIZONTAL_LEGEND_BLOCK_GAP - rowBounds.bottom;
    }
    const translated = row.map(item => translateHorizontalPlacement(item, dy));
    placements.push(...translated);
    previousRowBounds = unionBounds(translated.map(item => item.occupied));
  }
  const occupied = unionBounds(placements.map(item => item.occupied));
  if (placements.some(placement =>
    placement.occupied.left < 0 || placement.occupied.right > canvas.width ||
    placement.occupied.top < 0 || placement.occupied.bottom > canvas.height
  )) {
    throw new Error(`Legend lane requires more ${edge}-margin or Canvas space.`);
  }
  if (placements.some(placement =>
    collisionBounds.some(bounds => overlap(placement.occupied, bounds))
  )) {
    const owner = edge === "top" ? "chart titles" : "x-axis guides";
    throw new Error(
      `${edge[0].toUpperCase()}${edge.slice(1)} legend lane and ${owner} require more margin space.`
    );
  }
  return {
    edge,
    placements: placements.map(placement => ({
      ...placement,
      ...(placement.backgroundId === undefined
        ? {}
        : {
            background: {
              id: placement.backgroundId,
              x: placement.foreground.left - placement.padding,
              y: placement.foreground.top - placement.padding,
              width: placement.foreground.right - placement.foreground.left +
                placement.padding * 2,
              height: placement.foreground.bottom - placement.foreground.top +
                placement.padding * 2
            }
          })
    })),
    occupied,
    rowCount: packed.length
  };
}
