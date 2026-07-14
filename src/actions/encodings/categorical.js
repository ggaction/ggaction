import { action } from "../../core/action.js";
import {
  readNominalField,
  validateNominalFieldType
} from "../../grammar/scales.js";
import {
  resolveColorScaleDefinition,
  resolveStrokeDashScaleDefinition
} from "../scales/definitions.js";
import {
  applyEncodingScale,
  rematerializeExistingLegend,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateOptions
} from "./shared.js";

const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "layout"
]);
const STROKE_DASH_ENCODING_OPTIONS = COLOR_ENCODING_OPTIONS;
const encodeColor = action(
  {
    op: "encodeColor",
    description: "Encode a nominal field as graphical color."
  },
  function (args = {}) {
    validateOptions(args, COLOR_ENCODING_OPTIONS, "encodeColor");
    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
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

    const isHistogram =
      layer.mark.type === "bar" &&
      layer.encoding?.x?.bin !== undefined &&
      layer.encoding?.y?.aggregate === "count" &&
      layer.encoding.y.stack === "zero";
    const isOrdinalMean =
      layer.mark.type === "bar" &&
      layer.encoding?.x?.fieldType === "ordinal" &&
      layer.encoding?.y?.aggregate === "mean" &&
      layer.encoding.y.stack === null;
    const layout = args.layout ?? (
      layer.encoding?.color === undefined
        ? undefined
        : isHistogram
          ? "stack"
          : isOrdinalMean
            ? "group"
            : undefined
    );

    if (layer.mark.type === "bar") {
      if (isHistogram && layout !== undefined && layout !== "stack") {
        throw new Error('Histogram color layout must be "stack".');
      }
      if (isOrdinalMean && layout !== "group") {
        throw new Error('Ordinal mean bar color layout must be "group".');
      }
      if (!isHistogram && !isOrdinalMean) {
        throw new Error(
          "Bar color encoding requires a complete histogram encoding or a complete ordinal mean encoding."
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

    if (isOrdinalMean) {
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
    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
    const { id: target, dataset } = resolveTarget(
      this,
      args.target,
      ["line"],
      "line mark"
    );
    readNominalField(dataset.values, args.field);
    const scale = resolveStrokeDashScaleDefinition(this, args.scale ?? {});

    const next = this
      .editSemantic({
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
      })
      .createScale(scale)
      .rematerializeLineMark({ id: target });

    return rematerializeExistingLegend(next);
  }
);

export function registerCategoricalEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeColor = encodeColor;
  ProgramClass.prototype.encodeStrokeDash = encodeStrokeDash;
}
