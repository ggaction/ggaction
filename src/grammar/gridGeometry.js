import { mapOrdinalPositionValues } from "./scales/ordinal.js";

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

// Equal band edges share one native line. Keep every membership for semantic
// correspondence; the first selected band still owns the existing dash policy.
export function resolveBandGridBoundaries(values, scale) {
  const centers = mapOrdinalPositionValues(values, scale);
  const direction = scale.range[1] >= scale.range[0] ? 1 : -1;
  const boundaries = new Map();
  centers.forEach((center, index) => {
    for (const [edge, sign] of [["start", -1], ["end", 1]]) {
      const position = center + sign * direction * scale.bandwidth / 2;
      const member = { value: values[index], edge };
      const previous = boundaries.get(position);
      if (previous === undefined) boundaries.set(position, { position, owner: values[index], members: [member] });
      else previous.members.push(member);
    }
  });
  return [...boundaries.values()].sort((a, b) => direction * (a.position - b.position));
}
