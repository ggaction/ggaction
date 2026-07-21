import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import {
  BOX_FIELDS,
  deriveBoxData,
  normalizeBoxTransform
} from "../../grammar/boxPlot.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { resolveBoxOrientation } from "./resolve.js";
import { resolvePlotGraphicPlacement } from
  "../../materialization/graphicHierarchy.js";

export const materializeBoxPlot = action(
  {
    op: "materializeBoxPlot",
    description: "Materialize a complete box-plot composite."
  },
  function ({ id } = {}) {
    const ownerId = validateUserId(id, "Box-plot id");
    const config = this.markConfigs[ownerId]?.boxPlot;
    const layer = findLayer(this, ownerId);
    if (config === undefined || layer?.mark?.type !== "bar") {
      throw new Error(`Unknown box plot "${ownerId}".`);
    }
    if (config.materialized) return this;
    const x = layer.encoding?.x;
    const y = layer.encoding?.y;
    if (x?.field === undefined || y?.field === undefined) return this;
    const orientation = resolveBoxOrientation(x, y);
    if (orientation === undefined) {
      throw new Error(
        "createBoxPlot requires one categorical axis and one quantitative axis."
      );
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
        measure: measure.field,
        summaryId,
        whiskerId,
        medianId,
        outlierId
      },
      barWidth: { band: config.width },
      fill: config.box.fill,
      opacity: config.box.opacity,
      stroke: config.box.stroke,
      strokeWidth: config.box.strokeWidth
    }).createBoxSummaryData({
      id: summaryId,
      source,
      category: category.field,
      field: measure.field,
      whisker: config.whisker.type,
      ...(config.whisker.factor === undefined
        ? {}
        : { factor: config.whisker.factor })
    });
    const sourceRows = findDataset(next, source).values;
    const hasOutliers = config.outliers &&
      config.whisker.type === "tukey" &&
      deriveBoxData(sourceRows, normalizeBoxTransform({
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
    next = next.editSemantic({
      property: `layer[${ownerId}].data`,
      value: summaryId
    });
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
            x: {
              field: category.field,
              fieldType: category.fieldType,
              scale: { id: category.scale }
            },
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
            y: {
              field: category.field,
              fieldType: category.fieldType,
              scale: { id: category.scale }
            }
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
      .createGraphics({
        id: ownerId,
        type: "rect",
        length: 0,
        ...resolvePlotGraphicPlacement(next)
      })
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
      next = next.createBoxOutliers({
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
    next = next._withMarkConfig(ownerId, {
      ...next.markConfigs[ownerId],
      boxPlot: {
        ...next.markConfigs[ownerId].boxPlot,
        outlierDataId: hasOutliers ? outlierDataId : undefined
      }
    });
    if (config.guides !== false) {
      next = next.createGuides(config.guides);
    }
    return next._withContext({ currentMark: ownerId, currentData: source });
  }
);
