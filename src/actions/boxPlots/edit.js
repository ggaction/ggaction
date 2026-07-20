import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { BOX_FIELDS, deriveBoxData, normalizeBoxTransform } from
  "../../grammar/boxPlot.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import {
  resolveBoxAppearance,
  resolveBoxMedianAppearance,
  resolveBoxOutlierAppearance,
  resolveBoxWhisker,
  resolveBoxWidth
} from "./options.js";

const OPTIONS = Object.freeze([
  "target", "whisker", "width", "outliers", "box", "median", "outlier"
]);

function resolveBoxOwner(program, requested) {
  const eligible = program.semanticSpec.layers.filter(
    layer => program.markConfigs[layer.id]?.boxPlot?.materialized === true
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Box-plot owner id");
    const layer = findLayer(program, id);
    if (layer === undefined || !eligible.includes(layer)) {
      throw new Error(`Unknown box-plot owner "${id}".`);
    }
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && eligible.includes(current)) return current;
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) throw new Error("No box-plot owner is available.");
  throw new Error("Box-plot owner is ambiguous; provide target.");
}

function requirePatch(value, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`editBoxPlot ${label} must be a plain object.`);
  }
  return value;
}

function resolveEditedWhisker(current, value) {
  if (value === undefined) return current;
  const patch = requirePatch(value, "whisker");
  validateKeys(patch, ["type", "factor"], "editBoxPlot whisker");
  const type = patch.type ?? current.type;
  const candidate = type === "minmax"
    ? { type, ...(Object.hasOwn(patch, "factor") ? { factor: patch.factor } : {}) }
    : {
        type,
        factor: Object.hasOwn(patch, "factor")
          ? patch.factor
          : current.type === "tukey" ? current.factor : 1.5
      };
  return resolveBoxWhisker(candidate, "editBoxPlot");
}

function removeOwnedMark(program, id) {
  return program
    .editSemantic({ property: `layer[${id}]`, remove: true })
    .editGraphics({ target: id, remove: true })
    ._withoutMaterializationConfig(["marks", id]);
}

export const editBoxPlot = action(
  {
    op: "editBoxPlot",
    description: "Revise one box plot and its owned components."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "editBoxPlot");
    if (!OPTIONS.slice(1).some(key => Object.hasOwn(args, key))) {
      throw new Error("editBoxPlot requires at least one box-plot option.");
    }
    const owner = resolveBoxOwner(this, args.target);
    const current = this.markConfigs[owner.id].boxPlot;
    const whisker = resolveEditedWhisker(current.whisker, args.whisker);
    const width = Object.hasOwn(args, "width")
      ? resolveBoxWidth(args.width, "editBoxPlot")
      : current.width;
    if (Object.hasOwn(args, "outliers") && typeof args.outliers !== "boolean") {
      throw new TypeError("editBoxPlot outliers must be a boolean.");
    }
    const outliers = args.outliers ?? current.outliers;
    const boxPatch = Object.hasOwn(args, "box")
      ? requirePatch(args.box, "box")
      : {};
    const medianPatch = Object.hasOwn(args, "median")
      ? requirePatch(args.median, "median")
      : {};
    const outlierPatch = Object.hasOwn(args, "outlier")
      ? requirePatch(args.outlier, "outlier")
      : {};
    const box = resolveBoxAppearance(
      { ...current.box, ...boxPatch },
      "editBoxPlot"
    );
    const median = resolveBoxMedianAppearance(
      { ...current.median, ...medianPatch },
      "editBoxPlot"
    );
    const outlier = resolveBoxOutlierAppearance(
      { ...current.outlier, ...outlierPatch },
      "editBoxPlot"
    );
    if (Object.hasOwn(boxPatch, "fill") && owner.encoding?.color !== undefined) {
      throw new Error(
        "editBoxPlot box.fill cannot be combined with a color encoding."
      );
    }

    const revisesData = JSON.stringify(whisker) !== JSON.stringify(current.whisker) ||
      outliers !== current.outliers;
    const changesBox = Object.hasOwn(args, "box") ||
      Object.hasOwn(args, "width") || revisesData;
    const changesMedian = Object.hasOwn(args, "median") ||
      Object.hasOwn(args, "width") || revisesData;
    const changesOutlier = Object.hasOwn(args, "outlier") || revisesData;
    const categoryEncoding = current.orientation === "vertical"
      ? owner.encoding.x
      : owner.encoding.y;
    const measureEncoding = current.orientation === "vertical"
      ? owner.encoding.y
      : owner.encoding.x;
    let summaryId = current.summaryId;
    let outlierDataId = current.outlierDataId;
    let next = this;

    const sourceRows = findDataset(this, current.source).values;
    const derived = deriveBoxData(sourceRows, normalizeBoxTransform({
      type: "boxSummary",
      category: current.category,
      field: current.measure,
      whisker: whisker.type,
      ...(whisker.factor === undefined ? {} : { factor: whisker.factor })
    }));
    const hasOutliers = outliers && whisker.type === "tukey" &&
      derived.outliers.length > 0;

    if (revisesData) {
      const whiskerConfig = next.markConfigs[current.whiskerId];
      const capIds = [
        whiskerConfig.errorBar.lowerCapId,
        whiskerConfig.errorBar.upperCapId
      ].filter(id => id !== undefined);
      const summaryRevision = planDerivedDataRevision(this, {
        owner: owner.id,
        role: "SummaryData",
        previous: current.summaryId,
        consumers: [owner.id, current.whiskerId, ...capIds, current.medianId]
      });
      summaryId = summaryRevision.id;
      next = next.createBoxSummaryData({
        id: summaryId,
        source: current.source,
        category: current.category,
        field: current.measure,
        whisker: whisker.type,
        ...(whisker.factor === undefined ? {} : { factor: whisker.factor })
      });
      if (hasOutliers) {
        const hadOutlierLayer = findLayer(next, current.outlierId) !== undefined;
        const outlierRevision = planDerivedDataRevision(this, {
          owner: owner.id,
          role: "OutlierData",
          ...(current.outlierDataId === undefined
            ? {}
            : { previous: current.outlierDataId }),
          consumers: hadOutlierLayer ? [current.outlierId] : []
        });
        outlierDataId = outlierRevision.id;
        next = next.createBoxOutlierData({
          id: outlierDataId,
          source: current.source,
          category: current.category,
          field: current.measure,
          whisker: whisker.type,
          factor: whisker.factor
        });
        for (const rebind of outlierRevision.rebinds) {
          next = next.rebindLayerData(rebind);
        }
      } else {
        outlierDataId = undefined;
      }

      for (const rebind of summaryRevision.rebinds) {
        next = next.rebindLayerData(rebind);
      }
      next = next._withMarkConfig(current.whiskerId, {
          ...whiskerConfig,
          errorBar: { ...whiskerConfig.errorBar, data: summaryId }
        });

      const hadOutlierLayer = findLayer(next, current.outlierId) !== undefined;
      if (hadOutlierLayer && !hasOutliers) {
        next = removeOwnedMark(next, current.outlierId);
      } else if (!hadOutlierLayer && hasOutliers) {
        next = next.createBoxOutliers({
          id: current.outlierId,
          data: outlierDataId,
          category: current.category,
          categoryType: categoryEncoding.fieldType,
          measure: current.measure,
          orientation: current.orientation,
          coordinate: owner.coordinate,
          categoryScale: categoryEncoding.scale,
          measureScale: measureEncoding.scale,
          shape: outlier.shape,
          radius: outlier.radius,
          opacity: outlier.opacity
        });
      }
    }

    next = next._withMarkConfig(owner.id, {
      ...next.markConfigs[owner.id],
      boxPlot: {
        ...current,
        whisker,
        width,
        outliers,
        box,
        median,
        outlier,
        summaryId,
        outlierDataId
      },
      barWidth: { band: width },
      fill: box.fill,
      opacity: box.opacity,
      stroke: box.stroke,
      strokeWidth: box.strokeWidth
    });

    if (changesBox) next = next.rematerializeBarMark({ id: owner.id });
    if (revisesData) {
      next = next.rematerializeErrorBar({ id: current.whiskerId });
    }
    if (changesMedian) {
      next = next
        .encodeStroke({ target: current.medianId, value: median.stroke })
        .encodeStrokeWidth({
          target: current.medianId,
          value: median.strokeWidth
        });
    }
    if (findLayer(next, current.outlierId) !== undefined && changesOutlier) {
      next = next
        .editPointMark({
          target: current.outlierId,
          shape: outlier.shape,
          opacity: outlier.opacity
        })
        .encodeRadius({ target: current.outlierId, value: outlier.radius });
    }

    if (revisesData) {
      next = next.releaseDerivedData({ id: current.summaryId });
      if (current.outlierDataId !== undefined) {
        next = next.releaseDerivedData({ id: current.outlierDataId });
      }
    }
    return next._withContext({ currentMark: owner.id, currentData: current.source });
  }
);
