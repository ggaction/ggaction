import { encodeStroke } from "../encodings/stroke.js";
import { action } from "../../core/action.js";
import { validateNonNegativeFinite } from "../../core/validation.js";
import { STROKE_STYLE_PROPERTIES } from "../../grammar/strokeStyle.js";
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
  "id", "data", "coordinate", "x", "y", "color", "stroke", "size", "shape",
  "point", "guides"
]);
const POINT_OPTIONS = Object.freeze([
  "shape", "fill", "opacity", "stroke", "strokeWidth", "radius",
  ...STROKE_STYLE_PROPERTIES
]);

export const createScatterPlot = /* @__PURE__ */ action(
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
    const { radius, ...point } = normalizeAppearance(
      args.point,
      POINT_OPTIONS,
      "createScatterPlot point"
    );
    const x = normalizeFieldEncoding(args.x, "createScatterPlot x");
    const y = normalizeFieldEncoding(args.y, "createScatterPlot y");
    const color = normalizeEncoding(args.color, "createScatterPlot color");
    const stroke = normalizeEncoding(args.stroke, "createScatterPlot stroke");
    if (stroke !== undefined) {
      if (typeof stroke.field !== "string" || stroke.field.length === 0 || Object.hasOwn(stroke, "value")) {
        throw new TypeError("createScatterPlot stroke requires a field; constant stroke belongs in point.");
      }
      if (Object.hasOwn(point, "stroke")) throw new Error("createScatterPlot stroke conflicts with point.stroke.");
    }
    const size = normalizeEncoding(args.size, "createScatterPlot size");
    const shape = normalizeEncoding(args.shape, "createScatterPlot shape");
    const guides = normalizeGuides(args.guides, "createScatterPlot");
    if (Object.hasOwn(args.point ?? {}, "radius")) {
      validateNonNegativeFinite(radius, "createScatterPlot point radius");
      if (size !== undefined) throw new Error("createScatterPlot point radius conflicts with size.");
    }

    const initialPoint = { ...point };
    if (stroke !== undefined) delete initialPoint.strokeWidth;
    let next = this
      .createPointMark({ id, data, ...initialPoint })
      .encodeX(positionArgs(x, { target: id, coordinate: args.coordinate }))
      .encodeY(positionArgs(y, { target: id, coordinate: args.coordinate }));
    if (radius !== undefined) next = next.encodePointRadius({ target: id, value: radius });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (stroke !== undefined) {
      next = encodeStroke.call(next, targetArgs(stroke, id));
      if (Object.hasOwn(point, "strokeWidth")) next = next.editPointMark({ target: id, strokeWidth: point.strokeWidth });
    }
    if (size !== undefined) next = next.encodeSize(targetArgs(size, id));
    if (shape !== undefined) next = next.encodeShape(targetArgs(shape, id));
    return applyFacadeGuides(next, guides, id);
  }
);
