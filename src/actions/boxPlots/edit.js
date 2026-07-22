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
import { findSemanticScale } from "../../selectors/scales.js";
import { resolvePositionScaleDefinition } from "../scales/definitions.js";
import {
  assertDistributionScaleHandoff,
  clearCartesianPositions,
  rebindDistributionGuides
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

function removeOwnedMark(program, id) {
  const selections = Object.entries(
    program.materializationConfigs.selections ?? {}
  ).filter(([, config]) => config.target === id).map(([selection]) => selection);
  let next = program;
  for (const [highlight, config] of Object.entries(
    program.materializationConfigs.highlights ?? {}
  )) {
    if (config.target === id || selections.includes(config.selection)) {
      next = next._withoutMaterializationConfig(["highlights", highlight]);
    }
  }
  for (const selection of selections) {
    next = next._withoutMaterializationConfig(["selections", selection]);
  }
  return next
    .editSemantic({ property: `layer[${id}]`, remove: true })
    .editGraphics({ target: id, remove: true })
    ._withoutMaterializationConfig(["marks", id])
    ._withContext({
      ...(program.context.currentMark === id ? { currentMark: undefined } : {}),
      ...(selections.includes(program.context.currentSelection)
        ? { currentSelection: undefined }
        : {})
    });
}

function currentBoxPositions(owner, current) {
  const categoryChannel = current.orientation === "vertical" ? "x" : "y";
  const measureChannel = current.orientation === "vertical" ? "y" : "x";
  const categoryEncoding = owner.encoding[categoryChannel];
  const measureEncoding = owner.encoding[measureChannel];
  return {
    x: current.orientation === "vertical"
      ? {
          field: current.category,
          fieldType: categoryEncoding.fieldType,
          scale: categoryEncoding.scale
        }
      : {
          field: current.measure,
          fieldType: "quantitative",
          scale: measureEncoding.scale
        },
    y: current.orientation === "vertical"
      ? {
          field: current.measure,
          fieldType: "quantitative",
          scale: measureEncoding.scale
        }
      : {
          field: current.category,
          fieldType: categoryEncoding.fieldType,
          scale: categoryEncoding.scale
        },
    categoryScale: categoryEncoding.scale,
    measureScale: measureEncoding.scale
  };
}

function requirePositionField(position, label) {
  if (typeof position.field !== "string" || position.field.length === 0) {
    throw new TypeError(`${label} field must be a non-empty string.`);
  }
  return { fieldType: position.fieldType ?? "quantitative", ...position };
}

function scalePlan(program, channel, fieldType, requested, fallback) {
  const options = requested === undefined
    ? { id: fallback }
    : typeof requested === "string"
      ? { id: requested }
      : { ...requested, id: requested.id ?? fallback };
  const existing = findSemanticScale(program, options.id);
  const definition = resolvePositionScaleDefinition(
    program,
    channel,
    fieldType,
    options,
    ["ordinal", "nominal"].includes(fieldType)
      ? { discreteType: "band" }
      : { nice: true, zero: false }
  );
  return {
    id: options.id,
    definition,
    create: existing === undefined,
    edit: existing !== undefined && typeof requested === "object" &&
      Object.keys(requested).some(key => key !== "id")
      ? options
      : undefined
  };
}

function roleCandidate(program, owner, current, args) {
  const previous = currentBoxPositions(owner, current);
  const x = requirePositionField(
    Object.hasOwn(args, "x")
      ? resolveBoxPosition(args.x, "x", "editBoxPlot")
      : previous.x,
    "editBoxPlot x"
  );
  const y = requirePositionField(
    Object.hasOwn(args, "y")
      ? resolveBoxPosition(args.y, "y", "editBoxPlot")
      : previous.y,
    "editBoxPlot y"
  );
  const orientation = resolveBoxOrientation(x, y);
  if (orientation === undefined) {
    throw new Error(
      "editBoxPlot requires one categorical axis and one quantitative axis."
    );
  }
  const xRoleScale = orientation === "vertical"
    ? previous.categoryScale
    : previous.measureScale;
  const yRoleScale = orientation === "vertical"
    ? previous.measureScale
    : previous.categoryScale;
  const xScale = scalePlan(program, "x", x.fieldType, x.scale, xRoleScale);
  const yScale = scalePlan(program, "y", y.fieldType, y.scale, yRoleScale);
  return {
    source: Object.hasOwn(args, "data")
      ? validateUserId(args.data, "Box-plot data id")
      : current.source,
    orientation,
    x: { ...x, scale: xScale.id },
    y: { ...y, scale: yScale.id },
    xScale,
    yScale,
    category: orientation === "vertical" ? x.field : y.field,
    categoryType: orientation === "vertical" ? x.fieldType : y.fieldType,
    measure: orientation === "vertical" ? y.field : x.field,
    previous
  };
}

function setPosition(program, id, channel, {
  field,
  fieldType,
  scale,
  title
}) {
  let next = program
    .editSemantic({
      property: `layer[${id}].encoding.${channel}.field`,
      value: field
    })
    .editSemantic({
      property: `layer[${id}].encoding.${channel}.fieldType`,
      value: fieldType
    })
    .editSemantic({
      property: `layer[${id}].encoding.${channel}.scale`,
      value: scale
    });
  if (title !== undefined) {
    next = next.editSemantic({
      property: `layer[${id}].encoding.${channel}.title`,
      value: title
    });
  }
  return next;
}

function setRange(program, id, channel, lower, upper, scale, title) {
  let next = setPosition(program, id, channel, {
    field: lower,
    fieldType: "quantitative",
    scale,
    title
  });
  return next
    .editSemantic({
      property: `layer[${id}].encoding.${channel}2.field`,
      value: upper
    })
    .editSemantic({
      property: `layer[${id}].encoding.${channel}2.fieldType`,
      value: "quantitative"
    })
    .editSemantic({
      property: `layer[${id}].encoding.${channel}2.scale`,
      value: scale
    });
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
  assertDistributionScaleHandoff(program, {
    owned,
    oldXScale: candidate.previous.x.scale,
    oldYScale: candidate.previous.y.scale,
    newXScale: candidate.xScale.id,
    newYScale: candidate.yScale.id
  });
  let next = program;
  for (const id of owned) next = clearCartesianPositions(next, id);
  for (const scale of [candidate.xScale, candidate.yScale]) {
    if (scale.create) next = next.createScale(scale.definition);
  }
  const category = candidate.orientation === "vertical" ? candidate.x : candidate.y;
  const measure = candidate.orientation === "vertical" ? candidate.y : candidate.x;
  const categoryChannel = candidate.orientation === "vertical" ? "x" : "y";
  const measureChannel = candidate.orientation === "vertical" ? "y" : "x";
  next = setPosition(next, owner.id, categoryChannel, {
    field: category.field,
    fieldType: category.fieldType,
    scale: category.scale
  });
  next = setRange(
    next,
    owner.id,
    measureChannel,
    BOX_FIELDS.q1,
    BOX_FIELDS.q3,
    measure.scale,
    candidate.measure
  );
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
  next = setPosition(next, current.whiskerId, categoryChannel, {
    field: category.field,
    fieldType: category.fieldType,
    scale: category.scale
  });
  next = setRange(
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
    next = setPosition(next, capId, categoryChannel, {
      field: category.field,
      fieldType: category.fieldType,
      scale: category.scale
    });
    next = setPosition(next, capId, measureChannel, {
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
  next = setPosition(next, current.medianId, categoryChannel, {
    field: category.field,
    fieldType: category.fieldType,
    scale: category.scale
  });
  next = setPosition(next, current.medianId, measureChannel, {
    field: BOX_FIELDS.median,
    fieldType: "quantitative",
    scale: measure.scale
  });
  if (hasOutliers && findLayer(next, current.outlierId) !== undefined) {
    next = setPosition(next, current.outlierId, categoryChannel, {
      field: category.field,
      fieldType: category.fieldType,
      scale: category.scale
    });
    next = setPosition(next, current.outlierId, measureChannel, {
      field: candidate.measure,
      fieldType: "quantitative",
      scale: measure.scale
    });
  }
  for (const id of new Set([candidate.xScale.id, candidate.yScale.id])) {
    next = next.rematerializeScale({ id, marks: false, guides: false });
  }
  next = rebindDistributionGuides(next, {
    oldXScale: candidate.previous.x.scale,
    oldYScale: candidate.previous.y.scale,
    newXScale: candidate.xScale.id,
    newYScale: candidate.yScale.id,
    oldXTitle: candidate.previous.x.field,
    oldYTitle: candidate.previous.y.field,
    newXTitle: candidate.x.field,
    newYTitle: candidate.y.field,
    oldMeasureChannel: current.orientation === "vertical" ? "y" : "x",
    newMeasureChannel: candidate.orientation === "vertical" ? "y" : "x"
  });
  for (const scale of [candidate.xScale, candidate.yScale]) {
    if (scale.edit !== undefined) next = next.editScale(scale.edit);
  }
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
    if (changesRoles) {
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
      applyEdit(this);
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
