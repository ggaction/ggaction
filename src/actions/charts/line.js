import { action } from "../../core/action.js";
import { validateNonEmptyString } from "../../core/validation.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeEncoding,
  normalizeFieldEncoding,
  normalizeGuides,
  normalizeStrokeDashEncoding,
  positionArgs,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "color", "groupBy",
  "strokeDash", "line", "guides"
]);
const LINE_OPTIONS = Object.freeze([
  "strokeWidth", "curve", "stroke", "opacity", "closed"
]);

export const createLinePlot = action(
  {
    op: "createLinePlot",
    description: "Create a Cartesian line plot from existing chart data."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, "createLinePlot");
    const id = resolveFacadeId(this, args.id, {
      defaultId: "linePlot",
      operation: "createLinePlot"
    });
    const data = resolveFacadeData(this, args.data, "createLinePlot");
    const line = normalizeAppearance(
      args.line,
      LINE_OPTIONS,
      "createLinePlot line"
    );
    if (line.closed === true) {
      throw new Error(
        "createLinePlot is Cartesian; closed lines require Polar line authoring."
      );
    }
    const x = normalizeFieldEncoding(args.x, "createLinePlot x");
    const y = normalizeFieldEncoding(args.y, "createLinePlot y");
    const color = normalizeEncoding(args.color, "createLinePlot color");
    const strokeDash = normalizeStrokeDashEncoding(args.strokeDash);
    const groupBy = args.groupBy === undefined
      ? undefined
      : validateNonEmptyString(args.groupBy, "createLinePlot groupBy");
    const guides = normalizeGuides(args.guides, "createLinePlot");

    let next = this
      .createLineMark({ id, data, ...line })
      .encodeX(positionArgs(x, { target: id, coordinate: args.coordinate }))
      .encodeY(positionArgs(y, { target: id, coordinate: args.coordinate }));
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (groupBy !== undefined) {
      next = next.encodeGroup({ field: groupBy, target: id });
    }
    if (strokeDash !== undefined) {
      next = next.encodeStrokeDash(targetArgs(strokeDash, id));
    }
    return applyFacadeGuides(next, guides);
  }
);
