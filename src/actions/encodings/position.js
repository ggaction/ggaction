import { action } from "../../core/action.js";
import { getPositionCoordinateDefaults } from "../../grammar/coordinates.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  readQuantitativeField,
  readNominalField,
  readTemporalField,
  validateOrdinalDomain,
  validateOrdinalScaleType,
  validateFieldType,
  validateLinearScaleType,
  validatePositionChannel,
  validateScaleDomain,
  validateScaleRange,
  validateTimeScaleType
} from "../../grammar/scales.js";
import { resolveTarget, validateOptions } from "./shared.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "coordinate", "aggregate", "bin", "stack"
]);
const BIN_OPTIONS = Object.freeze(["maxBins"]);
const SCALE_OPTIONS = Object.freeze(["id", "type", "domain", "range", "nice", "zero"]);

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
  const expectedType = fieldType === "temporal"
    ? "time"
    : fieldType === "ordinal"
      ? "ordinal"
      : "linear";
  const type = options.type ?? existing?.type ?? expectedType;

  if (fieldType === "temporal") validateTimeScaleType(type);
  else if (fieldType === "ordinal") validateOrdinalScaleType(type);
  else validateLinearScaleType(type);

  if (options.nice !== undefined && typeof options.nice !== "boolean") {
    throw new TypeError("Scale nice must be a boolean.");
  }

  if (options.zero !== undefined && typeof options.zero !== "boolean") {
    throw new TypeError("Scale zero must be a boolean.");
  }

  if (type !== "linear" && options.zero !== undefined) {
    throw new Error(`Scale type "${type}" does not support zero.`);
  }
  if (type === "ordinal" && options.nice !== undefined) {
    throw new Error('Scale type "ordinal" does not support nice.');
  }

  const scale = {
    id,
    type,
    domain: fieldType === "ordinal"
      ? validateOrdinalDomain(options.domain ?? existing?.domain ?? "auto")
      : validateScaleDomain(options.domain ?? existing?.domain ?? "auto"),
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

function encodePosition(program, channel, args, operation) {
  validateOptions(args, POSITION_ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const fieldType = validateFieldType(args.fieldType ?? "quantitative");
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point", "line", "bar", "area"]
  );
  let bin;
  let aggregate;
  let stack;
  const xEncoding = layer.encoding?.x;
  const field =
    layer.mark.type === "bar" &&
    channel === "y" &&
    xEncoding?.bin !== undefined &&
    args.field === undefined
      ? xEncoding.field
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
  } else if (layer.mark.type === "area") {
    if (fieldType !== "quantitative") {
      throw new Error("Area position encoding requires quantitative fields.");
    }
    if (args.aggregate !== undefined || args.bin !== undefined || args.stack !== undefined) {
      throw new Error("Area position encoding does not support aggregate, bin, or stack.");
    }
  } else if (layer.mark.type === "line" && channel === "x") {
    const isRegression = dataset.transform?.some(item => item.type === "regression");
    if (fieldType !== "temporal" && !(isRegression && fieldType === "quantitative")) {
      throw new Error(
        "Line x encoding requires a temporal field or regression quantitative field."
      );
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
    const isRegression = dataset.transform?.some(item => item.type === "regression");
    if (fieldType !== "quantitative") {
      throw new Error(
        isRegression
          ? "Regression line y encoding requires a quantitative field."
          : 'Line y encoding currently requires a quantitative field and aggregate "mean".'
      );
    }
    if (
      (!isRegression && args.aggregate !== "mean") ||
      (isRegression && args.aggregate !== undefined)
    ) {
      throw new Error(
        isRegression
          ? "Regression line y encoding does not support aggregate."
          : 'Line y encoding currently requires a quantitative field and aggregate "mean".'
      );
    }
    if (args.stack !== undefined) {
      throw new Error("Line y encoding does not support stack.");
    }
  } else if (channel === "x") {
    if (args.aggregate !== undefined) {
      throw new Error("Bar x encoding does not support aggregate.");
    }
    if (args.stack !== undefined) {
      throw new Error("Bar x encoding does not support stack.");
    }
    if (fieldType === "ordinal") {
      if (args.bin !== undefined) {
        throw new Error("Ordinal bar x encoding does not support bin.");
      }
    } else if (fieldType === "quantitative") {
      if (args.bin === undefined) {
        throw new Error("Quantitative bar x encoding requires bin.");
      }
      bin = resolveBinDefinition(args.bin);
    } else {
      throw new Error(
        "Bar x encoding requires a quantitative field with bin or an ordinal field."
      );
    }
  } else {
    if (xEncoding?.field === undefined || xEncoding.scale === undefined) {
      throw new Error(
        "Bar y encoding requires a binned x encoding or ordinal x encoding."
      );
    }
    if (fieldType !== "quantitative") {
      throw new Error("Bar y encoding currently requires a quantitative field.");
    }
    if (args.bin !== undefined) {
      throw new Error("Bar y encoding does not support bin.");
    }

    if (xEncoding.bin !== undefined) {
      if (field !== xEncoding.field) {
        throw new Error("Bar y field must match the binned x field.");
      }
      aggregate = args.aggregate ?? "count";
      stack = args.stack ?? "zero";
      if (aggregate !== "count") {
        throw new Error('Histogram bar y aggregate must be "count".');
      }
      if (stack !== "zero") {
        throw new Error('Histogram bar y stack must be "zero".');
      }
    } else if (xEncoding.fieldType === "ordinal") {
      aggregate = args.aggregate ?? "mean";
      stack = Object.hasOwn(args, "stack") ? args.stack : null;
      if (aggregate !== "mean") {
        throw new Error('Ordinal bar y aggregate must be "mean".');
      }
      if (stack !== null) {
        throw new Error("Ordinal bar y stack must be null.");
      }
    } else {
      throw new Error(
        "Bar y encoding requires a binned quantitative or ordinal x encoding."
      );
    }
  }

  if (fieldType === "temporal") {
    readTemporalField(dataset.values, field);
  } else if (fieldType === "ordinal") {
    readNominalField(dataset.values, field);
  } else {
    readQuantitativeField(dataset.values, field);
  }

  const scale = resolveScaleDefinition(
    program,
    channel,
    fieldType,
    Object.hasOwn(args, "scale") ? args.scale : {},
    layer.mark.type === "bar" && fieldType !== "ordinal"
      ? channel === "x" || stack === null
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

  if (layer.mark.type === "line" && channel === "y" && args.aggregate !== undefined) {
    next = next.editSemantic({
      property: `layer[${target}].encoding.y.aggregate`,
      value: args.aggregate
    });
  }

  if (layer.mark.type === "bar" && channel === "x" && bin !== undefined) {
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

  if (layer.mark.type === "bar" && channel === "y") {
    return next.rematerializeBarMark({ id: target });
  }

  next = next.rematerializeScale({ id: scale.id });
  if (layer.mark.type === "area") {
    const updated = next.semanticSpec.layers.find(item => item.id === target);
    const updatedDataset = next.semanticSpec.datasets.find(
      item => item.id === updated.data
    );
    const isDensity = updatedDataset?.transform?.length === 1 &&
      updatedDataset.transform[0].type === "density";
    const densityGroup = updatedDataset?.transform?.[0]?.groupBy;
    const isCompleteDensity = isDensity && (
      densityGroup === undefined || updated.encoding?.group?.field === densityGroup
    );
    return (
      updated.encoding?.x?.scale !== undefined &&
      updated.encoding?.y?.scale !== undefined &&
      (isCompleteDensity || updated.encoding?.y2?.scale === updated.encoding.y.scale)
    )
      ? next.rematerializeAreaMark({ id: target })
      : next;
  }
  return layer.mark.type === "point"
    ? next.rematerializePointMark({ id: target })
    : next;
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

export function registerPositionEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeX = encodeX;
  ProgramClass.prototype.encodeY = encodeY;
}
