import { action } from "../../../core/action.js";
import {
  getPositionEncodingMaterializationSteps
} from "../../../materialization/marks/index.js";
import { resolvePositionEncoding } from "./resolve.js";
import { findLayer } from "../../../selectors/layers.js";
import { applyPositionSemantics } from "./apply.js";
import {
  applyEncodingScale,
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
    scale,
    coordinate,
    bin,
    aggregate,
    stack
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
    previous,
    field,
    datum,
    hasField,
    fieldType,
    bin,
    aggregate,
    stack
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

  if (layer.mark.type === "bar") {
    const updated = findLayer(next, target);
    const pendingBox = next.markConfigs[target]?.boxPlot;
    if (pendingBox !== undefined && !pendingBox.materialized) {
      return updated.encoding?.x !== undefined && updated.encoding?.y !== undefined
        ? next.materializeBoxPlot({ id: target })
        : next;
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
  return next;
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

export function registerPositionEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeX = encodeX;
  ProgramClass.prototype.encodeY = encodeY;
  ProgramClass.prototype.encodeTheta = encodeTheta;
  ProgramClass.prototype.encodeR = encodeR;
}
