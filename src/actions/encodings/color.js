import { action } from "../../core/action.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField,
  validateNominalFieldType
} from "../../grammar/scales.js";
import {
  BAR_GRAINS,
  inferBarColorLayout,
  resolveBarChannels,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { validateColorLayout } from "../../grammar/seriesLayout.js";
import {
  resolveColorScaleDefinition,
  resolveSequentialColorScaleDefinition
} from "../scales/definitions.js";
import {
  applyEncodingScale,
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateLineSeriesCompatibility,
  validateOptions
} from "./shared.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { planEncodingRematerialization } from "../../materialization/encodings.js";

const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "layout"
]);

function resolveColorLayout(layer, requested, barGrain) {
  const existing = layer.encoding?.color === undefined
    ? undefined
    : layer.encoding.color.layout ?? (
        layer.mark.type === "bar"
          ? inferBarColorLayout(layer)
          : layer.mark.type === "area"
            ? "overlay"
            : undefined
      );
  if (requested !== undefined) validateColorLayout(requested);
  if (existing !== undefined && requested !== undefined && requested !== existing) {
    throw new Error(
      `Color layout transition from "${existing}" to "${requested}" is not supported.`
    );
  }
  const layout = requested ?? existing ?? (
    layer.mark.type === "bar"
      ? barGrain === BAR_GRAINS.histogram ? "stack" : barGrain === BAR_GRAINS.ranged ? "overlay" : "group"
      : layer.mark.type === "area"
        ? "overlay"
        : undefined
  );

  if (["point", "line"].includes(layer.mark.type) && layout !== undefined) {
    throw new Error(`Color layout is not supported for ${layer.mark.type} marks.`);
  }
  if (layer.mark.type === "area" && layout === "group") {
    throw new Error('Area color layout does not support "group".');
  }
  if (
    layer.mark.type === "area" &&
    layer.encoding?.y2 !== undefined &&
    layout !== "overlay"
  ) {
    throw new Error('Ranged area color encoding supports only "overlay" layout.');
  }
  return layout;
}

function applyColorLayoutCompanion(
  program,
  { target, layer, layout, scale, field }
) {
  if (layout === undefined) return program;
  if (layer.mark.type === "bar" && resolveBarGrain(layer) === BAR_GRAINS.ranged) return program;
  if (layer.mark.type === "area" && layer.encoding?.y2 !== undefined) {
    return program;
  }
  const channels = layer.mark.type === "bar" ? resolveBarChannels(layer) : undefined;
  const measureChannel = channels?.measure ?? "y";
  const measure = layer.encoding?.[measureChannel];
  if (measure?.field === undefined || measure.scale === undefined) {
    throw new Error(`Color layout on mark "${target}" requires a measure encoding.`);
  }
  const stack = layout === "fill"
    ? "normalize"
    : layout === "overlay" || layout === "group"
      ? null
      : "zero";
  let next = program;
  if (layout === "group") {
    if (channels?.orientation === "horizontal") {
      throw new Error('Horizontal bars do not support color layout "group" until yOffset is available.');
    }
    next = next.encodeXOffset({
      field,
      target,
      scale: {
        ...(layer.encoding?.xOffset?.scale === undefined
          ? {}
          : { id: layer.encoding.xOffset.scale }),
        domain: scale.domain
      }
    });
  }
  return next[measureChannel === "x" ? "encodeX" : "encodeY"]({
    target,
    field: measure.field,
    fieldType: measure.fieldType,
    ...(measure.aggregate === undefined ? {} : { aggregate: measure.aggregate }),
    stack
  });
}

function encodeContinuousColor(program, args) {
  if (!["quantitative", "temporal"].includes(args.fieldType)) {
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
  const next = program
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
    .setSequentialScale(scale);
  return applyMaterializationPlan(
    next,
    planEncodingRematerialization(next, {
      target,
      channel: "color",
      scale: scale.id
    })
  );
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
      layer.mark.type === "area" &&
      (layer.encoding?.group?.field === undefined ||
        layer.encoding.group.field !== args.field)
    ) {
      throw new Error(
        "Area color encoding must match an existing group encoding."
      );
    }
    validateLineSeriesCompatibility(layer, "color", args.field);

    const barGrain = resolveBarGrain(layer);
    if (layer.mark.type === "bar" && barGrain === undefined) {
      throw new Error(
        "Bar color encoding requires a complete histogram encoding or a complete ordinal aggregate encoding."
      );
    }
    const layout = resolveColorLayout(layer, args.layout, barGrain);
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
    if (layout !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.color.layout`,
        value: layout
      });
    }
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: layer.encoding?.color?.scale === scale.id
    });
    next = applyColorLayoutCompanion(next, {
      target,
      layer,
      layout,
      scale,
      field: args.field
    });

    return applyMaterializationPlan(
      next,
      planEncodingRematerialization(next, {
        target,
        channel: "color",
        scale: scale.id
      })
    );
  }
);

export function registerColorEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeColor = encodeColor;
}
