import { action } from "../../core/action.js";
import { validateOptionObject } from "../../core/validation.js";
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
} from "../charts/shared.js";

const OPTIONS = Object.freeze([
  "id", "data", "coordinate", "x", "y", "split", "color", "density",
  "area", "guides"
]);
const POSITION_OPTIONS = Object.freeze(["field", "fieldType", "scale"]);
const DENSITY_OPTIONS = Object.freeze([
  "bandwidth", "extent", "steps", "kernel", "normalization", "width"
]);
const WIDTH_OPTIONS = Object.freeze(["band", "resolve"]);
const SPLIT_OPTIONS = Object.freeze(["field", "domain"]);
const AREA_OPTIONS = Object.freeze([
  "fill", "opacity", "stroke", "strokeWidth", "curve"
]);
const CATEGORICAL_TYPES = Object.freeze(["nominal", "ordinal"]);
const OPERATION = "createViolinPlot";
const ROLE_ERROR = `${OPERATION} requires one categorical axis and one quantitative axis.`;

function inferFieldType(dataset, encoding, label) {
  if (encoding.fieldType !== undefined) return encoding.fieldType;
  if (typeof encoding.field !== "string" || encoding.field.length === 0) {
    throw new TypeError(`${label} field must be a non-empty string.`);
  }
  const values = dataset.values
    .map(row => row?.[encoding.field])
    .filter(value => value !== undefined && value !== null && value !== "");
  if (values.length === 0) {
    throw new Error(`${label} field "${encoding.field}" has no values.`);
  }
  return values.every(Number.isFinite) ? "quantitative" : "nominal";
}

function normalizePosition(dataset, value, label) {
  const encoding = normalizeFieldEncoding(value, label);
  validateOptionObject(encoding, POSITION_OPTIONS, label);
  return {
    ...encoding,
    fieldType: inferFieldType(dataset, encoding, label)
  };
}

function axisGuideOptions(value, field) {
  if (value === false) return false;
  return {
    ...(value ?? {}),
    title: {
      text: field,
      ...(value?.title ?? {})
    }
  };
}

function guideOptions(guides, x, y, category, color) {
  if (guides === false) return false;
  const axes = guides.axes === false
    ? false
    : {
        ...(guides.axes ?? {}),
        x: axisGuideOptions(guides.axes?.x, x.field),
        y: axisGuideOptions(guides.axes?.y, y.field)
      };
  const redundantLegend = color?.field === category.field &&
    !Object.hasOwn(guides, "legend");
  return {
    ...guides,
    axes,
    ...(redundantLegend ? { legend: false } : {})
  };
}

export const createViolinPlot = action(
  {
    op: "createViolinPlot",
    description: "Create a categorical kernel-density violin plot."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, OPERATION);
    const id = resolveFacadeId(this, args.id, {
      defaultId: "violinPlot",
      operation: OPERATION
    });
    const data = resolveFacadeData(this, args.data, OPERATION);
    const dataset = findDataset(this, data);
    const x = normalizePosition(dataset, args.x, `${OPERATION} x`);
    const y = normalizePosition(dataset, args.y, `${OPERATION} y`);
    const xCategorical = CATEGORICAL_TYPES.includes(x.fieldType);
    const yCategorical = CATEGORICAL_TYPES.includes(y.fieldType);
    if (xCategorical === yCategorical || (
      x.fieldType !== "quantitative" && y.fieldType !== "quantitative"
    )) {
      throw new Error(ROLE_ERROR);
    }
    const category = xCategorical ? x : y;
    const value = xCategorical ? y : x;
    if (value.fieldType !== "quantitative") {
      throw new Error(ROLE_ERROR);
    }
    let split = args.split;
    if (split !== undefined) {
      validateOptionObject(split, SPLIT_OPTIONS, `${OPERATION} split`);
      if (typeof split.field !== "string" || split.field.length === 0) {
        throw new TypeError(`${OPERATION} split.field must be a non-empty string.`);
      }
      split = { ...split };
    }
    if (split?.field === category.field) {
      throw new Error(`${OPERATION} split field must differ from its category field.`);
    }
    const color = normalizeEncoding(args.color, `${OPERATION} color`);
    if (
      color !== undefined &&
      ![category.field, split?.field].includes(color.field)
    ) {
      throw new Error(
        `${OPERATION} color must encode its category or split field.`
      );
    }
    const density = args.density === undefined ? {} : args.density;
    if (args.density !== undefined) {
      validateOptionObject(density, DENSITY_OPTIONS, `${OPERATION} density`);
      if (density.width !== undefined) {
        validateOptionObject(
          density.width,
          WIDTH_OPTIONS,
          `${OPERATION} density.width`
        );
      }
    }
    const { width: densityWidth, ...densityOptions } = density;
    const area = normalizeAppearance(
      args.area,
      AREA_OPTIONS,
      `${OPERATION} area`
    );
    if (color !== undefined && Object.hasOwn(area, "fill")) {
      throw new Error(`${OPERATION} area.fill cannot be combined with color.`);
    }
    const guides = guideOptions(
      normalizeGuides(args.guides, OPERATION),
      x,
      y,
      category,
      color
    );
    const { strokeWidth, ...areaCreate } = area;
    const hasFillStroke = strokeWidth !== undefined && area.stroke === undefined;
    let next = this.createAreaMark({
      id,
      data,
      ...areaCreate,
      ...(area.stroke === undefined || strokeWidth === undefined
        ? {}
        : { strokeWidth })
    });
    if (hasFillStroke) {
      next = next.configureAreaStrokeFromFill({ id, strokeWidth });
    }
    next = next.encodeDensity({
      target: id,
      source: data,
      field: value.field,
      groupBy: category.field,
      densityChannel: xCategorical ? "x" : "y",
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      ...(value.scale === undefined ? {} : { valueScale: value.scale }),
      ...densityOptions,
      placement: {
        type: "category",
        ...(densityWidth === undefined ? {} : { width: densityWidth }),
        ...(split === undefined ? {} : { split }),
        ...(category.scale === undefined ? {} : { scale: category.scale })
      }
    });
    if (color !== undefined) next = next.encodeColor(targetArgs(color, id));
    return applyFacadeGuides(next, guides);
  }
);
