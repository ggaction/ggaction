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
import { removeOwnedMark } from "../marks/remove.js";
import {
  resolveDistributionRoles,
  setCartesianPosition,
  setCartesianRange,
  updateDistributionPositions
} from "../distributions/revision.js";
import {
  resolveBoxAppearance,
  resolveBoxMedianAppearance,
  resolveBoxOutlierAppearance,
  resolveBoxPosition,
  resolveBoxWhisker,
  resolveBoxWidth
} from "./options.js";
import { resolveBoxOrientation } from "./resolve.js";

const OPTIONS = Object.freeze([
  "target", "data", "x", "y", "whisker", "width", "outliers", "box",
  "median", "outlier"
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

function roleCandidate(program, owner, current, args) {
  return {
    source: Object.hasOwn(args, "data")
      ? validateUserId(args.data, "Box-plot data id")
      : current.source,
    ...resolveDistributionRoles(program, owner, current, args, {
      operation: "editBoxPlot",
      resolvePosition: resolveBoxPosition,
      normalize: (x, y) => ({ x, y, orientation: resolveBoxOrientation(x, y) }),
      quantitativeDefaults: { nice: true, zero: false },
      defaultFieldType: true
    })
  };
}

function sameRoleCandidate(current, candidate) {
  return candidate.source === current.source &&
    candidate.orientation === current.orientation &&
    candidate.category === current.category &&
    candidate.measure === current.measure &&
    candidate.x.fieldType === candidate.previous.x.fieldType &&
    candidate.y.fieldType === candidate.previous.y.fieldType &&
    candidate.xScale.id === candidate.previous.x.scale &&
    candidate.yScale.id === candidate.previous.y.scale &&
    candidate.xScale.edit === undefined &&
    candidate.yScale.edit === undefined;
}

function updateBoxPositions(program, owner, current, candidate, {
  hasOutliers
}) {
  const whiskerConfig = program.markConfigs[current.whiskerId];
  const capIds = [
    whiskerConfig.errorBar.lowerCapId,
    whiskerConfig.errorBar.upperCapId
  ].filter(Boolean);
  const owned = [owner.id, current.whiskerId, ...capIds, current.medianId,
    ...(findLayer(program, current.outlierId) ? [current.outlierId] : [])];
  let next = updateDistributionPositions(
    program,
    owner,
    current,
    candidate,
    {
      owned,
      lower: BOX_FIELDS.q1,
      upper: BOX_FIELDS.q3,
      title: candidate.measure,
      update(next, { category, measure, categoryChannel, measureChannel }) {
        next = next._withMarkConfig(current.whiskerId, {
    ...whiskerConfig,
    errorBar: {
      ...whiskerConfig.errorBar,
      data: findLayer(next, current.whiskerId).data,
      orientation: candidate.orientation,
      positionField: candidate.category,
      positionFieldType: candidate.categoryType,
      coordinate: owner.coordinate,
      positionScale: category.scale,
      intervalScale: measure.scale
    }
        });
        next = setCartesianPosition(next, current.whiskerId, categoryChannel, {
    field: category.field,
    fieldType: category.fieldType,
    scale: category.scale
  });
        next = setCartesianRange(
    next,
    current.whiskerId,
    measureChannel,
    BOX_FIELDS.lowerWhisker,
    BOX_FIELDS.upperWhisker,
    measure.scale,
    candidate.measure
        );
        for (const [index, capId] of capIds.entries()) {
    const field = index === 0 ? BOX_FIELDS.lowerWhisker : BOX_FIELDS.upperWhisker;
    next = setCartesianPosition(next, capId, categoryChannel, {
      field: category.field,
      fieldType: category.fieldType,
      scale: category.scale
    });
    next = setCartesianPosition(next, capId, measureChannel, {
      field,
      fieldType: "quantitative",
      scale: measure.scale
    })._withMarkConfig(capId, {
      ...next.markConfigs[capId],
      fixedSpan: {
        ...next.markConfigs[capId].fixedSpan,
        orientation: candidate.orientation === "vertical"
          ? "horizontal"
          : "vertical"
      }
    });
        }
        next = setCartesianPosition(next, current.medianId, categoryChannel, {
    field: category.field,
    fieldType: category.fieldType,
    scale: category.scale
  });
        next = setCartesianPosition(next, current.medianId, measureChannel, {
    field: BOX_FIELDS.median,
    fieldType: "quantitative",
    scale: measure.scale
  });
        if (hasOutliers && findLayer(next, current.outlierId) !== undefined) {
    next = setCartesianPosition(next, current.outlierId, categoryChannel, {
      field: category.field,
      fieldType: category.fieldType,
      scale: category.scale
    });
    next = setCartesianPosition(next, current.outlierId, measureChannel, {
      field: candidate.measure,
      fieldType: "quantitative",
      scale: measure.scale
    });
        }
        return next;
      }
    }
  );
  next = next.rematerializeBarMark({ id: owner.id })
    .rematerializeErrorBar({ id: current.whiskerId });
  for (const capId of capIds) {
    next = next.materializeRuleSpan({
      id: capId,
      orientation: candidate.orientation === "vertical" ? "horizontal" : "vertical",
      size: whiskerConfig.errorBar.capSize
    });
  }
  next = next.rematerializeRuleMark({ id: current.medianId });
  if (hasOutliers && findLayer(next, current.outlierId) !== undefined) {
    next = next.rematerializePointMark({ id: current.outlierId });
  }
  return next;
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

    const candidate = roleCandidate(this, owner, current, args);
    const sourceDataset = findDataset(this, candidate.source);
    if (sourceDataset === undefined) {
      throw new Error(`Unknown box-plot data "${candidate.source}".`);
    }
    const roleRequested = ["data", "x", "y"].some(
      key => Object.hasOwn(args, key)
    );
    const changesRoles = !sameRoleCandidate(current, candidate);
    const revisesData = JSON.stringify(whisker) !== JSON.stringify(current.whisker) ||
      outliers !== current.outliers;
    if (changesRoles || revisesData) {
      const derived = deriveBoxData(
        sourceDataset.values,
        normalizeBoxTransform({
          type: "boxSummary",
          category: candidate.category,
          field: candidate.measure,
          whisker: whisker.type,
          ...(whisker.factor === undefined ? {} : { factor: whisker.factor })
        })
      );
      const hasOutliers = outliers && whisker.type === "tukey" &&
        derived.outliers.length > 0;
      const whiskerConfig = this.markConfigs[current.whiskerId];
      const capIds = [
        whiskerConfig.errorBar.lowerCapId,
        whiskerConfig.errorBar.upperCapId
      ].filter(Boolean);
      const summaryRevision = planDerivedDataRevision(this, {
        owner: owner.id,
        role: "SummaryData",
        previous: current.summaryId,
        consumers: [owner.id, current.whiskerId, ...capIds, current.medianId]
      });
      const hadOutlierLayer = findLayer(this, current.outlierId) !== undefined;
      const outlierRevision = hasOutliers
        ? planDerivedDataRevision(this, {
            owner: owner.id,
            role: "OutlierData",
            ...(current.outlierDataId === undefined
              ? {}
              : { previous: current.outlierDataId }),
            consumers: hadOutlierLayer ? [current.outlierId] : []
          })
        : undefined;
      const applyEdit = program => {
        let next = program.createBoxSummaryData({
          id: summaryRevision.id,
          source: candidate.source,
          category: candidate.category,
          field: candidate.measure,
          whisker: whisker.type,
          ...(whisker.factor === undefined ? {} : { factor: whisker.factor })
        });
        if (outlierRevision !== undefined) {
          next = next.createBoxOutlierData({
            id: outlierRevision.id,
            source: candidate.source,
            category: candidate.category,
            field: candidate.measure,
            whisker: whisker.type,
            factor: whisker.factor
          });
          for (const rebind of outlierRevision.rebinds) {
            next = next.rebindLayerData(rebind);
          }
        }
        for (const rebind of summaryRevision.rebinds) {
          next = next.rebindLayerData(rebind);
        }
        next = next._withMarkConfig(current.whiskerId, {
          ...next.markConfigs[current.whiskerId],
          errorBar: {
            ...next.markConfigs[current.whiskerId].errorBar,
            data: summaryRevision.id
          }
        });
        if (hadOutlierLayer && !hasOutliers) {
          next = removeOwnedMark(next, current.outlierId);
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
            source: candidate.source,
            orientation: candidate.orientation,
            category: candidate.category,
            measure: candidate.measure,
            summaryId: summaryRevision.id,
            outlierDataId: outlierRevision?.id
          },
          barWidth: { band: width },
          fill: box.fill,
          opacity: box.opacity,
          stroke: box.stroke,
          strokeWidth: box.strokeWidth
        });
        next = updateBoxPositions(next, owner, current, candidate, {
          outlierDataId: outlierRevision?.id,
          hasOutliers
        });
        if (!hadOutlierLayer && hasOutliers) {
          const category = candidate.orientation === "vertical"
            ? candidate.x
            : candidate.y;
          const measure = candidate.orientation === "vertical"
            ? candidate.y
            : candidate.x;
          next = next.createBoxOutliers({
            id: current.outlierId,
            data: outlierRevision.id,
            category: candidate.category,
            categoryType: candidate.categoryType,
            measure: candidate.measure,
            orientation: candidate.orientation,
            coordinate: owner.coordinate,
            categoryScale: category.scale,
            measureScale: measure.scale,
            shape: outlier.shape,
            radius: outlier.radius,
            opacity: outlier.opacity
          });
        }
        next = next
          .encodeStroke({ target: current.medianId, value: median.stroke })
          .encodeStrokeWidth({
            target: current.medianId,
            value: median.strokeWidth
          });
        if (findLayer(next, current.outlierId) !== undefined) {
          next = next
            .editPointMark({
              target: current.outlierId,
              shape: outlier.shape,
              opacity: outlier.opacity
            })
            .encodeRadius({ target: current.outlierId, value: outlier.radius });
        }
        next = next.releaseDerivedData(summaryRevision.release);
        if (current.outlierDataId !== undefined) {
          next = next.releaseDerivedData({ id: current.outlierDataId });
        }
        return next._withContext({
          currentMark: owner.id,
          currentData: candidate.source
        });
      };
      return applyEdit(this);
    }
    if (roleRequested && !OPTIONS.slice(4).some(
      key => Object.hasOwn(args, key)
    )) {
      return this._withContext({
        currentMark: owner.id,
        currentData: current.source
      });
    }

    const changesBox = Object.hasOwn(args, "box") || Object.hasOwn(args, "width");
    const changesMedian = Object.hasOwn(args, "median") || Object.hasOwn(args, "width");
    const changesOutlier = Object.hasOwn(args, "outlier");
    let next = this;

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
        summaryId: current.summaryId,
        outlierDataId: current.outlierDataId
      },
      barWidth: { band: width },
      fill: box.fill,
      opacity: box.opacity,
      stroke: box.stroke,
      strokeWidth: box.strokeWidth
    });

    if (changesBox) next = next.rematerializeBarMark({ id: owner.id });
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

    return next._withContext({ currentMark: owner.id, currentData: current.source });
  }
);
