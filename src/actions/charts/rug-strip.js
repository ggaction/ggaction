import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateNonEmptyString, validateNonNegativeFinite, validateOptionObject } from
  "../../core/validation.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeEncoding,
  normalizeFieldEncoding,
  normalizeGuides,
  omitUndefinedOptions,
  positionArgs,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  inferFacadeFieldType,
  validateFacadeOptions
} from "./shared.js";

const RUG_OPTIONS = Object.freeze(["id", "data", "x", "y", "edge", "tick", "guides"]);
const MEASURE_OPTIONS = Object.freeze(["field", "fieldType", "temporalUnit", "scale"]);
const TICK_OPTIONS = Object.freeze(["length", "stroke", "strokeWidth", "opacity"]);
const STRIP_OPTIONS = Object.freeze([
  "id", "data", "x", "y", "color", "size", "shape", "point", "jitter", "guides"
]);
const POINT_OPTIONS = Object.freeze([
  "radius", "shape", "fill", "opacity", "stroke", "strokeWidth"
]);
const JITTER_OPTIONS = Object.freeze(["maxOffset", "seed", "key"]);

function normalizeMeasure(value, operation, channel) {
  const result = normalizeFieldEncoding(value, `${operation} ${channel}`);
  validateOptionObject(result, MEASURE_OPTIONS, `${operation} ${channel}`);
  validateNonEmptyString(result.field, `${operation} ${channel} field`);
  const fieldType = result.fieldType ?? "quantitative";
  if (!["quantitative", "temporal"].includes(fieldType)) {
    throw new Error(`${operation} ${channel} must be quantitative or temporal.`);
  }
  return { ...result, fieldType };
}

function normalizeRugGuides(value, measure, operation) {
  const guides = normalizeGuides(value, operation);
  if (guides === false) return false;
  validateOptionObject(guides, ["axes", "grid", "legend"], `${operation} guides`);
  const anchor = measure === "x" ? "y" : "x";
  if (guides.legend !== undefined && guides.legend !== false) {
    throw new Error(`${operation} does not have a legend encoding.`);
  }
  let axes = guides.axes;
  if (axes !== undefined && axes !== false) {
    if (!isPlainObject(axes)) {
      throw new TypeError(`${operation} guides.axes must be false or a plain object.`);
    }
    if (axes[anchor] !== undefined && axes[anchor] !== false) {
      throw new Error(`${operation} cannot create an axis for its constant anchor.`);
    }
    axes = { ...axes, [anchor]: false };
  } else if (axes === undefined) {
    axes = { [measure]: {}, [anchor]: false };
  }
  let grid = guides.grid;
  const anchorGrid = measure === "x" ? "horizontal" : "vertical";
  if (grid !== undefined && grid !== false) {
    if (!isPlainObject(grid)) {
      throw new TypeError(`${operation} guides.grid must be false or a plain object.`);
    }
    if (grid[anchorGrid] !== undefined && grid[anchorGrid] !== false) {
      throw new Error(`${operation} cannot create a grid for its constant anchor.`);
    }
    grid = { ...grid, [anchorGrid]: false };
  } else if (grid === undefined) {
    grid = false;
  }
  return { axes, grid, legend: false };
}

export const createRugPlot = action(
  {
    op: "createRugPlot",
    description: "Create a one-dimensional Rug plot at an explicit plot edge."
  },
  function (args = {}) {
    const operation = "createRugPlot";
    validateFacadeOptions(args, RUG_OPTIONS, operation);
    const hasX = args.x !== undefined;
    const hasY = args.y !== undefined;
    if (hasX === hasY) {
      throw new Error(`${operation} requires exactly one of x or y.`);
    }
    const measure = hasX ? "x" : "y";
    const edge = args.edge;
    const supportedEdges = measure === "x" ? ["top", "bottom"] : ["left", "right"];
    if (!supportedEdges.includes(edge)) {
      throw new Error(`${operation} ${measure} requires edge ${supportedEdges.join(" or ")}.`);
    }
    const id = resolveFacadeId(this, args.id, {
      defaultId: "rugPlot",
      operation
    });
    const data = resolveFacadeData(this, args.data, operation);
    const encoding = normalizeMeasure(args[measure], operation, measure);
    const tick = normalizeAppearance(args.tick, TICK_OPTIONS, `${operation} tick`);
    const guides = normalizeRugGuides(args.guides, measure, operation);
    const anchor = measure === "x" ? "y" : "x";
    const highEdge = edge === "top" || edge === "right";

    let next = this.createTickMark({ id, data, ...tick });
    next = next[measure === "x" ? "encodeX" : "encodeY"](
      positionArgs(encoding, { target: id })
    );
    next = next[anchor === "x" ? "encodeX" : "encodeY"]({
      target: id,
      datum: highEdge ? 1 : 0,
      fieldType: "quantitative",
      scale: { id: `${id}Anchor`, domain: [0, 1], zero: false, nice: false }
    });
    next = next.encodeAngle({ target: id, value: measure === "x" ? 0 : 90 });
    return applyFacadeGuides(next, guides, id, guides);
  }
);

function normalizeStripPosition(program, data, value, operation, channel) {
  const result = normalizeFieldEncoding(value, `${operation} ${channel}`);
  validateOptionObject(result, MEASURE_OPTIONS, `${operation} ${channel}`);
  validateNonEmptyString(result.field, `${operation} ${channel} field`);
  const fieldType = inferFacadeFieldType(
    program,
    data,
    result,
    `${operation} ${channel}`
  );
  if (!["quantitative", "temporal", "nominal", "ordinal"].includes(fieldType)) {
    throw new Error(`${operation} ${channel} has an unsupported field type.`);
  }
  return { ...omitUndefinedOptions(result), fieldType };
}

function normalizeStripJitter(value, channel, slot, operation) {
  if (value === undefined || value === false) return undefined;
  if (!isPlainObject(value)) {
    throw new TypeError(`${operation} jitter must be false or a plain object.`);
  }
  validateOptionObject(value, JITTER_OPTIONS, `${operation} jitter`);
  if (!isPlainObject(value.maxOffset)) {
    throw new TypeError(`${operation} jitter.maxOffset must be a plain object.`);
  }
  const keys = Object.keys(value.maxOffset);
  const expected = slot === "category" ? "band" : "pixels";
  if (keys.length !== 1 || keys[0] !== expected) {
    throw new Error(
      `${operation} ${slot} slot jitter requires maxOffset.${expected}.`
    );
  }
  return { ...value, channel };
}

function normalizeStripGuides(value, actualChannels, hasLegend, operation) {
  const guides = normalizeGuides(value, operation);
  if (guides === false) return false;
  validateOptionObject(guides, ["axes", "grid", "legend"], `${operation} guides`);
  const anchor = actualChannels.length === 1
    ? (actualChannels[0] === "x" ? "y" : "x")
    : undefined;
  let axes = guides.axes;
  if (axes !== undefined && axes !== false) {
    if (!isPlainObject(axes)) {
      throw new TypeError(`${operation} guides.axes must be false or a plain object.`);
    }
    if (anchor !== undefined && axes[anchor] !== undefined && axes[anchor] !== false) {
      throw new Error(`${operation} cannot create an axis for its constant slot.`);
    }
    axes = anchor === undefined ? { ...axes } : { ...axes, [anchor]: false };
  } else if (axes === undefined) {
    axes = {
      x: actualChannels.includes("x") ? {} : false,
      y: actualChannels.includes("y") ? {} : false
    };
  }
  let grid = guides.grid;
  if (grid === undefined) grid = false;
  else if (grid !== false) {
    if (!isPlainObject(grid)) {
      throw new TypeError(`${operation} guides.grid must be false or a plain object.`);
    }
    const anchorGrid = anchor === "x" ? "vertical" : anchor === "y" ? "horizontal" : undefined;
    if (
      anchorGrid !== undefined && grid[anchorGrid] !== undefined &&
      grid[anchorGrid] !== false
    ) {
      throw new Error(`${operation} cannot create a grid for its constant slot.`);
    }
    grid = anchorGrid === undefined ? { ...grid } : { ...grid, [anchorGrid]: false };
  }
  if (!hasLegend && guides.legend !== undefined && guides.legend !== false) {
    throw new Error(`${operation} legend requires color, size, or shape.`);
  }
  const legend = guides.legend === undefined ? (hasLegend ? {} : false) : guides.legend;
  return { axes, grid, legend };
}

export const createStripPlot = action(
  {
    op: "createStripPlot",
    description: "Create a one-dimensional Strip plot with an optional categorical slot and jitter."
  },
  function (args = {}) {
    const operation = "createStripPlot";
    validateFacadeOptions(args, STRIP_OPTIONS, operation);
    if (args.x === undefined) throw new Error(`${operation} requires x.`);
    const id = resolveFacadeId(this, args.id, {
      defaultId: "stripPlot",
      operation
    });
    const data = resolveFacadeData(this, args.data, operation);
    const x = normalizeStripPosition(this, data, args.x, operation, "x");
    const y = args.y === undefined
      ? undefined
      : normalizeStripPosition(this, data, args.y, operation, "y");
    const isMeasure = encoding => ["quantitative", "temporal"].includes(encoding.fieldType);
    if (!isMeasure(x) && y === undefined) {
      throw new Error(`${operation} x must be a quantitative or temporal measure when y is omitted.`);
    }
    if (y !== undefined && isMeasure(x) === isMeasure(y)) {
      throw new Error(`${operation} requires exactly one measure and one categorical slot.`);
    }
    const color = normalizeEncoding(args.color, `${operation} color`);
    const size = normalizeEncoding(args.size, `${operation} size`);
    const shape = normalizeEncoding(args.shape, `${operation} shape`);
    const { radius, ...point } = normalizeAppearance(
      args.point,
      POINT_OPTIONS,
      `${operation} point`
    );
    if (radius !== undefined) {
      validateNonNegativeFinite(radius, `${operation} point radius`);
    }
    if (radius !== undefined && size !== undefined) {
      throw new Error(`${operation} point radius conflicts with size.`);
    }
    const categoryChannel = y === undefined ? undefined : (isMeasure(x) ? "y" : "x");
    const jitterChannel = categoryChannel ?? "y";
    const jitter = normalizeStripJitter(
      args.jitter,
      jitterChannel,
      categoryChannel === undefined ? "constant" : "category",
      operation
    );
    const guides = normalizeStripGuides(
      args.guides,
      y === undefined ? ["x"] : ["x", "y"],
      color !== undefined || size !== undefined || shape !== undefined,
      operation
    );

    let next = this
      .createPointMark({ id, data, ...point })
      .encodeX(positionArgs(x, { target: id }));
    next = y === undefined
      ? next.encodeY({
          target: id,
          datum: 0.5,
          fieldType: "quantitative",
          scale: { id: `${id}Anchor`, domain: [0, 1], zero: false, nice: false }
        })
      : next.encodeY(positionArgs(y, { target: id }));
    if (radius !== undefined) next = next.encodePointRadius({ target: id, value: radius });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    if (size !== undefined) next = next.encodeSize(targetArgs(size, id));
    if (shape !== undefined) next = next.encodeShape(targetArgs(shape, id));
    if (jitter !== undefined) next = next.jitterPoints({ target: id, ...jitter });
    return applyFacadeGuides(next, guides, id, guides);
  }
);
