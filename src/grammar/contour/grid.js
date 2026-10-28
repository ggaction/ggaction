import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

export function normalizeContourFrame(input) {
  ownRecord(input, "Contour grid");
  rejectUnknownProperties(input, ["origin", "dx", "dy", "width", "height"], "contour grid frame");
  ownArray(input.origin, "Contour grid origin");
  if (input.origin.length !== 2 || input.origin.some(value => !Number.isFinite(value))) {
    throw new TypeError("Contour origin requires two finite coordinates.");
  }
  for (const name of ["width", "height"]) {
    if (!Number.isSafeInteger(input[name]) || input[name] < 2) throw new RangeError(`Contour ${name} must be an integer of at least two.`);
  }
  for (const name of ["dx", "dy"]) {
    if (!Number.isFinite(input[name]) || input[name] <= 0) throw new RangeError(`Contour ${name} must be positive and finite.`);
  }
  validateGeneratedItemLimit(input.width * input.height, "Contour grid point count");
  for (const [axis, count, step] of [[0, input.width, input.dx], [1, input.height, input.dy]]) {
    let previous = input.origin[axis];
    for (let index = 1; index < count; index += 1) {
      const coordinate = input.origin[axis] + index * step;
      if (!Number.isFinite(coordinate) || coordinate <= previous) throw new RangeError("Contour grid coordinates must be finite and distinguishable.");
      previous = coordinate;
    }
  }
  return cloneAndFreeze(input);
}

export function normalizeContourGrid(input) {
  ownRecord(input, "Contour grid");
  rejectUnknownProperties(input, ["origin", "dx", "dy", "width", "height", "values"], "contour grid");
  const { values, ...frame } = input;
  const normalized = normalizeContourFrame(frame);
  ownArray(values, "Contour grid values");
  if (values.length !== normalized.width * normalized.height || values.some(value => value !== null && !Number.isFinite(value))) {
    throw new TypeError("Contour values require one finite scalar or null per grid point.");
  }
  return cloneAndFreeze({ ...normalized, values });
}

export function normalizeContourThresholds(input, grid) {
  ownArray(input, "Contour thresholds");
  validateGeneratedItemLimit(input.length, "Contour threshold count");
  if (!input.length || input.some((value, index) => !Number.isFinite(value) || index > 0 && value <= input[index - 1])) {
    throw new RangeError("Contour thresholds must be nonempty, finite and strictly increasing.");
  }
  validateWorkLimit((grid.width - 1) * (grid.height - 1) * input.length * 32, "Contour marching work");
  return cloneAndFreeze(input);
}

export function contourCells(grid) {
  const cells = [];
  for (let y = 0; y < grid.height - 1; y += 1) {
    for (let x = 0; x < grid.width - 1; x += 1) {
      const indexes = [y * grid.width + x, y * grid.width + x + 1,
        (y + 1) * grid.width + x + 1, (y + 1) * grid.width + x];
      if (indexes.some(index => grid.values[index] === null)) continue;
      cells.push(indexes.map(index => ({ id: `v${index}`, x: index % grid.width,
        y: Math.floor(index / grid.width), value: grid.values[index] })));
    }
  }
  return cells;
}
