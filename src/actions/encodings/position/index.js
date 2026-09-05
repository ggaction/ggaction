import { action } from "../../../core/action.js";
import {
  getPositionEncodingMaterializationSteps
} from "../../../materialization/marks/index.js";
import { resolvePositionEncoding } from "./resolve.js";
import { findLayer } from "../../../selectors/layers.js";
import { findSemanticScale } from "../../../selectors/scales.js";
import { applyPositionSemantics } from "./apply.js";
import {
  applyEncodingScale,
  applyDetachedScaleRematerialization,
  rebindPositionGuides
} from "../shared.js";

function encodePosition(program, channel, args, operation) {
  const {
    target,
    layer,
    previous,
    requestedScale,
    field,
    datum,
    hasField,
    fieldType,
    temporalUnit,
    scale,
    coordinate,
    bin,
    aggregate,
    stack,
    weight,
    companion
  } = resolvePositionEncoding(program, channel, args, operation);

  let next = program
    .createCoordinate({
      id: coordinate.id,
      type: coordinate.type,
      layers: [target]
    });
  next = applyPositionSemantics(next, {
    target,
    channel,
    layer,
    previous,
    field,
    datum,
    hasField,
    fieldType,
    temporalUnit,
    bin,
    aggregate,
    stack,
    weight
  });

  next = next.editSemantic({
      property: `layer[${target}].encoding.${channel}.scale`,
      value: scale.id
    });
  next = applyEncodingScale(next, scale, requestedScale, {
    reassignment: previous?.scale === scale.id
  });
  next = rebindPositionGuides(
    next,
    channel,
    previous?.scale,
    scale.id,
    target
  );

  if (companion !== undefined) {
    const encoding = companion.encoding;
    const storedScale = findSemanticScale(next, encoding.scale);
    next = next[companion.channel === "x" ? "encodeX" : "encodeY"]({
      target,
      field: encoding.field,
      fieldType: encoding.fieldType,
      aggregate: encoding.aggregate,
      stack: encoding.stack,
      scale: {
        id: encoding.scale,
        ...(storedScale?.zero === undefined ? { zero: encoding.stack !== null } : {})
      }
    });
  }

  if (layer.mark.type === "bar") {
    const updated = findLayer(next, target);
    const pendingBox = next.markConfigs[target]?.boxPlot;
    if (pendingBox !== undefined && !pendingBox.materialized) {
      const materialized = updated.encoding?.x !== undefined && updated.encoding?.y !== undefined
        ? next.materializeBoxPlot({ id: target })
        : next;
      return applyDetachedScaleRematerialization(materialized, [layer]);
    }
  }

  if (layer.mark.type === "rect") {
    const updated = findLayer(next, target);
    const pendingGradient = next.markConfigs[target]?.gradientPlot;
    if (pendingGradient !== undefined && !pendingGradient.materialized) {
      const materialized = updated.encoding?.x !== undefined && updated.encoding?.y !== undefined
        ? next.materializeGradientPlot({ id: target })
        : next;
      return applyDetachedScaleRematerialization(materialized, [layer]);
    }
  }

  const updated = findLayer(next, target);
  for (const step of getPositionEncodingMaterializationSteps(
    next,
    updated,
    scale.id
  )) {
    next = next[step.op](step.args);
  }
  return applyDetachedScaleRematerialization(next, [layer]);
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

const encodeTheta = action(
  {
    op: "encodeTheta",
    description: "Encode a field as Polar angle in clockwise degrees."
  },
  function (args = {}) {
    return encodePosition(this, "theta", args, "encodeTheta");
  }
);

const encodeR = action(
  {
    op: "encodeR",
    description: "Encode a quantitative field as Polar radius."
  },
  function (args = {}) {
    return encodePosition(this, "radius", args, "encodeR");
  }
);

export function registerCartesianPositionEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeX = encodeX;
  ProgramClass.prototype.encodeY = encodeY;
}

export function registerPositionEncodingActions(ProgramClass) {
  registerCartesianPositionEncodingActions(ProgramClass);
  ProgramClass.prototype.encodeTheta = encodeTheta;
  ProgramClass.prototype.encodeR = encodeR;
}
