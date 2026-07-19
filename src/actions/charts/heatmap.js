import { action } from "../../core/action.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeFieldEncoding,
  normalizeGuides,
  positionArgs,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "color", "rect", "guides"
]);
const RECT_OPTIONS = Object.freeze([
  "opacity", "stroke", "strokeWidth"
]);

export const createHeatmap = action(
  {
    op: "createHeatmap",
    description: "Create a pre-gridded Cartesian rect heatmap."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, "createHeatmap");
    const id = resolveFacadeId(this, args.id, {
      defaultId: "heatmap",
      operation: "createHeatmap"
    });
    const data = resolveFacadeData(this, args.data, "createHeatmap");
    const rect = normalizeAppearance(args.rect, RECT_OPTIONS, "createHeatmap rect");
    const x = normalizeFieldEncoding(args.x, "createHeatmap x");
    const y = normalizeFieldEncoding(args.y, "createHeatmap y");
    const color = normalizeFieldEncoding(args.color, "createHeatmap color");
    const guides = normalizeGuides(args.guides, "createHeatmap");

    const next = this
      .createRectMark({ id, data, ...rect })
      .encodeX(positionArgs(x, { target: id, coordinate: args.coordinate }))
      .encodeY(positionArgs(y, { target: id, coordinate: args.coordinate }))
      .encodeColor(targetArgs(color, id));
    return applyFacadeGuides(next, guides);
  }
);
