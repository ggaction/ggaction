import { action } from "../../core/action.js";
import { resolveOptionalUserId, validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import {
  BOX_FIELDS,
  deriveBoxData,
  normalizeBoxTransform
} from "../../grammar/boxPlot.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer, hasLayer } from "../../selectors/layers.js";

const OPTIONS = Object.freeze(["id", "target", "data", "x", "y", "coordinate"]);
const MEDIAN_OPTIONS = Object.freeze([
  "id", "owner", "data", "category", "categoryType", "measure",
  "coordinate", "categoryScale", "measureScale", "stroke", "strokeWidth"
]);
const OUTLIER_OPTIONS = Object.freeze([
  "id", "data", "category", "categoryType", "measure", "coordinate",
  "categoryScale", "measureScale", "shape", "radius", "opacity"
]);

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
    let next = this
      .createRuleMark({ id: args.id, data: args.data })
      .encodeX({
        target: args.id,
        field: args.category,
        fieldType: args.categoryType,
        coordinate: args.coordinate,
        scale: { id: args.categoryScale }
      })
      .encodeY({
        target: args.id,
        field: args.measure,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.measureScale }
      })
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
    return this
      .createPointMark({ id: args.id, data: args.data, shape: args.shape })
      .encodeX({
        target: args.id,
        field: args.category,
        fieldType: args.categoryType,
        coordinate: args.coordinate,
        scale: { id: args.categoryScale }
      })
      .encodeY({
        target: args.id,
        field: args.measure,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.measureScale }
      })
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
    if (!["nominal", "ordinal", "temporal"].includes(x.fieldType) || y.fieldType !== "quantitative") {
      throw new Error("createBoxPlot currently requires categorical x and quantitative y encodings.");
    }
    const source = layer.data;
    const summaryId = `${ownerId}SummaryData`;
    const outlierDataId = `${ownerId}OutlierData`;
    const whiskerId = `${ownerId}Whisker`;
    const medianId = `${ownerId}Median`;
    const outlierId = `${ownerId}Outliers`;
    let next = this._withMarkConfig(ownerId, {
      ...this.markConfigs[ownerId],
      boxPlot: { ...config, materialized: true, source, category: x.field, measure: y.field },
      barWidth: { band: config.width },
      fill: config.box.fill,
      opacity: config.box.opacity,
      stroke: config.box.stroke,
      strokeWidth: config.box.strokeWidth
    })
      .createBoxSummaryData({ id: summaryId, source, category: x.field, field: y.field, factor: config.factor });
    const sourceRows = findDataset(next, source).values;
    const hasOutliers = config.outliers && deriveBoxData(sourceRows, normalizeBoxTransform({
      type: "boxOutlier",
      category: x.field,
      field: y.field,
      factor: config.factor
    })).outliers.length > 0;
    if (hasOutliers) {
      next = next.createBoxOutlierData({ id: outlierDataId, source, category: x.field, field: y.field, factor: config.factor });
    }
    next = next
      .editSemantic({ property: `layer[${ownerId}].data`, value: summaryId })
      .editSemantic({ property: `layer[${ownerId}].encoding.y.field`, value: BOX_FIELDS.q1 })
      .editSemantic({ property: `layer[${ownerId}].encoding.y.title`, value: y.field })
      .editSemantic({ property: `layer[${ownerId}].encoding.y2.field`, value: BOX_FIELDS.q3 })
      .editSemantic({ property: `layer[${ownerId}].encoding.y2.fieldType`, value: "quantitative" })
      .editSemantic({ property: `layer[${ownerId}].encoding.y2.scale`, value: y.scale });
    next = next.createErrorBar({
      id: whiskerId,
      data: summaryId,
      x: { field: x.field, fieldType: x.fieldType, scale: { id: x.scale } },
      y: { center: BOX_FIELDS.median, lower: BOX_FIELDS.lowerWhisker, upper: BOX_FIELDS.upperWhisker, scale: { id: y.scale } },
      coordinate: layer.coordinate,
      stroke: "#111111",
      strokeWidth: 1.5
    });
    next = next
      .editSemantic({ property: `layer[${whiskerId}].encoding.y.title`, value: y.field })
      .editGraphics({ target: ownerId, remove: true })
      .createGraphics({ id: ownerId, type: "rect", length: 0 })
      .rematerializeBarMark({ id: ownerId })
      .createBoxMedian({
        id: medianId,
        owner: ownerId,
        data: summaryId,
        category: x.field,
        categoryType: x.fieldType,
        measure: BOX_FIELDS.median,
        coordinate: layer.coordinate,
        categoryScale: x.scale,
        measureScale: y.scale,
        stroke: config.median.stroke,
        strokeWidth: config.median.strokeWidth
      });
    if (hasOutliers) {
      next = next
        .createBoxOutliers({
          id: outlierId,
          data: outlierDataId,
          category: x.field,
          categoryType: x.fieldType,
          measure: y.field,
          coordinate: layer.coordinate,
          categoryScale: x.scale,
          measureScale: y.scale,
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
    if (
      x !== undefined &&
      y !== undefined &&
      (!["nominal", "ordinal", "temporal"].includes(x.fieldType) ||
        (y.fieldType ?? "quantitative") !== "quantitative")
    ) {
      throw new Error("createBoxPlot currently requires categorical x and quantitative y encodings.");
    }
    let next = this.createBarMark({ id, data })._withMarkConfig(id, {
      boxPlot: {
        factor: 1.5,
        width: 0.7,
        outliers: true,
        box: { fill: "#4c78a8", opacity: 1, stroke: "#4c78a8", strokeWidth: 1.5 },
        median: { stroke: "#1f2937", strokeWidth: 1.5 },
        outlier: { shape: "diamond", radius: 3, opacity: 0.75 }
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
