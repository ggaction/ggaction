import { requireFiniteResult, interpolateNumber } from "../../grammar/numeric.js";
import { graphArrowCommands } from "./geometry.js";

// Trim by distance along the sampled canonical route. The stored center anchors
// remain unchanged; only this concrete consumer accounts for node radii.
export function trimGraphRoute(points, sourceRadius, targetRadius) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(requireFiniteResult(distances.at(-1) +
    Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y), "Graph route length"));
  const total = distances.at(-1), start = Math.min(sourceRadius, total / 2), end = total - Math.min(targetRadius, total / 2);
  const at = distance => {
    let index = 1;
    while (index < distances.length - 1 && distances[index] <= distance) index++;
    const span = distances[index] - distances[index - 1], t = span === 0 ? 0 : (distance - distances[index - 1]) / span;
    return { x: interpolateNumber(points[index - 1].x, points[index].x, t), y: interpolateNumber(points[index - 1].y, points[index].y, t) };
  };
  return [at(start), ...points.filter((_, index) => distances[index] > start && distances[index] < end), at(end)];
}

export function storedGraphRouteGeometry(model, routeResource, origin, radii, style) {
  return model.edges.map((edge, index) => {
    const points = routeResource.result.routes[index].commands.map(({ x, y }) => ({
      x: requireFiniteResult(x + origin[0], "Graph route x"), y: requireFiniteResult(y + origin[1], "Graph route y") }));
    const trimmed = trimGraphRoute(points, radii.get(edge.sourceKey), radii.get(edge.targetKey));
    const commands = trimmed.map((point, index) => ({ op: index === 0 ? "M" : "L", ...point }));
    const end = trimmed.at(-1);
    let previous = trimmed.length - 2;
    while (previous >= 0 && trimmed[previous].x === end.x && trimmed[previous].y === end.y) previous--;
    return { edge, commands, ...(style.arrows && style.arrowSize > 0 && previous >= 0
      ? { arrowCommands: graphArrowCommands(end, trimmed[previous], style.arrowSize) } : {}) };
  });
}
