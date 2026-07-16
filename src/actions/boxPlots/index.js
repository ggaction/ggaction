import { action } from "../../core/action.js";
import { resolveOptionalUserId, validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import {
  BOX_FIELDS,
  deriveBoxData,
  normalizeBoxTransform
} from "../../grammar/boxPlot.js";
import { validatePointShape } from "../../grammar/pointShapes.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";

const OPTIONS = Object.freeze([
  "id", "target", "data", "x", "y", "coordinate", "whisker",
  "width", "outliers", "box", "median", "outlier"
]);
const MEDIAN_OPTIONS = Object.freeze([
  "id", "owner", "data", "category", "categoryType", "measure",
  "coordinate", "categoryScale", "measureScale", "orientation", "stroke", "strokeWidth"
]);
const OUTLIER_OPTIONS = Object.freeze([
  "id", "data", "category", "categoryType", "measure", "coordinate",
  "categoryScale", "measureScale", "orientation", "shape", "radius", "opacity"
]);

const CATEGORY_TYPES = Object.freeze(["nominal", "ordinal", "temporal"]);
const DEFAULT_BOX = Object.freeze({
  fill: "#4c78a8",
  opacity: 1,
  stroke: "#4c78a8",
  strokeWidth: 1.5
});
const DEFAULT_MEDIAN = Object.freeze({ stroke: "#1f2937", strokeWidth: 1.5 });
const DEFAULT_OUTLIER = Object.freeze({ shape: "diamond", radius: 3, opacity: 0.75 });

function position(value, label) {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) throw new TypeError(`createBoxPlot ${label} must be a plain object.`);
  validateKeys(value, ["field", "fieldType", "scale"], `createBoxPlot ${label}`);
  return value;
}

function encodingArgs(value) {
  return {
    ...value,
    ...(typeof value.scale === "string" ? { scale: { id: value.scale } } : {})
  };
}

function resolveWhisker(value) {
  if (value === undefined) return Object.freeze({ type: "tukey", factor: 1.5 });
  if (!isPlainObject(value)) {
    throw new TypeError("createBoxPlot whisker must be a plain object.");
  }
  validateKeys(value, ["type", "factor"], "createBoxPlot whisker");
  const type = value.type ?? "tukey";
  if (!["tukey", "minmax"].includes(type)) {
    throw new Error(`Unsupported createBoxPlot whisker type "${type}".`);
  }
  if (type === "minmax") {
    if (value.factor !== undefined) {
      throw new Error("createBoxPlot minmax whiskers do not accept factor.");
    }
    return Object.freeze({ type });
  }
  const factor = value.factor ?? 1.5;
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new RangeError("createBoxPlot whisker factor must be positive and finite.");
  }
  return Object.freeze({ type, factor });
}

function plainOptions(value, keys, label) {
  if (value === undefined) return {};
  if (!isPlainObject(value)) {
    throw new TypeError(`createBoxPlot ${label} must be a plain object.`);
  }
  validateKeys(value, keys, `createBoxPlot ${label}`);
  return value;
}

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`createBoxPlot ${label} must be a non-empty string.`);
  }
  return value;
}

function opacity(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`createBoxPlot ${label} must be between 0 and 1.`);
  }
  return value;
}

function nonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`createBoxPlot ${label} must be a non-negative finite number.`);
  }
  return value;
}

function positive(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`createBoxPlot ${label} must be a positive finite number.`);
  }
  return value;
}

function resolveWidth(value) {
  const options = plainOptions(value, ["band"], "width");
  const band = options.band ?? 0.7;
  if (!Number.isFinite(band) || band <= 0 || band >= 1) {
    throw new RangeError("createBoxPlot width.band must be greater than 0 and less than 1.");
  }
  return band;
}

function resolveBox(value) {
  const options = plainOptions(
    value,
    ["fill", "opacity", "stroke", "strokeWidth"],
    "box"
  );
  return Object.freeze({
    fill: options.fill === undefined
      ? DEFAULT_BOX.fill
      : nonEmptyString(options.fill, "box.fill"),
    opacity: options.opacity === undefined
      ? DEFAULT_BOX.opacity
      : opacity(options.opacity, "box.opacity"),
    stroke: options.stroke === undefined
      ? DEFAULT_BOX.stroke
      : nonEmptyString(options.stroke, "box.stroke"),
    strokeWidth: options.strokeWidth === undefined
      ? DEFAULT_BOX.strokeWidth
      : nonNegative(options.strokeWidth, "box.strokeWidth")
  });
}

function resolveMedian(value) {
  const options = plainOptions(value, ["stroke", "strokeWidth"], "median");
  return Object.freeze({
    stroke: options.stroke === undefined
      ? DEFAULT_MEDIAN.stroke
      : nonEmptyString(options.stroke, "median.stroke"),
    strokeWidth: options.strokeWidth === undefined
      ? DEFAULT_MEDIAN.strokeWidth
      : nonNegative(options.strokeWidth, "median.strokeWidth")
  });
}

function resolveOutlier(value) {
  const options = plainOptions(value, ["shape", "radius", "opacity"], "outlier");
  return Object.freeze({
    shape: options.shape === undefined
      ? DEFAULT_OUTLIER.shape
      : validatePointShape(options.shape),
    radius: options.radius === undefined
      ? DEFAULT_OUTLIER.radius
      : positive(options.radius, "outlier.radius"),
    opacity: options.opacity === undefined
      ? DEFAULT_OUTLIER.opacity
      : opacity(options.opacity, "outlier.opacity")
  });
}

function resolveOrientation(x, y) {
  const xType = x?.fieldType ?? "quantitative";
  const yType = y?.fieldType ?? "quantitative";
  if (CATEGORY_TYPES.includes(xType) && yType === "quantitative") return "vertical";
  if (xType === "quantitative" && CATEGORY_TYPES.includes(yType)) return "horizontal";
  return undefined;
}

function sourceLayer(program, target) {
  if (target !== undefined) {
    const layer = findLayer(program, validateUserId(target, "Box source layer id"));
    if (layer === undefined) throw new Error(`Unknown box source layer "${target}".`);
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current?.encoding?.x !== undefined || current?.encoding?.y !== undefined) return current;
  const eligible = program.semanticSpec.layers.filter(layer => layer.encoding?.x !== undefined && layer.encoding?.y !== undefined);
  return eligible.length === 1 ? eligible[0] : undefined;
}

function resolveId(program, requested) {
  return resolveOptionalUserId(requested, {
    defaultId: "boxPlot", label: "Box-plot id", operation: "createBoxPlot",
    ambiguous: hasLayer(program, "boxPlot") || program.graphicSpec.objects.boxPlot !== undefined
  });
}

const createBoxMedian = action(
  { op: "createBoxMedian", description: "Create a median rule spanning one concrete box body." },
  function (args = {}) {
    validateKeys(args, MEDIAN_OPTIONS, "createBoxMedian");
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported box median orientation "${args.orientation}".`);
    }
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    let next = this.createRuleMark({ id: args.id, data: args.data });
    next = next[categoryAction]({
      target: args.id,
      field: args.category,
      fieldType: args.categoryType,
      coordinate: args.coordinate,
      scale: { id: args.categoryScale }
    });
    next = next[measureAction]({
      target: args.id,
      field: args.measure,
      fieldType: "quantitative",
      coordinate: args.coordinate,
      scale: { id: args.measureScale }
    });
    next = next
      .encodeStroke({ target: args.id, value: args.stroke })
      .encodeStrokeWidth({ target: args.id, value: args.strokeWidth });
    next = next._withMarkConfig(args.id, {
      ...next.markConfigs[args.id],
      boxSpanOwner: args.owner
    });
    return next.rematerializeRuleMark({ id: args.id });
  }
);

const createBoxOutliers = action(
  { op: "createBoxOutliers", description: "Create concrete point symbols for box-plot outlier rows." },
  function (args = {}) {
    validateKeys(args, OUTLIER_OPTIONS, "createBoxOutliers");
    if (!["vertical", "horizontal"].includes(args.orientation)) {
      throw new Error(`Unsupported box outlier orientation "${args.orientation}".`);
    }
    const categoryAction = args.orientation === "vertical" ? "encodeX" : "encodeY";
    const measureAction = args.orientation === "vertical" ? "encodeY" : "encodeX";
    let next = this.createPointMark({ id: args.id, data: args.data, shape: args.shape });
    next = next[categoryAction]({
      target: args.id,
      field: args.category,
      fieldType: args.categoryType,
      coordinate: args.coordinate,
      scale: { id: args.categoryScale }
    });
    next = next[measureAction]({
      target: args.id,
      field: args.measure,
      fieldType: "quantitative",
      coordinate: args.coordinate,
      scale: { id: args.measureScale }
    });
    return next
      .encodeRadius({ target: args.id, value: args.radius })
      .encodeOpacity({ target: args.id, value: args.opacity })
      .editGraphics({ target: args.id, property: "fill", value: "#111111" });
  }
);

const materializeBoxPlot = action(
  { op: "materializeBoxPlot", description: "Materialize a complete box-plot composite." },
  function ({ id } = {}) {
    const ownerId = validateUserId(id, "Box-plot id");
    const config = this.markConfigs[ownerId]?.boxPlot;
    const layer = findLayer(this, ownerId);
    if (config === undefined || layer?.mark?.type !== "bar") throw new Error(`Unknown box plot "${ownerId}".`);
    if (config.materialized) return this;
    const x = layer.encoding?.x;
    const y = layer.encoding?.y;
    if (x?.field === undefined || y?.field === undefined) return this;
    const orientation = resolveOrientation(x, y);
    if (orientation === undefined) {
      throw new Error("createBoxPlot requires one categorical axis and one quantitative axis.");
    }
    const category = orientation === "vertical" ? x : y;
    const measure = orientation === "vertical" ? y : x;
    const measureChannel = orientation === "vertical" ? "y" : "x";
    const source = layer.data;
    const summaryId = `${ownerId}SummaryData`;
    const outlierDataId = `${ownerId}OutlierData`;
    const whiskerId = `${ownerId}Whisker`;
    const medianId = `${ownerId}Median`;
    const outlierId = `${ownerId}Outliers`;
    let next = this._withMarkConfig(ownerId, {
      ...this.markConfigs[ownerId],
      boxPlot: {
        ...config,
        materialized: true,
        source,
        orientation,
        category: category.field,
        measure: measure.field
      },
      barWidth: { band: config.width },
      fill: config.box.fill,
      opacity: config.box.opacity,
      stroke: config.box.stroke,
      strokeWidth: config.box.strokeWidth
    })
      .createBoxSummaryData({
        id: summaryId,
        source,
        category: category.field,
        field: measure.field,
        whisker: config.whisker.type,
        ...(config.whisker.factor === undefined ? {} : { factor: config.whisker.factor })
      });
    const sourceRows = findDataset(next, source).values;
    const hasOutliers = config.outliers && config.whisker.type === "tukey" && deriveBoxData(sourceRows, normalizeBoxTransform({
      type: "boxOutlier",
      category: category.field,
      field: measure.field,
      whisker: config.whisker.type,
      factor: config.whisker.factor
    })).outliers.length > 0;
    if (hasOutliers) {
      next = next.createBoxOutlierData({
        id: outlierDataId,
        source,
        category: category.field,
        field: measure.field,
        whisker: config.whisker.type,
        factor: config.whisker.factor
      });
    }
    next = next.editSemantic({ property: `layer[${ownerId}].data`, value: summaryId });
    const rangeAction = orientation === "vertical" ? "encodeYRange" : "encodeXRange";
    next = next[rangeAction]({
      target: ownerId,
      lower: BOX_FIELDS.q1,
      upper: BOX_FIELDS.q3,
      scale: { id: measure.scale }
    }).editSemantic({
      property: `layer[${ownerId}].encoding.${measureChannel}.title`,
      value: measure.field
    });
    next = next.createErrorBar({
      id: whiskerId,
      data: summaryId,
      ...(orientation === "vertical"
        ? {
            x: { field: category.field, fieldType: category.fieldType, scale: { id: category.scale } },
            y: {
              center: BOX_FIELDS.median,
              lower: BOX_FIELDS.lowerWhisker,
              upper: BOX_FIELDS.upperWhisker,
              scale: { id: measure.scale }
            }
          }
        : {
            x: {
              center: BOX_FIELDS.median,
              lower: BOX_FIELDS.lowerWhisker,
              upper: BOX_FIELDS.upperWhisker,
              scale: { id: measure.scale }
            },
            y: { field: category.field, fieldType: category.fieldType, scale: { id: category.scale } }
          }),
      coordinate: layer.coordinate,
      stroke: "#111111",
      strokeWidth: 1.5
    });
    next = next
      .editSemantic({
        property: `layer[${whiskerId}].encoding.${measureChannel}.title`,
        value: measure.field
      })
      .editGraphics({ target: ownerId, remove: true })
      .createGraphics({ id: ownerId, type: "rect", length: 0 })
      .rematerializeBarMark({ id: ownerId })
      .createBoxMedian({
        id: medianId,
        owner: ownerId,
        data: summaryId,
        category: category.field,
        categoryType: category.fieldType,
        measure: BOX_FIELDS.median,
        orientation,
        coordinate: layer.coordinate,
        categoryScale: category.scale,
        measureScale: measure.scale,
        stroke: config.median.stroke,
        strokeWidth: config.median.strokeWidth
      });
    if (hasOutliers) {
      next = next
        .createBoxOutliers({
          id: outlierId,
          data: outlierDataId,
          category: category.field,
          categoryType: category.fieldType,
          measure: measure.field,
          orientation,
          coordinate: layer.coordinate,
          categoryScale: category.scale,
          measureScale: measure.scale,
          shape: config.outlier.shape,
          radius: config.outlier.radius,
          opacity: config.outlier.opacity
        });
    }
    return next._withContext({ currentMark: ownerId, currentData: source });
  }
);

const createBoxPlot = action(
  { op: "createBoxPlot", description: "Create a Tukey box plot from categorical and quantitative positions." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createBoxPlot");
    const id = resolveId(this, args.id);
    const source = sourceLayer(this, args.target);
    const data = args.data ?? source?.data ?? this.context.currentData;
    if (findDataset(this, data) === undefined) throw new Error("createBoxPlot requires data or one inferable dataset.");
    const x = position(args.x, "x") ?? source?.encoding?.x;
    const y = position(args.y, "y") ?? source?.encoding?.y;
    const whisker = resolveWhisker(args.whisker);
    const width = resolveWidth(args.width);
    if (args.outliers !== undefined && typeof args.outliers !== "boolean") {
      throw new TypeError("createBoxPlot outliers must be a boolean.");
    }
    const box = resolveBox(args.box);
    const median = resolveMedian(args.median);
    const outlier = resolveOutlier(args.outlier);
    if (
      x !== undefined &&
      y !== undefined &&
      resolveOrientation(x, y) === undefined
    ) {
      throw new Error("createBoxPlot requires one categorical axis and one quantitative axis.");
    }
    const orientation = resolveOrientation(x, y);
    const category = orientation === "vertical" ? x : y;
    const categoryScaleId = typeof category?.scale === "string"
      ? category.scale
      : category?.scale?.id;
    const categoryScale = findSemanticScale(this, categoryScaleId);
    let next = categoryScale?.type === "point"
      ? this.editScale({ id: categoryScaleId, type: "band" })
      : this;
    next = next.createBarMark({ id, data })._withMarkConfig(id, {
      boxPlot: {
        whisker,
        width,
        outliers: args.outliers ?? true,
        box,
        median,
        outlier
      }
    });
    if (x !== undefined) next = next.encodeX({ ...encodingArgs(x), target: id, coordinate: args.coordinate ?? source?.coordinate });
    if (y !== undefined) next = next.encodeY({ ...encodingArgs(y), target: id, coordinate: args.coordinate ?? source?.coordinate });
    return next.materializeBoxPlot({ id });
  }
);

export function registerBoxPlotActions(ProgramClass) {
  ProgramClass.prototype.createBoxPlot = createBoxPlot;
  ProgramClass.prototype.materializeBoxPlot = materializeBoxPlot;
  ProgramClass.prototype.createBoxMedian = createBoxMedian;
  ProgramClass.prototype.createBoxOutliers = createBoxOutliers;
}
