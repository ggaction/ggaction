export const SIDE_LEGEND_BLOCK_GAP = 24;
export const HORIZONTAL_LEGEND_BLOCK_GAP = 40;
export const SIDE_LEGEND_SYMBOL_CENTER = 16;
export const SIDE_LEGEND_LABEL_START = 44;
export const HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP = 12;

export function isHorizontalEdgeLegend(config) {
  return config !== undefined &&
    ["top", "bottom"].includes(config.position) &&
    config.layout !== "legacy-bottom";
}

export function resolveSingleHorizontalLegendPlacement({ plot, canvas, config, bounds }) {
  if (!isHorizontalEdgeLegend(config)) {
    throw new Error("Single legend placement requires a horizontal edge layout.");
  }
  const dx = config.align === "left" ? plot.x - bounds.left
    : config.align === "right" ? plot.x + plot.width - bounds.right
      : plot.x + plot.width / 2 - midpoint(bounds.left, bounds.right);
  const dy = config.position === "top" ? plot.y - config.offset - bounds.bottom
    : plot.y + plot.height + config.offset - bounds.top;
  const occupied = translateBounds(bounds, dx, dy);
  if (occupied.left < 0 || occupied.right > canvas.width || occupied.top < 0 || occupied.bottom > canvas.height) {
    throw new Error(`Legend layout requires more ${config.position}-margin or Canvas space.`);
  }
  return { dx, dy, occupied };
}

function midpoint(start, end) {
  const sum = start + end;
  const result = Number.isFinite(sum) ? sum / 2 : start / 2 + end / 2;
  return result === 0 ? 0 : result;
}

function unionBounds(bounds) {
  return bounds.reduce((union, item) => ({
    left: Math.min(union.left, item.left),
    right: Math.max(union.right, item.right),
    top: Math.min(union.top, item.top),
    bottom: Math.max(union.bottom, item.bottom)
  }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
}

function decoration(border) {
  return border === false
    ? 0
    : border.padding + border.lineWidth / 2;
}

function horizontalExtent(blocks, labelStart) {
  let left = 0;
  let right = 0;
  for (const block of blocks) {
    const inset = block.inset ?? 0;
    if (block.title !== undefined) right = Math.max(right, block.title.width + inset);
    left = Math.min(left,
      SIDE_LEGEND_SYMBOL_CENTER + block.symbol.left - block.symbol.centerX - inset
    );
    right = Math.max(
      right,
      SIDE_LEGEND_SYMBOL_CENTER + block.symbol.right - block.symbol.centerX + inset,
      labelStart + block.labels.width + inset
    );
  }
  return { left, right };
}

function placeBlock(block, cursor, labelStart) {
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
    labelDx: labelStart - block.labels.x,
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
  const labelStart = Math.max(SIDE_LEGEND_LABEL_START, ...blocks.map(
    block => SIDE_LEGEND_SYMBOL_CENTER + Math.abs(block.labels.x - block.symbol.centerX)
  ));
  const laneExtent = horizontalExtent(blocks, labelStart);
  const offset = blocks.reduce(
    (maximum, block) => Math.max(maximum, block.offset),
    -Infinity
  );
  const titleStartX = side === "right"
    ? plot.x + plot.width + offset
    : plot.x - offset - laneExtent.right;
  const symbolCenterX = titleStartX + SIDE_LEGEND_SYMBOL_CENTER;
  const labelStartX = titleStartX + labelStart;
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
      const placement = placeBlock(block, cursor, labelStart);
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
    const groupExtent = horizontalExtent(group.blocks, labelStart);
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

function translateBounds(bounds, dx, dy) {
  return {
    left: bounds.left + dx,
    right: bounds.right + dx,
    top: bounds.top + dy,
    bottom: bounds.bottom + dy
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
    let placed = translateBounds(interval, dx, 0);
    if (row.length > 0 && placed.right > plot.x + plot.width) {
      rows.push(row);
      row = [];
      cursor = plot.x;
      dx = cursor - interval.left;
      placed = translateBounds(interval, dx, 0);
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
    : stacked.reduce((maximum, entry) => Math.max(
        maximum,
        entry.group.title.bounds.bottom - entry.group.title.y
      ), -Infinity);
  const elementAnchor = commonTitleY === undefined
    ? midpoint(
        entries[0].group.element.top,
        entries[0].group.element.bottom
      )
    : commonTitleY + titleDescent + HORIZONTAL_LEGEND_TITLE_ELEMENT_GAP;
  return entries.map(({ group, dx }) => {
    if (group.atomic) {
      const contentDy = elementAnchor - group.element.top;
      const foreground = translateBounds(group.content, dx, contentDy);
      return { id: group.id, dx, titleDy: contentDy, contentDy, foreground,
        occupied: expandBounds(foreground, group.inset), padding: group.padding,
        backgroundId: group.backgroundId };
    }
    const contentDy = commonTitleY === undefined
      ? elementAnchor - midpoint(
          group.element.top,
          group.element.bottom
        )
      : elementAnchor - group.element.top;
    const titleDy = group.title === undefined
      ? 0
      : group.inline === true
        ? contentDy
        : commonTitleY - group.title.y;
    const foreground = unionBounds([
      ...(group.title === undefined
        ? []
        : [translateBounds(group.title.bounds, dx, titleDy)]),
      translateBounds(group.content, dx, contentDy)
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
    foreground: translateBounds(placement.foreground, 0, dy),
    occupied: translateBounds(placement.occupied, 0, dy)
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
        ? packed[index].reduce((maximum, item) => Math.max(
            maximum,
            item.group.horizontal.bottom
          ), -Infinity)
        : packed[index].reduce((minimum, item) => Math.min(
            minimum,
            item.group.horizontal.top
          ), Infinity);
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

// Compose independently measured content blocks before the outer edge lane
// treats the whole group as one indivisible item.
export function resolveHorizontalLegendGroup({ edge, plot, canvas, groups,
  align, offset, border, backgroundId, collisionBounds = [] }) {
  const inset = decoration(border);
  const innerPlot = { ...plot, x: plot.x + inset, width: plot.width - inset * 2 };
  const packed = packHorizontalRows(groups, innerPlot);
  const rows = packed.map(normalizeHorizontalRow);
  let cursor = 0;
  const placements = [];
  for (const row of rows) {
    const bounds = unionBounds(row.map(item => item.occupied));
    const dy = edge === "top" ? cursor - bounds.bottom : cursor - bounds.top;
    const translated = row.map(item => translateHorizontalPlacement(item, dy));
    placements.push(...translated);
    const occupied = unionBounds(translated.map(item => item.occupied));
    cursor = edge === "top" ? occupied.top - HORIZONTAL_LEGEND_BLOCK_GAP
      : occupied.bottom + HORIZONTAL_LEGEND_BLOCK_GAP;
  }
  const foreground = unionBounds(placements.map(item => item.occupied));
  const occupied = expandBounds(foreground, inset);
  const width = occupied.right - occupied.left;
  const x = align === "left" ? plot.x : align === "right" ? plot.x + plot.width - width
    : plot.x + (plot.width - width) / 2;
  const dx = x - occupied.left;
  const dy = edge === "top" ? plot.y - offset - occupied.bottom
    : plot.y + plot.height + offset - occupied.top;
  const finalBounds = translateBounds(occupied, dx, dy);
  if (finalBounds.left < 0 || finalBounds.right > canvas.width ||
    finalBounds.top < 0 || finalBounds.bottom > canvas.height) {
    throw new Error(`Combined legend requires more ${edge}-margin or Canvas space.`);
  }
  if (collisionBounds.some(bounds => overlap(finalBounds, bounds))) {
    throw new Error(`Combined ${edge} legend and ${edge === "top" ? "chart titles" : "x-axis guides"} require more margin space.`);
  }
  return {
    placements: placements.map(item => ({ ...item, dx: item.dx + dx,
      titleDy: item.titleDy + dy, contentDy: item.contentDy + dy,
      ...(item.backgroundId === undefined ? {} : { background: {
        id: item.backgroundId,
        x: item.foreground.left + dx - item.padding,
        y: item.foreground.top + dy - item.padding,
        width: item.foreground.right - item.foreground.left + item.padding * 2,
        height: item.foreground.bottom - item.foreground.top + item.padding * 2
      } }) })),
    occupied: finalBounds,
    background: backgroundId === undefined ? undefined : {
      id: backgroundId,
      x: foreground.left + dx - border.padding,
      y: foreground.top + dy - border.padding,
      width: foreground.right - foreground.left + border.padding * 2,
      height: foreground.bottom - foreground.top + border.padding * 2
    }
  };
}
