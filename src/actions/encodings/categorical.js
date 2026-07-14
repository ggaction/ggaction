import { action } from "../../core/action.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import {
  normalizeStrokeDashPattern,
  readNominalField,
  readQuantitativeField,
  readTemporalField,
  validateNominalFieldType
} from "../../grammar/scales.js";
import {
  resolveColorScaleDefinition,
  resolveSequentialColorScaleDefinition,
  resolveStrokeDashScaleDefinition
} from "../scales/definitions.js";
import {
  applyEncodingScale,
  rematerializeExistingLegend,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateLineSeriesCompatibility,
  validateOptions
} from "./shared.js";
import { isAggregate } from "../../grammar/aggregate.js";

const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "layout"
]);
const STROKE_DASH_ENCODING_OPTIONS = Object.freeze([
  "field", "value", "target", "fieldType", "scale"
]);

function encodeContinuousColor(program, args) {
  if (![
    "quantitative", "temporal"
  ].includes(args.fieldType)) {
    throw new Error(`Unsupported color field type "${args.fieldType}".`);
  }
  if (args.layout !== undefined) {
    throw new Error("Continuous color does not support layout.");
  }
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point"],
    "continuous color point mark"
  );
  if (args.fieldType === "temporal") {
    readTemporalField(dataset.values, args.field);
  } else {
    readQuantitativeField(dataset.values, args.field);
  }
  const requestedScale = resolveReassignmentScaleOptions(
    layer.encoding?.color,
    args.scale ?? {}
  );
  const scale = resolveSequentialColorScaleDefinition(
    program,
    args.fieldType,
    requestedScale
  );
  let next = program
    .editSemantic({
      property: `layer[${target}].encoding.color.field`,
      value: args.field
    })
    .editSemantic({
      property: `layer[${target}].encoding.color.fieldType`,
      value: args.fieldType
    })
    .editSemantic({
      property: `layer[${target}].encoding.color.scale`,
      value: scale.id
    })
    .setSequentialScale(scale)
    .rematerializeScale({ id: scale.id })
    .rematerializePointMark({ id: target });
  return rematerializeExistingLegend(next);
}

const encodeColor = action(
  {
    op: "encodeColor",
    description: "Encode a field as graphical color."
  },
  function (args = {}) {
    validateOptions(args, COLOR_ENCODING_OPTIONS, "encodeColor");
    const requestedFieldType = args.fieldType ?? "nominal";
    if (requestedFieldType !== "nominal") {
      return encodeContinuousColor(this, {
        ...args,
        fieldType: requestedFieldType
      });
    }
    const fieldType = validateNominalFieldType(requestedFieldType);
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["point", "line", "bar", "area"],
      "color mark"
    );
    if (
      args.layout !== undefined &&
      args.layout !== "group" &&
      args.layout !== "stack"
    ) {
      throw new Error(`Unsupported color layout "${args.layout}".`);
    }
    if (layer.mark.type !== "bar" && args.layout !== undefined) {
      throw new Error("Color layout is supported only for bar marks.");
    }
    if (
      layer.mark.type === "area" &&
      (layer.encoding?.group?.field === undefined ||
        layer.encoding.group.field !== args.field)
    ) {
      throw new Error(
        "Area color encoding must match an existing group encoding."
      );
    }
    validateLineSeriesCompatibility(layer, "color", args.field);

    const isHistogram =
      layer.mark.type === "bar" &&
      layer.encoding?.x?.bin !== undefined &&
      layer.encoding?.y?.aggregate === "count" &&
      layer.encoding.y.stack === "zero";
    const isOrdinalAggregate =
      layer.mark.type === "bar" &&
      layer.encoding?.x?.fieldType === "ordinal" &&
      isAggregate(layer.encoding?.y?.aggregate) &&
      layer.encoding.y.stack === null;
    const layout = args.layout ?? (
      layer.encoding?.color === undefined
        ? undefined
        : isHistogram
          ? "stack"
          : isOrdinalAggregate
            ? "group"
            : undefined
    );

    if (layer.mark.type === "bar") {
      if (isHistogram && layout !== undefined && layout !== "stack") {
        throw new Error('Histogram color layout must be "stack".');
      }
      if (isOrdinalAggregate && layout !== "group") {
        throw new Error('Ordinal aggregate bar color layout must be "group".');
      }
      if (!isHistogram && !isOrdinalAggregate) {
        throw new Error(
          "Bar color encoding requires a complete histogram encoding or a complete ordinal aggregate encoding."
        );
      }
    }
    readNominalField(dataset.values, args.field);
    const requestedScale = resolveReassignmentScaleOptions(
      layer.encoding?.color,
      args.scale ?? {}
    );
    const scale = resolveColorScaleDefinition(this, requestedScale);

    let next = this
      .editSemantic({
        property: `layer[${target}].encoding.color.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.color.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.color.scale`,
        value: scale.id
      });
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: layer.encoding?.color?.scale === scale.id
    });

    if (isOrdinalAggregate) {
      next = next
        .editSemantic({
          property: `layer[${target}].encoding.y.stack`,
          value: null
        })
        .encodeXOffset({
          field: args.field,
          target,
          scale: {
            ...(layer.encoding?.xOffset?.scale === undefined
              ? {}
              : { id: layer.encoding.xOffset.scale }),
            domain: scale.domain
          }
        });
    }

    if (layer.mark.type === "line") {
      return rematerializeExistingLegend(
        next.rematerializeLineMark({ id: target })
      );
    }

    if (layer.mark.type === "bar") {
      return rematerializeExistingLegend(
        next.rematerializeBarMark({ id: target })
      );
    }

    if (layer.mark.type === "area") {
      const areaIds = next.semanticSpec.layers
        .filter(item =>
          item.mark?.type === "area" && item.encoding?.color?.scale === scale.id
        )
        .map(item => item.id);
      for (const id of areaIds) {
        next = next.rematerializeAreaMark({ id });
      }
      return rematerializeExistingLegend(next);
    }

    return rematerializeExistingLegend(
      next
        .rematerializeScale({ id: scale.id })
        .rematerializePointMark({ id: target })
    );
  }
);

const clearStrokeDashEncoding = action(
  {
    op: "clearStrokeDashEncoding",
    description: "Remove the current semantic stroke-dash assignment."
  },
  function ({ target } = {}) {
    const layer = this.semanticSpec.layers.find(item => item.id === target);
    if (layer?.encoding?.strokeDash === undefined) return this;
    const { strokeDash, ...encoding } = layer.encoding;
    void strokeDash;
    const layers = this.semanticSpec.layers.map(item =>
      item.id === target ? { ...item, encoding } : item
    );
    return this._clone({
      semanticSpec: cloneAndFreeze({ ...this.semanticSpec, layers })
    });
  }
);

function reconcileLegendAfterDashRemoval(program, target) {
  const config = program.guideConfigs.legend?.series;
  if (
    config?.target !== target ||
    !config.channels.includes("strokeDash")
  ) {
    return program;
  }
  const layer = program.semanticSpec.layers.find(item => item.id === target);
  const channels = config.channels.filter(
    channel => channel !== "strokeDash" && layer.encoding?.[channel]?.scale !== undefined
  );
  if (channels.length === 0) return program.removeCategoricalLegend();
  return program
    .editSemantic({
      property: "guide.legend.series.channels",
      value: channels
    })
    .rematerializeLegend();
}

const encodeStrokeDash = action(
  {
    op: "encodeStrokeDash",
    description: "Encode a nominal field as line stroke dash."
  },
  function (args = {}) {
    validateOptions(
      args,
      STROKE_DASH_ENCODING_OPTIONS,
      "encodeStrokeDash"
    );
    const hasField = Object.hasOwn(args, "field");
    const hasValue = Object.hasOwn(args, "value");
    if (hasField === hasValue) {
      throw new Error("encodeStrokeDash requires exactly one of field or value.");
    }
    if (hasValue && (args.fieldType !== undefined || args.scale !== undefined)) {
      throw new Error("Constant stroke dash does not accept fieldType or scale.");
    }
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["line"],
      "line mark"
    );
    if (hasValue) {
      normalizeStrokeDashPattern(args.value);
      let next = layer.encoding?.strokeDash === undefined
        ? this
        : this.clearStrokeDashEncoding({ target });
      next = next.editSemantic({
        property: `layer[${target}].encoding.strokeDash.datum`,
        value: args.value
      });
      next = reconcileLegendAfterDashRemoval(next, target);
      return next.rematerializeLineMark({ id: target });
    }

    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
    readNominalField(dataset.values, args.field);
    validateLineSeriesCompatibility(layer, "strokeDash", args.field);
    const previous = layer.encoding?.strokeDash;
    const requestedScale =
      previous?.field === args.field
        ? resolveReassignmentScaleOptions(previous, args.scale ?? {})
        : args.scale ?? {};
    const scale = resolveStrokeDashScaleDefinition(this, requestedScale);

    let next = previous === undefined
      ? this
      : this.clearStrokeDashEncoding({ target });
    next = next.editSemantic({
        property: `layer[${target}].encoding.strokeDash.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.strokeDash.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.strokeDash.scale`,
        value: scale.id
      });
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: previous?.scale === scale.id
    }).rematerializeLineMark({ id: target });

    return rematerializeExistingLegend(next);
  }
);

export function registerCategoricalEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeColor = encodeColor;
  ProgramClass.prototype.encodeStrokeDash = encodeStrokeDash;
  ProgramClass.prototype.clearStrokeDashEncoding = clearStrokeDashEncoding;
}
