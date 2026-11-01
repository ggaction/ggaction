// Native outside legend clearance is measured from occupied same-edge axis ink,
// including strokes, multiline labels and titles. The caller owns validation
// and explicit/inferred placement policy; this calculation never moves ink.
export function resolveAxisLaneClearance(position, plot, blocks) {
  return Math.max(0, ...blocks.filter(block => block.position === position).map(block => ({
    bottom: block.bounds.bottom - plot.y - plot.height,
    top: plot.y - block.bounds.top,
    left: plot.x - block.bounds.left,
    right: block.bounds.right - plot.x - plot.width
  })[position]));
}
