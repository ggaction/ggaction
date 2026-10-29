import { requireStoredResource } from "../../selectors/resources.js";

export function contourScaleValues(program, consumer) {
  const resource = requireStoredResource(program, consumer.layer.contourBinding.geometry);
  if (resource.options.method !== "contour") throw new TypeError("Contour scale consumers require contour geometry.");
  const grid = resource.result.contours.grid, channel = consumer.channel;
  if (channel === "color") return resource.options.thresholds;
  if (!["x", "y"].includes(channel)) throw new TypeError("Contour scales require x, y, or color.");
  const axis = channel === "x" ? 0 : 1, count = axis === 0 ? grid.width : grid.height, step = axis === 0 ? grid.dx : grid.dy;
  return [grid.origin[axis], grid.origin[axis] + (count - 1) * step];
}
