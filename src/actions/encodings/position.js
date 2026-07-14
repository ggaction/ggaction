import { action } from "../../core/action.js";
import { canMaterializeArea } from "../marks/materialization.js";
import { resolvePositionEncoding } from "./position/resolve.js";
import { findLayer } from "../../selectors/layers.js";
import {
  applyEncodingScale,
  rebindPositionGuides
} from "./shared.js";

function encodePosition(program, channel, args, operation) {
  const {
    target,
    layer,
    previous,
    requestedScale,
    field,
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

  if (layer.mark.type === "line" && channel === "y") {
    return next.rematerializeLineMark({ id: target });
  }

  if (layer.mark.type === "bar" && channel === "y") {
    return next.rematerializeBarMark({ id: target });
  }

  next = next.rematerializeScale({ id: scale.id });
  if (layer.mark.type === "area") {
    const updated = findLayer(next, target);
    return canMaterializeArea(next, updated)
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
