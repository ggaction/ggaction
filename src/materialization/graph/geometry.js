import { requireFiniteResult } from "../../grammar/numeric.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";

const finite = value => requireFiniteResult(value, "Graph plot geometry");
function direction(x, y) {
  const length = finite(Math.hypot(x, y));
  return length === 0 ? { x: 1, y: 0, length } : { x: x / length, y: y / length, length };
}
function checked(commands) {
  for (const command of commands) for (const key of Object.keys(command)) if (key !== "op") finite(command[key]);
  return commands;
}
export function graphArrowCommands(tip, control, size) {
  const tangent = direction(tip.x - control.x, tip.y - control.y);
  const base = { x: tip.x - tangent.x * size, y: tip.y - tangent.y * size };
  return checked([{ op: "M", x: tip.x, y: tip.y },
    { op: "L", x: base.x - tangent.y * size / 2, y: base.y + tangent.x * size / 2 },
    { op: "L", x: base.x + tangent.y * size / 2, y: base.y - tangent.x * size / 2 }, { op: "Z" }]);
}

// The caller supplies already validated graph/layout state and final node radii.
// This owner only realizes edge geometry; it never changes topology or solves a layout.
export function graphEdgeGeometry(model, positions, radii, style) {
  validateGeneratedItemLimit(model.edges.length * 2, "Graph edge graphic count");
  const groups = new Map();
  for (const edge of model.edges) {
    const key = JSON.stringify([edge.sourceKey, edge.targetKey].sort());
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(edge.key);
  }
  const ordinals = new Map();
  for (const group of groups.values()) group.forEach((key, index) => ordinals.set(key, { index, count: group.length }));
  return model.edges.map(edge => {
    const a = positions.get(edge.sourceKey), b = positions.get(edge.targetKey);
    const ra = radii.get(edge.sourceKey), rb = radii.get(edge.targetKey);
    const vector = direction(b.x - a.x, b.y - a.y), ordinal = ordinals.get(edge.key);
    let start, end, c1, c2;
    if (edge.sourceKey === edge.targetKey || vector.length === 0) {
      const radius = finite(style.loopRadius + ordinal.index * style.parallelGap);
      start = { x: a.x - ra, y: a.y }; end = { x: b.x + rb, y: b.y };
      c1 = { x: start.x - radius, y: start.y - 2 * radius };
      c2 = { x: end.x + radius, y: end.y - 2 * radius };
    } else {
      const sign = edge.sourceKey < edge.targetKey ? 1 : -1;
      const bend = (ordinal.index - (ordinal.count - 1) / 2) * style.parallelGap * sign;
      c1 = { x: a.x + (b.x - a.x) / 3 - vector.y * bend, y: a.y + (b.y - a.y) / 3 + vector.x * bend };
      c2 = { x: a.x + 2 * (b.x - a.x) / 3 - vector.y * bend, y: a.y + 2 * (b.y - a.y) / 3 + vector.x * bend };
      const from = direction(c1.x - a.x, c1.y - a.y), to = direction(b.x - c2.x, b.y - c2.y);
      const sourceInset = Math.min(ra, vector.length / 2), targetInset = Math.min(rb, vector.length / 2);
      start = { x: a.x + from.x * sourceInset, y: a.y + from.y * sourceInset };
      end = { x: b.x - to.x * targetInset, y: b.y - to.y * targetInset };
    }
    const commands = checked([{ op: "M", ...start }, { op: "C", x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, ...end }]);
    return { edge, commands, ...(style.arrows && style.arrowSize > 0 ? { arrowCommands: graphArrowCommands(end, c2, style.arrowSize) } : {}) };
  });
}
