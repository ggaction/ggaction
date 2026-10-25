import { canvasOverflowError } from "./canvas.js";
import { PLOT_LEGEND_POSITIONS } from "./legend.js";
import { SIDE_LEGEND_BLOCK_GAP, HORIZONTAL_LEGEND_BLOCK_GAP } from "./legendLane.js";

// Pack complete occupied rectangles. Item direction, title layout and sample
// geometry have already been resolved by each family and are not changed here.
export function resolveLegendGroupPlacement({ blocks, group, plot, canvas, allowOverflow = false, deferCanvasFit = false }) {
  if (blocks.length === 0) return [];
  const { placement, blockLayout } = group;
  const corner = PLOT_LEGEND_POSITIONS.includes(placement.position);
  const side = ["left", "right"].includes(placement.position);
  const column = blockLayout === "column" || blockLayout === "wrap" && side;
  const gap = corner || side || placement.at !== undefined ? SIDE_LEGEND_BLOCK_GAP : HORIZONTAL_LEGEND_BLOCK_GAP;
  const limit = plot.width - (corner ? placement.offset * 2 : 0);
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  const packed = blocks.map(block => {
    const width = block.bounds.right - block.bounds.left;
    const height = block.bounds.bottom - block.bounds.top;
    if (blockLayout === "wrap" && !column && !corner && width > limit && !allowOverflow) {
      throw new Error("Horizontal legend block requires more plot width.");
    }
    if (!column && blockLayout === "wrap" && x > 0 && x + width > limit) {
      x = 0; y += rowHeight + gap; rowHeight = 0;
    }
    const result = { id: block.id, x, y, width, height };
    if (column) y += height + gap;
    else { x += width + gap; rowHeight = Math.max(rowHeight, height); }
    return result;
  });
  const width = Math.max(...packed.map(block => block.x + block.width));
  const height = Math.max(...packed.map(block => block.y + block.height));
  if (blockLayout === "wrap" && placement.position === "top") {
    const rowHeights = new Map();
    for (const block of packed) rowHeights.set(block.y, Math.max(rowHeights.get(block.y) ?? 0, block.height));
    for (const block of packed) block.y = height - block.y - rowHeights.get(block.y);
  }
  let left;
  let top;
  if (placement.at !== undefined) {
    left = plot.x + placement.at.x; top = plot.y + placement.at.y;
  } else if (corner) {
    if (width + 2 * placement.offset > plot.width || height + 2 * placement.offset > plot.height) {
      throw new Error("In-plot legend group does not fit the plot inset.");
    }
    left = placement.position.endsWith("left") ? plot.x + placement.offset
      : plot.x + plot.width - placement.offset - width;
    top = placement.position.startsWith("top") ? plot.y + placement.offset
      : plot.y + plot.height - placement.offset - height;
  } else if (side) {
    left = placement.position === "right" ? plot.x + plot.width + placement.offset
      : plot.x - placement.offset - width;
    top = plot.y;
  } else {
    left = placement.align === "left" ? plot.x : placement.align === "right"
      ? plot.x + plot.width - width : plot.x + (plot.width - width) / 2;
    top = placement.position === "top" ? plot.y - placement.offset - height
      : plot.y + plot.height + placement.offset;
  }
  if (placement.at === undefined) {
    if (side) top += placement.alongOffset ?? 0;
    else left += placement.alongOffset ?? 0;
  }
  const occupied = { left, top, right: left + width, bottom: top + height };
  if (corner && (occupied.left < plot.x || occupied.top < plot.y || occupied.right > plot.x + plot.width || occupied.bottom > plot.y + plot.height)) {
    throw new Error("In-plot legend group does not fit the plot inset.");
  }
  if (!deferCanvasFit && (occupied.left < 0 || occupied.top < 0 || occupied.right > canvas.width || occupied.bottom > canvas.height)) {
    if (placement.at !== undefined || group.inferredOffset !== true) throw new Error("Legend group requires more Canvas space.");
    throw canvasOverflowError("Legend group requires more Canvas space.", [occupied], canvas);
  }
  return packed.map((block, index) => ({ id: block.id,
    dx: left + block.x - blocks[index].bounds.left,
    dy: top + block.y - blocks[index].bounds.top }));
}
