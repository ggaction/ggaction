// Forward links use two parallel cubic boundaries. Feedback lanes use a closed
// orthogonal ribbon; miter corners preserve its declared cross-section width.
export function flowRibbonCommands(edge, orientation) {
  const vertical = orientation === "vertical", point = value => vertical ? { x: value.y, y: value.x } : value;
  const source = point(edge.source), target = point(edge.target), half = edge.thickness / 2;
  let commands;
  if (edge.route === "forward") {
    const middle = source.x + (target.x - source.x) / 2;
    commands = [{ op: "M", x: source.x, y: source.y - half },
      { op: "C", x1: middle, y1: source.y - half, x2: middle, y2: target.y - half, x: target.x, y: target.y - half },
      { op: "L", x: target.x, y: target.y + half },
      { op: "C", x1: middle, y1: target.y + half, x2: middle, y2: source.y + half, x: source.x, y: source.y + half }, { op: "Z" }];
  } else {
    const lane = edge.lane;
    const points = [source, { x: lane.sourceX, y: source.y }, { x: lane.sourceX, y: lane.center },
      { x: lane.targetX, y: lane.center }, { x: lane.targetX, y: target.y }, target]
      .filter((item, index, all) => index === 0 || item.x !== all[index - 1].x || item.y !== all[index - 1].y);
    const normals = points.slice(1).map((item, index) => {
      const dx = item.x - points[index].x, dy = item.y - points[index].y, length = Math.hypot(dx, dy);
      return { x: -dy / length, y: dx / length };
    });
    const boundary = sign => points.map((item, index) => {
      const before = normals[Math.max(0, index - 1)] ?? { x: 0, y: 0 }, after = normals[Math.min(index, normals.length - 1)] ?? before;
      const denominator = 1 + before.x * after.x + before.y * after.y;
      return { x: item.x + sign * half * (before.x + after.x) / denominator, y: item.y + sign * half * (before.y + after.y) / denominator };
    });
    commands = [...boundary(-1), ...boundary(1).reverse()].map((item, index) => ({ op: index === 0 ? "M" : "L", ...item }));
    commands.push({ op: "Z" });
  }
  if (!vertical) return commands;
  return commands.map(command => {
    if (command.op === "Z") return command;
    const result = { op: command.op, x: command.y, y: command.x };
    if (command.op === "C") Object.assign(result, { x1: command.y1, y1: command.x1, x2: command.y2, y2: command.x2 });
    return result;
  });
}
