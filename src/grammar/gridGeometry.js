export function resolveGridLineGeometry({ direction, values, positions, bounds }) {
  return direction === "horizontal"
    ? {
        values,
        x1: bounds.x,
        y1: positions,
        x2: bounds.x + bounds.width,
        y2: positions
      }
    : {
        values,
        x1: positions,
        y1: bounds.y,
        x2: positions,
        y2: bounds.y + bounds.height
      };
}
