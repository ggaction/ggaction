import { action } from "../../core/action.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeEncoding,
  normalizeFieldEncoding,
  normalizeGuides,
  normalizeTargetOptions,
  positionArgs,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "color", "width", "bar", "guides"
]);
const BAR_OPTIONS = Object.freeze([
  "fill", "opacity", "stroke", "strokeWidth"
]);

export const createBarPlot = action(
  {
    op: "createBarPlot",
    description: "Create a Cartesian bar plot from existing chart data."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, "createBarPlot");
    const id = resolveFacadeId(this, args.id, {
      defaultId: "barPlot",
      operation: "createBarPlot"
    });
    const data = resolveFacadeData(this, args.data, "createBarPlot");
    const bar = normalizeAppearance(args.bar, BAR_OPTIONS, "createBarPlot bar");
    const x = normalizeFieldEncoding(args.x, "createBarPlot x");
    const y = normalizeFieldEncoding(args.y, "createBarPlot y");
    const color = normalizeEncoding(args.color, "createBarPlot color");
    const width = normalizeTargetOptions(args.width, "createBarPlot width");
    const guides = normalizeGuides(args.guides, "createBarPlot");

    let next = this
      .createBarMark({ id, data, ...bar })
      .encodeX(positionArgs(x, { target: id, coordinate: args.coordinate }))
      .encodeY(positionArgs(y, { target: id, coordinate: args.coordinate }));
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (width !== undefined) next = next.encodeBarWidth(targetArgs(width, id));
    return applyFacadeGuides(next, guides);
  }
);
