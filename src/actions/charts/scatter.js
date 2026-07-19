import { action } from "../../core/action.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeEncoding,
  normalizeFieldEncoding,
  normalizeGuides,
  positionArgs,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "color", "size", "shape",
  "point", "guides"
]);
const POINT_OPTIONS = Object.freeze([
  "shape", "fill", "opacity", "stroke", "strokeWidth"
]);

export const createScatterPlot = action(
  {
    op: "createScatterPlot",
    description: "Create a Cartesian scatter plot from existing chart data."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, "createScatterPlot");
    const id = resolveFacadeId(this, args.id, {
      defaultId: "scatterPlot",
      operation: "createScatterPlot"
    });
    const data = resolveFacadeData(this, args.data, "createScatterPlot");
    const point = normalizeAppearance(
      args.point,
      POINT_OPTIONS,
      "createScatterPlot point"
    );
    const x = normalizeFieldEncoding(args.x, "createScatterPlot x");
    const y = normalizeFieldEncoding(args.y, "createScatterPlot y");
    const color = normalizeEncoding(args.color, "createScatterPlot color");
    const size = normalizeEncoding(args.size, "createScatterPlot size");
    const shape = normalizeEncoding(args.shape, "createScatterPlot shape");
    const guides = normalizeGuides(args.guides, "createScatterPlot");

    let next = this
      .createPointMark({ id, data, ...point })
      .encodeX(positionArgs(x, { target: id, coordinate: args.coordinate }))
      .encodeY(positionArgs(y, { target: id, coordinate: args.coordinate }));
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (size !== undefined) next = next.encodeSize(targetArgs(size, id));
    if (shape !== undefined) next = next.encodeShape(targetArgs(shape, id));
    return applyFacadeGuides(next, guides);
  }
);
