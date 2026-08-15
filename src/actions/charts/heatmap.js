import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  validateNonEmptyString,
  validateOptionObject
} from "../../core/validation.js";
import { requireDataset } from "../../selectors/datasets.js";
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

const OPERATION = "createHeatmap";
const OPTIONS = [
  "id", "data", "coordinate", "x", "y", "bin", "color", "rect", "guides"
];
const RECT_OPTIONS = [
  "opacity", "stroke", "strokeWidth"
];
const BIN_OPTIONS = [
  "bins", "extent", "includeEmpty"
];
const BINNED_POSITION_OPTIONS = [
  "field", "fieldType", "scale"
];
const BINNED_COLOR_OPTIONS = [
  "scale", "palette"
];

function normalizeBin(value) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${OPERATION} bin must be a plain object.`);
  }
  validateOptionObject(value, BIN_OPTIONS, `${OPERATION} bin`);
  return {
    ...value,
    includeEmpty: value.includeEmpty ?? true
  };
}

function normalizePosition(value, channel, categorical = false) {
  const label = `${OPERATION} ${channel}`;
  const encoding = normalizeFieldEncoding(value, label);
  validateOptionObject(encoding, BINNED_POSITION_OPTIONS, label);
  const field = validateNonEmptyString(encoding.field, `${label} field`);
  const types = categorical ? ["nominal", "ordinal"] : ["quantitative"];
  const fieldType = encoding.fieldType ?? types[0];
  if (!types.includes(fieldType)) {
    throw new Error(`${label} requires a ${categorical ? "categorical" : "quantitative"} field.`);
  }
  if (encoding.scale !== undefined && !isPlainObject(encoding.scale)) {
    throw new TypeError(`${label} scale must be a plain object.`);
  }
  return { ...encoding, field, fieldType };
}

function normalizeBinnedColor(value) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(`${OPERATION} binned color must be a plain object.`);
  }
  validateOptionObject(value, BINNED_COLOR_OPTIONS, `${OPERATION} binned color`);
  return { ...value };
}

function resolvedPosition(encoding, field, extent) {
  const scale = encoding.scale ?? {};
  return {
    field,
    fieldType: "quantitative",
    scale: {
      type: "linear",
      nice: false,
      ...(scale.type !== "log" && { zero: false }),
      ...scale,
      domain: scale.domain === undefined || scale.domain === "auto"
        ? extent
        : scale.domain
    }
  };
}

function axisWithTitle(value, text) {
  if (value === false) return false;
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError(`${OPERATION} binned axis must be false or a plain object.`);
  }
  if (value?.title !== undefined && !isPlainObject(value.title)) {
    throw new TypeError(`${OPERATION} binned axis title must be a plain object.`);
  }
  return {
    ...value,
    title: {
      text,
      ...value?.title
    }
  };
}

function binnedGuides(guides, xTitle, yTitle) {
  if (guides === false) return false;
  for (const key of ["axes", "legend"]) {
    if (
      guides[key] !== undefined &&
      guides[key] !== false &&
      !isPlainObject(guides[key])
    ) {
      throw new TypeError(
        `${OPERATION} guides ${key} must be false or a plain object.`
      );
    }
  }
  const axes = guides.axes === false
    ? false
    : {
        ...guides.axes,
        x: axisWithTitle(guides.axes?.x, xTitle),
        y: axisWithTitle(guides.axes?.y, yTitle)
      };
  const legend = guides.legend === false
    ? false
    : { title: "Count", ...guides.legend };
  return {
    ...guides,
    axes,
    grid: guides.grid ?? false,
    legend
  };
}

export const createHeatmap = action(
  {
    op: OPERATION,
    description: "Create a pre-gridded or rectangularly binned heatmap."
  },
  function (args = {}) {
    validateFacadeOptions(args, OPTIONS, OPERATION);
    const id = resolveFacadeId(this, args.id, {
      defaultId: "heatmap",
      operation: OPERATION
    });
    const data = resolveFacadeData(this, args.data, OPERATION);
    const rect = normalizeAppearance(args.rect, RECT_OPTIONS, `${OPERATION} rect`);
    const guides = normalizeGuides(args.guides, OPERATION);
    if (args.bin === undefined) {
      const x = normalizePosition(args.x, "x", true);
      const y = normalizePosition(args.y, "y", true);
      const color = normalizeFieldEncoding(args.color, `${OPERATION} color`);
      const next = this
        .createRectMark({ id, data, ...rect })
        .encodeX(positionArgs(x, { target: id, coordinate: args.coordinate }))
        .encodeY(positionArgs(y, { target: id, coordinate: args.coordinate }))
        .encodeColor(targetArgs(color, id));
      return applyFacadeGuides(next, guides);
    }

    const x = normalizePosition(args.x, "x");
    const y = normalizePosition(args.y, "y");
    const bin = normalizeBin(args.bin);
    const color = normalizeBinnedColor(args.color);
    const resolvedGuides = binnedGuides(guides, x.field, y.field);
    const generatedData = `${id}Bin2DData`;
    const binned = this.createBin2DData({
      id: generatedData,
      source: data,
      x: x.field,
      y: y.field,
      ...bin
    });
    const transform = requireDataset(binned, generatedData).transform[0];
    const resolved = transform.resolved;
    const xEncoding = resolvedPosition(x, transform.as.x0, resolved.extent.x);
    const yEncoding = resolvedPosition(y, transform.as.y0, resolved.extent.y);
    const next = binned
      .createRectMark({ id, data: generatedData, ...rect })
      .encodeX(positionArgs(xEncoding, { target: id, coordinate: args.coordinate }))
      .encodeX2({ target: id, field: transform.as.x1, fieldType: "quantitative" })
      .encodeY(positionArgs(yEncoding, { target: id, coordinate: args.coordinate }))
      .encodeY2({ target: id, field: transform.as.y1, fieldType: "quantitative" })
      .encodeColor({
        target: id,
        field: transform.as.count,
        fieldType: "quantitative",
        ...color
      });
    return applyFacadeGuides(next, resolvedGuides);
  }
);
