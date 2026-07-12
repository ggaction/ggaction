import { action } from "../core/action.js";
import { getPositionCoordinateDefaults } from "../core/coordinate.js";
import { validateUserId } from "../core/identifiers.js";
import { isPlainObject } from "../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField,
  validateColorRange,
  validateFieldType,
  validateLinearScaleType,
  validateNominalFieldType,
  validateOrdinalDomain,
  validateOrdinalScaleType,
  validatePositionChannel,
  validateScaleDomain,
  validateScaleRange,
  validateTimeScaleType
} from "../core/scale.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field",
  "target",
  "fieldType",
  "scale",
  "coordinate"
]);
const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field",
  "target",
  "fieldType",
  "scale"
]);
const SCALE_OPTIONS = Object.freeze([
  "id",
  "type",
  "domain",
  "range",
  "nice",
  "zero"
]);
const RADIUS_OPTIONS = Object.freeze(["value", "target"]);

function validateOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function resolveTarget(
  program,
  target,
  supportedTypes = ["point", "line"],
  label = "position mark"
) {
  const id = validateUserId(target ?? program.context.currentMark, "Mark id");
  const layer = program.semanticSpec.layers.find(item => item.id === id);

  if (layer === undefined || !supportedTypes.includes(layer.mark?.type)) {
    throw new Error(`Unknown ${label} "${id}".`);
  }

  const dataset = program.semanticSpec.datasets.find(item => item.id === layer.data);

  if (dataset === undefined) {
    throw new Error(`Mark "${id}" requires an existing dataset.`);
  }

  const expectedGraphic = layer.mark.type === "point" ? "circle" : "path";

  if (program.graphicSpec.objects[id]?.type !== expectedGraphic) {
    throw new Error(`Mark "${id}" requires ${expectedGraphic} graphics.`);
  }

  return { id, dataset, layer };
}

function resolvePositionCoordinate(program, channel, layer, requestedId) {
  const defaults = getPositionCoordinateDefaults(channel);
  const existingId = layer.coordinate;

  if (requestedId !== undefined) {
    validateUserId(requestedId, "Coordinate id");
  }

  if (existingId !== undefined && requestedId !== undefined && existingId !== requestedId) {
    throw new Error(
      `Layer "${layer.id}" already uses coordinate "${existingId}".`
    );
  }

  const id = existingId ?? requestedId ?? defaults.id;
  const coordinate = program.semanticSpec.coordinates.find(item => item.id === id);

  if (coordinate !== undefined && coordinate.type !== defaults.type) {
    throw new Error(
      `${channel} encoding requires a ${defaults.type} coordinate, but "${id}" is ${coordinate.type}.`
    );
  }

  return { id, type: defaults.type };
}

function resolveScaleDefinition(program, channel, fieldType, options) {
  if (!isPlainObject(options)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }

  validateOptions(options, SCALE_OPTIONS, "scale");
  const id = validateUserId(options.id ?? channel, "Scale id");
  const existing = program.semanticSpec.scales.find(item => item.id === id);
  const expectedType = fieldType === "temporal" ? "time" : "linear";
  const type = options.type ?? existing?.type ?? expectedType;

  if (fieldType === "temporal") validateTimeScaleType(type);
  else validateLinearScaleType(type);

  if (options.nice !== undefined && typeof options.nice !== "boolean") {
    throw new TypeError("Scale nice must be a boolean.");
  }

  if (options.zero !== undefined && typeof options.zero !== "boolean") {
    throw new TypeError("Scale zero must be a boolean.");
  }

  if (fieldType === "temporal" && options.zero !== undefined) {
    throw new Error('Scale type "time" does not support zero.');
  }

  const scale = {
    id,
    type,
    domain: validateScaleDomain(options.domain ?? existing?.domain ?? "auto"),
    range: validateScaleRange(options.range ?? existing?.range ?? "auto")
  };

  const nice = options.nice ?? existing?.nice;
  const zero = options.zero ?? existing?.zero;

  if (nice !== undefined) scale.nice = nice;
  if (zero !== undefined) scale.zero = zero;

  return scale;
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
  validateOptions(args, POSITION_ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const fieldType = validateFieldType(args.fieldType ?? "quantitative");
  const { id: target, dataset, layer } = resolveTarget(program, args.target);

  if (layer.mark.type === "line" && (channel !== "x" || fieldType !== "temporal")) {
    throw new Error("Line position encoding currently supports temporal x only.");
  }

  if (layer.mark.type === "point" && fieldType !== "quantitative") {
    throw new Error("Point position encoding currently requires quantitative fields.");
  }

  if (fieldType === "temporal") {
    readTemporalField(dataset.values, args.field);
  } else {
    readQuantitativeField(dataset.values, args.field);
  }

  const scale = resolveScaleDefinition(
    program,
    channel,
    fieldType,
    args.scale ?? {}
  );
  const coordinate = resolvePositionCoordinate(
    program,
    channel,
    layer,
    args.coordinate
  );

  return program
    .createCoordinate({
      id: coordinate.id,
      type: coordinate.type,
      layers: [target]
    })
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
    validateOptions(args, COLOR_ENCODING_OPTIONS, "encodeColor");
    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
    const { id: target, dataset } = resolveTarget(
      this,
      args.target,
      ["point"],
      "point mark"
    );
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

const encodeRadius = action(
  {
    op: "encodeRadius",
    description: "Set a constant graphical radius on a point mark."
  },
  function (args = {}) {
    validateOptions(args, RADIUS_OPTIONS, "encodeRadius");
    const { id: target } = resolveTarget(
      this,
      args.target,
      ["point"],
      "point mark"
    );

    if (!Number.isFinite(args.value) || args.value < 0) {
      throw new RangeError(
        "encodeRadius requires a non-negative finite value."
      );
    }

    return this.editGraphics({
      target,
      property: "radius",
      value: args.value
    });
  }
);

export function registerEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeX = encodeX;
  ProgramClass.prototype.encodeY = encodeY;
  ProgramClass.prototype.encodeColor = encodeColor;
  ProgramClass.prototype.encodeRadius = encodeRadius;
}
