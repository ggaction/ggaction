// Independent screen-coordinate oracle; no production geometry imports.
export function cartesianTitleAnchor({ plot, channel, side, at = 0.5,
  frameOffset = 0, offset = 0, alongOffset = 0 }) {
  const horizontal = channel === "x";
  const positive = side === "bottom" || side === "right";
  const start = horizontal ? plot.top : plot.left;
  const span = horizontal ? plot.height : plot.width;
  const perpendicular = start + (positive ? span : 0) +
    (positive ? 1 : -1) * (frameOffset + offset);
  const along = (horizontal ? plot.left + at * plot.width : plot.top + at * plot.height) + alongOffset;
  return horizontal ? { x: along, y: perpendicular } : { x: perpendicular, y: along };
}
