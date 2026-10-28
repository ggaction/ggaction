// Literal cardinal fixtures anchor an independent complex-rotation recurrence.
export const fixedPoints = [[-10, 5], [0, -2], [3, 4], [11, 0]];
export const cardinalCircle = [[10, 15], [15, 20], [10, 25], [5, 20]];
export const triangleCircle = [[0, -2], [Math.sqrt(3), 1], [-Math.sqrt(3), 1]];

export function repeatedRotationCircle(count, center, radius, startAngle) {
  if (count === 0) return [];
  if (count === 1) return [[...center]];
  const first = startAngle * Math.PI / 180, step = 2 * Math.PI / count;
  let x = Math.sin(first), y = -Math.cos(first);
  const cosine = Math.cos(step), sine = Math.sin(step), points = [];
  for (let index = 0; index < count; index++) {
    points.push([center[0] + radius * x, center[1] + radius * y]);
    [x, y] = [x * cosine - y * sine, x * sine + y * cosine];
  }
  return points;
}
