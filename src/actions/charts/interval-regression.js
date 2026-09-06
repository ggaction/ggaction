import { action } from "../../core/action.js";
import { validateNonNegativeFinite } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import {
  applyFacadeGuides,
  normalizeAppearance,
  normalizeEncoding,
  normalizeFieldEncoding,
  normalizeGuides,
  resolveFacadeData,
  resolveFacadeId,
  targetArgs,
  validateFacadeOptions
} from "./shared.js";

const INTERVAL_OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "xOffset", "yOffset", "groupBy",
  "color", "point", "errorBar", "guides"
]);
const POINT_OPTIONS = Object.freeze([
  "shape", "fill", "opacity", "stroke", "strokeWidth", "radius"
]);
const ERROR_BAR_OPTIONS = Object.freeze([
  "caps", "capSize", "stroke", "strokeWidth", "strokeDash", "opacity"
]);

function intervalChannel(value, operation, channel) {
  return normalizeFieldEncoding(value, `${operation} ${channel}`);
}

function centerField(program, config) {
  if (config.intervalMode === "explicit") return config.centerField;
  const dataset = findDataset(program, config.data);
  const transform = dataset?.transform?.[0];
  if (transform?.type !== "interval") {
    throw new Error(`Interval plot requires interval provenance for dataset "${config.data}".`);
  }
  return transform.as.center;
}

function applyIntervalPointPositions(program, id, config) {
  const vertical = config.orientation === "vertical";
  const positionChannel = vertical ? "x" : "y";
  const intervalChannelName = vertical ? "y" : "x";
  let next = program[positionChannel === "x" ? "encodeX" : "encodeY"]({
    target: id,
    field: config.positionField,
    fieldType: config.positionFieldType,
    ...(config.positionTemporalUnit === undefined
      ? {}
      : { temporalUnit: config.positionTemporalUnit }),
    coordinate: config.coordinate,
    scale: { id: config.positionScale }
  });
  next = next[intervalChannelName === "x" ? "encodeX" : "encodeY"]({
    target: id,
    field: centerField(next, config),
    fieldType: "quantitative",
    coordinate: config.coordinate,
    scale: { id: config.intervalScale }
  });
  if (config.offset !== undefined) {
    next = next[config.offset.channel === "xOffset" ? "encodeXOffset" : "encodeYOffset"]({
      target: id,
      field: config.offset.field,
      fieldType: config.offset.fieldType,
      scale: { id: config.offset.scale },
      paddingInner: config.offset.paddingInner,
      paddingOuter: config.offset.paddingOuter
    });
  }
  return next;
}

export const createIntervalPlot = action(
  {
    op: "createIntervalPlot",
    description: "Create a center point and matching statistical or explicit interval."
  },
  function (args = {}) {
    const operation = "createIntervalPlot";
    validateFacadeOptions(args, INTERVAL_OPTIONS, operation);
    const id = resolveFacadeId(this, args.id, { defaultId: "intervalPlot", operation });
    const data = resolveFacadeData(this, args.data, operation);
    const x = intervalChannel(args.x, operation, "x");
    const y = intervalChannel(args.y, operation, "y");
    const point = normalizeAppearance(args.point, POINT_OPTIONS, `${operation} point`);
    const { radius, ...pointAppearance } = point;
    if (radius !== undefined) validateNonNegativeFinite(radius, `${operation} point radius`);
    const errorBar = normalizeAppearance(
      args.errorBar,
      ERROR_BAR_OPTIONS,
      `${operation} errorBar`
    );
    const color = normalizeEncoding(args.color, `${operation} color`);
    const guides = normalizeGuides(args.guides, operation);
    const intervalId = `${id}Interval`;

    let next = this.createErrorBar({
      id: intervalId,
      data,
      x,
      y,
      ...(args.xOffset === undefined ? {} : { xOffset: args.xOffset }),
      ...(args.yOffset === undefined ? {} : { yOffset: args.yOffset }),
      ...(Object.hasOwn(args, "groupBy") ? { groupBy: args.groupBy } : {}),
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      ...errorBar
    });
    const config = next.markConfigs[intervalId]?.errorBar;
    if (config === undefined) {
      throw new Error(`Interval plot child "${intervalId}" has no interval owner configuration.`);
    }
    next = next.createPointMark({ id, data: config.data, ...pointAppearance });
    next = applyIntervalPointPositions(next, id, config);
    if (radius !== undefined) next = next.encodePointRadius({ target: id, value: radius });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    return applyFacadeGuides(next, guides, id, guides);
  }
);

const REGRESSION_OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "color", "size", "shape", "point",
  "groupBy", "method", "degree", "span", "confidenceMethod", "level", "confidence",
  "interval", "band", "line", "guides"
]);

export const createRegressionPlot = action(
  {
    op: "createRegressionPlot",
    description: "Create a scatter plot with a fitted regression line and optional interval band."
  },
  function (args = {}) {
    const operation = "createRegressionPlot";
    validateFacadeOptions(args, REGRESSION_OPTIONS, operation);
    const id = resolveFacadeId(this, args.id, { defaultId: "regressionPlot", operation });
    const data = resolveFacadeData(this, args.data, operation);
    const guides = normalizeGuides(args.guides, operation);
    let next = this.createScatterPlot({
      id,
      data,
      x: args.x,
      y: args.y,
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      ...(args.color === undefined ? {} : { color: args.color }),
      ...(args.size === undefined ? {} : { size: args.size }),
      ...(args.shape === undefined ? {} : { shape: args.shape }),
      ...(args.point === undefined ? {} : { point: args.point }),
      guides: false
    });
    const regression = Object.fromEntries([
      "groupBy", "method", "degree", "span", "confidenceMethod", "level",
      "confidence", "interval", "band", "line"
    ].filter(key => Object.hasOwn(args, key)).map(key => [key, args[key]]));
    next = next.createRegression({ target: id, ...regression });
    return applyFacadeGuides(next, guides, id, guides);
  }
);
