import { action } from "../../core/action.js";
import { validateNonNegativeFinite, validateOptionObject } from
  "../../core/validation.js";
import { normalizeGroupFields } from "../../grammar/pathSeries.js";
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

const POSITION_OPTIONS = Object.freeze([
  "field", "fieldType", "temporalUnit", "scale"
]);
const POINT_OPTIONS = Object.freeze([
  "shape", "fill", "opacity", "stroke", "strokeWidth", "radius"
]);
const LINE_OPTIONS = Object.freeze([
  "strokeWidth", "curve", "stroke", "opacity", "closed"
]);

function position(value, operation, channel) {
  const resolved = normalizeFieldEncoding(value, `${operation} ${channel}`);
  validateOptionObject(
    resolved,
    channel === "theta" ? POSITION_OPTIONS : ["field", "fieldType", "scale"],
    `${operation} ${channel}`
  );
  return resolved;
}

export const createPolarScatterPlot = action(
  {
    op: "createPolarScatterPlot",
    description: "Create a Polar scatter plot with distinct radial position and glyph size."
  },
  function (args = {}) {
    const operation = "createPolarScatterPlot";
    validateFacadeOptions(args, [
      "id", "data", "coordinate", "theta", "radius", "color", "size",
      "shape", "point", "guides"
    ], operation);
    const id = resolveFacadeId(this, args.id, {
      defaultId: "polarScatterPlot",
      operation
    });
    const data = resolveFacadeData(this, args.data, operation);
    const theta = position(args.theta, operation, "theta");
    const radiusPosition = position(args.radius, operation, "radius");
    const color = normalizeEncoding(args.color, `${operation} color`);
    const size = normalizeEncoding(args.size, `${operation} size`);
    const shape = normalizeEncoding(args.shape, `${operation} shape`);
    const { radius, ...point } = normalizeAppearance(
      args.point,
      POINT_OPTIONS,
      `${operation} point`
    );
    const guides = normalizeGuides(args.guides, operation);
    if (radius !== undefined) {
      validateNonNegativeFinite(radius, `${operation} point radius`);
      if (size !== undefined) {
        throw new Error(`${operation} point radius conflicts with size.`);
      }
    }

    let next = this
      .createPointMark({ id, data, ...point })
      .encodeTheta(positionArgs(theta, { target: id, coordinate: args.coordinate }))
      .encodeR(positionArgs(radiusPosition, { target: id, coordinate: args.coordinate }));
    if (radius !== undefined) next = next.encodePointRadius({ target: id, value: radius });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (size !== undefined) next = next.encodeSize(targetArgs(size, id));
    if (shape !== undefined) next = next.encodeShape(targetArgs(shape, id));
    return applyFacadeGuides(next, guides, id);
  }
);

export const createPolarLinePlot = action(
  {
    op: "createPolarLinePlot",
    description: "Create an open or explicitly closed Polar line plot."
  },
  function (args = {}) {
    const operation = "createPolarLinePlot";
    validateFacadeOptions(args, [
      "id", "data", "coordinate", "theta", "radius", "color", "groupBy",
      "strokeDash", "line", "guides"
    ], operation);
    const id = resolveFacadeId(this, args.id, {
      defaultId: "polarLinePlot",
      operation
    });
    const data = resolveFacadeData(this, args.data, operation);
    const theta = position(args.theta, operation, "theta");
    const radius = position(args.radius, operation, "radius");
    const color = normalizeEncoding(args.color, `${operation} color`);
    const strokeDash = normalizeStrokeDashEncoding(
      args.strokeDash,
      `${operation} strokeDash`
    );
    const groupBy = args.groupBy === undefined
      ? undefined
      : normalizeGroupFields(args.groupBy);
    const line = normalizeAppearance(args.line, LINE_OPTIONS, `${operation} line`);
    const guides = normalizeGuides(args.guides, operation);

    let next = this
      .createLineMark({ id, data, ...line })
      .encodeTheta(positionArgs(theta, { target: id, coordinate: args.coordinate }))
      .encodeR(positionArgs(radius, { target: id, coordinate: args.coordinate }));
    if (groupBy !== undefined) next = next.encodeGroup({ target: id, fields: groupBy });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (strokeDash !== undefined) next = next.encodeStrokeDash(targetArgs(strokeDash, id));
    return applyFacadeGuides(next, guides, id);
  }
);
