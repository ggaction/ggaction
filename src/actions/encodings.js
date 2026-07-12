import { action } from "../core/action.js";
import { validateUserId } from "../core/identifiers.js";
import { isPlainObject } from "../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  validateColorRange,
  validateFieldType,
  validateLinearScaleType,
  validateNominalFieldType,
  validateOrdinalDomain,
  validateOrdinalScaleType,
  validatePositionChannel,
  validateScaleDomain,
  validateScaleRange
} from "../core/scale.js";

const ENCODING_OPTIONS = Object.freeze([
  "field",
  "target",
  "fieldType",
  "scale"
]);
const SCALE_OPTIONS = Object.freeze(["id", "type", "domain", "range"]);

function validateOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function resolveTarget(program, target) {
  const id = validateUserId(target ?? program.context.currentMark, "Mark id");
  const layer = program.semanticSpec.layers.find(item => item.id === id);

  if (layer === undefined || layer.mark?.type !== "point") {
    throw new Error(`Unknown point mark "${id}".`);
  }

  const dataset = program.semanticSpec.datasets.find(item => item.id === layer.data);

  if (dataset === undefined) {
    throw new Error(`Point mark "${id}" requires an existing dataset.`);
  }

  if (program.graphicSpec.objects[id]?.type !== "circle") {
    throw new Error(`Point mark "${id}" requires circle graphics.`);
  }

  return { id, dataset };
}

function resolveScaleDefinition(program, channel, options) {
  if (!isPlainObject(options)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }

  validateOptions(options, SCALE_OPTIONS, "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = program.semanticSpec.scales.find(item => item.id === id);

  return {
    id,
    type: validateLinearScaleType(options.type ?? existing?.type ?? "linear"),
    domain: validateScaleDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateScaleRange(options.range ?? existing?.range ?? "auto")
  };
}

function resolveColorScaleDefinition(program, options) {
  if (!isPlainObject(options)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }

  validateOptions(options, SCALE_OPTIONS, "scale");
  const id = validateUserId(options.id ?? "color", "Scale id");
  const existing = program.semanticSpec.scales.find(item => item.id === id);

  return {
    id,
    type: validateOrdinalScaleType(
      options.type ?? existing?.type ?? "ordinal"
    ),
    domain: validateOrdinalDomain(
      options.domain ?? existing?.domain ?? "auto"
    ),
    range: validateColorRange(options.range ?? existing?.range ?? "auto")
  };
}

function encodePosition(program, channel, args, operation) {
  validateOptions(args, ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const fieldType = validateFieldType(args.fieldType ?? "quantitative");
  const { id: target, dataset } = resolveTarget(program, args.target);
  readQuantitativeField(dataset.values, args.field);
  const scale = resolveScaleDefinition(program, channel, args.scale ?? {});

  return program
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.field`,
      value: args.field
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.fieldType`,
      value: fieldType
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.scale`,
      value: scale.id
    })
    .createScale(scale)
    .rematerializeScale({ id: scale.id });
}

const encodeX = action(
  {
    op: "encodeX",
    description: "Encode a quantitative field as horizontal position."
  },
  function (args = {}) {
    return encodePosition(this, "x", args, "encodeX");
  }
);

const encodeY = action(
  {
    op: "encodeY",
    description: "Encode a quantitative field as vertical position."
  },
  function (args = {}) {
    return encodePosition(this, "y", args, "encodeY");
  }
);

const encodeColor = action(
  {
    op: "encodeColor",
    description: "Encode a nominal field as point color."
  },
  function (args = {}) {
    validateOptions(args, ENCODING_OPTIONS, "encodeColor");
    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
    const { id: target, dataset } = resolveTarget(this, args.target);
    readNominalField(dataset.values, args.field);
    const scale = resolveColorScaleDefinition(this, args.scale ?? {});

    return this
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
      .createScale(scale)
      .rematerializeScale({ id: scale.id });
  }
);

export function registerEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeX = encodeX;
  ProgramClass.prototype.encodeY = encodeY;
  ProgramClass.prototype.encodeColor = encodeColor;
}
