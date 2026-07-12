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
  validateStrokeDashRange,
  validateTimeScaleType
} from "../core/scale.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field",
  "target",
  "fieldType",
  "scale",
  "coordinate",
  "aggregate",
  "bin",
  "stack"
]);
const BIN_OPTIONS = Object.freeze(["maxBins"]);
const COLOR_ENCODING_OPTIONS = Object.freeze([
  "field",
  "target",
  "fieldType",
  "scale"
]);
const STROKE_DASH_ENCODING_OPTIONS = COLOR_ENCODING_OPTIONS;
const SCALE_OPTIONS = Object.freeze([
  "id",
  "type",
  "domain",
  "range",
  "nice",
  "zero"
]);
const ORDINAL_SCALE_OPTIONS = Object.freeze(["id", "type", "domain", "range"]);
const COLOR_SCALE_OPTIONS = Object.freeze([...ORDINAL_SCALE_OPTIONS, "palette"]);
const RADIUS_OPTIONS = Object.freeze(["value", "target"]);

function validateOptions(args, supported, operation) {
  for (const key of Object.keys(args)) {
    if (!supported.includes(key)) {
      throw new Error(`Unknown ${operation} option "${key}".`);
    }
  }
}

function rematerializeExistingLegend(program) {
  if (
    program.semanticSpec.guides.legend?.series === undefined ||
    program.guideConfigs.legend?.series === undefined
  ) {
    return program;
  }

  return program.rematerializeLegend();
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

  const expectedGraphic = {
    point: "circle",
    line: "path",
    bar: "rect"
  }[layer.mark.type];

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

function resolveScaleDefinition(
  program,
  channel,
  fieldType,
  options,
  defaults = {}
) {
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

  const nice = options.nice ?? existing?.nice ?? defaults.nice;
  const zero = options.zero ?? existing?.zero ?? defaults.zero;

  if (nice !== undefined) scale.nice = nice;
  if (zero !== undefined) scale.zero = zero;

  return scale;
}

function resolveBinDefinition(bin) {
  if (!isPlainObject(bin)) {
    throw new TypeError("Bar x bin must be a plain object.");
  }
  validateOptions(bin, BIN_OPTIONS, "bin");
  const maxBins = bin.maxBins ?? 10;

  if (!Number.isInteger(maxBins) || maxBins <= 0) {
    throw new TypeError("Histogram maxBins must be a positive integer.");
  }
  return { maxBins };
}

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

function encodePosition(program, channel, args, operation) {
  validateOptions(args, POSITION_ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const fieldType = validateFieldType(args.fieldType ?? "quantitative");
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point", "line", "bar"]
  );
  let bin;
  let aggregate;
  let stack;
  const field =
    layer.mark.type === "bar" && channel === "y" && args.field === undefined
      ? layer.encoding?.x?.field
      : args.field;

  if (layer.mark.type === "point") {
    if (fieldType !== "quantitative") {
      throw new Error("Point position encoding currently requires quantitative fields.");
    }
    if (args.aggregate !== undefined) {
      throw new Error("Point position encoding does not support aggregate.");
    }
    if (args.bin !== undefined) {
      throw new Error("Point position encoding does not support bin.");
    }
    if (args.stack !== undefined) {
      throw new Error("Point position encoding does not support stack.");
    }
  } else if (layer.mark.type === "line" && channel === "x") {
    if (fieldType !== "temporal") {
      throw new Error("Line x encoding currently requires a temporal field.");
    }
    if (args.aggregate !== undefined) {
      throw new Error("Line x encoding does not support aggregate.");
    }
    if (args.bin !== undefined) {
      throw new Error("Line x encoding does not support bin.");
    }
    if (args.stack !== undefined) {
      throw new Error("Line x encoding does not support stack.");
    }
  } else if (layer.mark.type === "line") {
    if (args.bin !== undefined) {
      throw new Error("Line y encoding does not support bin.");
    }
    if (fieldType !== "quantitative" || args.aggregate !== "mean") {
      throw new Error(
        'Line y encoding currently requires a quantitative field and aggregate "mean".'
      );
    }
    if (args.stack !== undefined) {
      throw new Error("Line y encoding does not support stack.");
    }
  } else if (channel === "x") {
    if (fieldType !== "quantitative") {
      throw new Error("Bar x encoding currently requires a quantitative field.");
    }
    if (args.aggregate !== undefined) {
      throw new Error("Bar x encoding does not support aggregate.");
    }
    if (args.bin === undefined) {
      throw new Error("Bar x encoding requires bin.");
    }
    if (args.stack !== undefined) {
      throw new Error("Bar x encoding does not support stack.");
    }
    bin = resolveBinDefinition(args.bin);
  } else {
    const xEncoding = layer.encoding?.x;

    if (xEncoding?.bin === undefined || xEncoding.field === undefined) {
      throw new Error("Bar y encoding requires a binned x encoding.");
    }
    if (fieldType !== "quantitative") {
      throw new Error("Bar y encoding currently requires a quantitative field.");
    }
    if (field !== xEncoding.field) {
      throw new Error("Bar y field must match the binned x field.");
    }
    if (args.bin !== undefined) {
      throw new Error("Bar y encoding does not support bin.");
    }
    aggregate = args.aggregate ?? "count";
    stack = args.stack ?? "zero";
    if (aggregate !== "count") {
      throw new Error('Bar y aggregate must be "count".');
    }
    if (stack !== "zero") {
      throw new Error('Bar y stack must be "zero".');
    }
  }

  if (fieldType === "temporal") {
    readTemporalField(dataset.values, field);
  } else {
    readQuantitativeField(dataset.values, field);
  }

  const scale = resolveScaleDefinition(
    program,
    channel,
    fieldType,
    args.scale ?? {},
    layer.mark.type === "bar"
      ? channel === "x"
        ? { nice: true, zero: false }
        : { nice: true, zero: true }
      : {}
  );
  const coordinate = resolvePositionCoordinate(
    program,
    channel,
    layer,
    args.coordinate
  );

  let next = program
    .createCoordinate({
      id: coordinate.id,
      type: coordinate.type,
      layers: [target]
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.field`,
      value: field
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.fieldType`,
      value: fieldType
    });

  if (layer.mark.type === "line" && channel === "y") {
    next = next.editSemantic({
      property: `layer[${target}].encoding.y.aggregate`,
      value: args.aggregate
    });
  }

  if (layer.mark.type === "bar" && channel === "x") {
    next = next.editSemantic({
      property: `layer[${target}].encoding.x.bin.maxBins`,
      value: bin.maxBins
    });
  }

  if (layer.mark.type === "bar" && channel === "y") {
    next = next
      .editSemantic({
        property: `layer[${target}].encoding.y.aggregate`,
        value: aggregate
      })
      .editSemantic({
        property: `layer[${target}].encoding.y.stack`,
        value: stack
      });
  }

  next = next
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.scale`,
      value: scale.id
    })
    .createScale(scale);

  if (layer.mark.type === "line" && channel === "y") {
    return next.rematerializeLineMark({ id: target });
  }

  return next.rematerializeScale({ id: scale.id });
}

const encodeX = action(
  {
    op: "encodeX",
    description: "Encode a field as horizontal position."
  },
  function (args = {}) {
    return encodePosition(this, "x", args, "encodeX");
  }
);

const encodeY = action(
  {
    op: "encodeY",
    description: "Encode a field as vertical position."
  },
  function (args = {}) {
    return encodePosition(this, "y", args, "encodeY");
  }
);

const encodeColor = action(
  {
    op: "encodeColor",
    description: "Encode a nominal field as graphical color."
  },
  function (args = {}) {
    validateOptions(args, COLOR_ENCODING_OPTIONS, "encodeColor");
    const fieldType = validateNominalFieldType(args.fieldType ?? "nominal");
    const { id: target, dataset, layer } = resolveTarget(this, args.target);
    readNominalField(dataset.values, args.field);
    const scale = resolveColorScaleDefinition(this, args.scale ?? {});

    const next = this
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

    if (layer.mark.type === "line") {
      return rematerializeExistingLegend(
        next.rematerializeLineMark({ id: target })
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
  ProgramClass.prototype.encodeStrokeDash = encodeStrokeDash;
  ProgramClass.prototype.encodeRadius = encodeRadius;
}
