function requirePoints(points, label) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      point !== null &&
      typeof point === "object" &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new TypeError(`${label} requires at least two finite points.`);
  }
  return points;
}

function freezeCommands(commands) {
  return Object.freeze(commands.map(command => Object.freeze(command)));
}

function tangents(points) {
  const intervals = points.slice(1).map((point, index) => {
    const previous = points[index];
    const width = point.x - previous.x;
    if (!(width > 0)) {
      throw new Error("Monotone area reference requires strictly increasing x values.");
    }
    return {
      width,
      slope: (point.y - previous.y) / width
    };
  });
  const resolved = [intervals[0].slope];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = intervals[index - 1];
    const next = intervals[index];
    if (
      previous.slope === 0 ||
      next.slope === 0 ||
      Math.sign(previous.slope) !== Math.sign(next.slope)
    ) {
      resolved.push(0);
      continue;
    }
    const previousWeight = 2 * next.width + previous.width;
    const nextWeight = next.width + 2 * previous.width;
    resolved.push(
      (previousWeight + nextWeight) /
      (previousWeight / previous.slope + nextWeight / next.slope)
    );
  }
  resolved.push(intervals.at(-1).slope);
  return resolved;
}

function openCommands(points) {
  requirePoints(points, "Monotone area boundary");
  const slopes = tangents(points);
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const third = (current.x - previous.x) / 3;
    commands.push({
      op: "C",
      x1: previous.x + third,
      y1: previous.y + slopes[index - 1] * third,
      x2: current.x - third,
      y2: current.y - slopes[index] * third,
      x: current.x,
      y: current.y
    });
  }
  return commands;
}

function reverseOpen(commands) {
  const reversed = [{
    op: "M",
    x: commands.at(-1).x,
    y: commands.at(-1).y
  }];
  for (let index = commands.length - 1; index >= 1; index -= 1) {
    const command = commands[index];
    const previous = commands[index - 1];
    reversed.push({
      op: "C",
      x1: command.x2,
      y1: command.y2,
      x2: command.x1,
      y2: command.y1,
      x: previous.x,
      y: previous.y
    });
  }
  return reversed;
}

export function createMonotoneAreaReferenceCommands(lower, upper) {
  requirePoints(lower, "Monotone area lower boundary");
  requirePoints(upper, "Monotone area upper boundary");
  if (lower.length !== upper.length) {
    throw new Error("Monotone area boundaries must have equal lengths.");
  }
  const lowerCommands = openCommands(lower);
  const reversedUpper = reverseOpen(openCommands(upper));
  return freezeCommands([
    ...lowerCommands,
    { op: "L", x: reversedUpper[0].x, y: reversedUpper[0].y },
    ...reversedUpper.slice(1),
    { op: "Z" }
  ]);
}
