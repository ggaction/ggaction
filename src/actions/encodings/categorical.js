import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  readNominalField,
  validateColorRange,
  validateNominalFieldType,
  validateOrdinalDomain,
  validateOrdinalScaleType,
  validateStrokeDashRange
} from "../../grammar/scales.js";
import {
  rematerializeExistingLegend,
  resolveTarget,
  validateOptions
} from "./shared.js";

const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "layout"
]);
const STROKE_DASH_ENCODING_OPTIONS = COLOR_ENCODING_OPTIONS;
const ORDINAL_SCALE_OPTIONS = Object.freeze(["id", "type", "domain", "range"]);
const COLOR_SCALE_OPTIONS = Object.freeze([...ORDINAL_SCALE_OPTIONS, "palette"]);

function resolveColorScaleDefinition(program, options) {
  if (!isPlainObject(options)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }

  validateOptions(options, COLOR_SCALE_OPTIONS, "scale");
  if (options.palette !== undefined && options.range !== undefined) {
    throw new Error("Color scale cannot specify both palette and range.");
  }
  const id = validateUserId(options.id ?? "color", "Scale id");
  const existing = program.semanticSpec.scales.find(item => item.id === id);
  const requestedRange = options.palette === undefined
    ? options.range
    : { palette: options.palette };

  return {
    id,
    type: validateOrdinalScaleType(
      options.type ?? existing?.type ?? "ordinal"
    ),
    domain: validateOrdinalDomain(
      options.domain ?? existing?.domain ?? "auto"
    ),
    range: validateColorRange(requestedRange ?? existing?.range ?? "auto")
  };
}

function resolveStrokeDashScaleDefinition(program, options) {
  if (!isPlainObject(options)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }

  validateOptions(options, ORDINAL_SCALE_OPTIONS, "scale");
  const id = validateUserId(options.id ?? "strokeDash", "Scale id");
  const existing = program.semanticSpec.scales.find(item => item.id === id);

  return {
    id,
    type: validateOrdinalScaleType(
      options.type ?? existing?.type ?? "ordinal"
    ),
    domain: validateOrdinalDomain(
      options.domain ?? existing?.domain ?? "auto"
    ),
    range: validateStrokeDashRange(
      options.range ?? existing?.range ?? "auto"
    )
  };
}

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
      ["point", "line", "bar"],
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

    if (layer.mark.type === "bar") {
      if (isHistogram && args.layout !== undefined && args.layout !== "stack") {
        throw new Error('Histogram color layout must be "stack".');
      }
      if (isOrdinalMean && args.layout !== "group") {
        throw new Error('Ordinal mean bar color layout must be "group".');
      }
      if (!isHistogram && !isOrdinalMean) {
        throw new Error(
          "Bar color encoding requires a complete histogram encoding or a complete ordinal mean encoding."
        );
      }
    }
    readNominalField(dataset.values, args.field);
    const scale = resolveColorScaleDefinition(this, args.scale ?? {});

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
      })
      .createScale(scale);

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

    return next.rematerializeScale({ id: scale.id });
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
