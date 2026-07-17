import { action } from "../../core/action.js";
import {
  canMaterializeArea,
  canMaterializeLine,
} from "../../materialization/marks.js";
import { resolveBarGrain } from "../../grammar/bars/policy.js";
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
  if (previous !== undefined) {
    const alternate = hasField ? "datum" : "field";
    if (Object.hasOwn(previous, alternate)) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.${channel}.${alternate}`,
        remove: true
      });
    }
  }
  next = next
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.${hasField ? "field" : "datum"}`,
      value: hasField ? field : datum
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.fieldType`,
      value: fieldType
    });

  if (layer.mark.type === "line" && channel === "y" && args.aggregate !== undefined) {
    next = next.editSemantic({
      property: `layer[${target}].encoding.y.aggregate`,
      value: aggregate
    });
  }

  if (layer.mark.type === "bar" && channel === "x" && bin !== undefined) {
    const [mode] = Object.keys(bin);
    const previousModes = Object.keys(layer.encoding?.x?.bin ?? {});
    for (const previousMode of previousModes) {
      if (previousMode === mode) continue;
      next = next.editSemantic({
        property: `layer[${target}].encoding.x.bin.${previousMode}`,
        remove: true
      });
    }
    next = next.editSemantic({
      property: `layer[${target}].encoding.x.bin.${mode}`,
      value: bin[mode]
    });
  }

  if (layer.mark.type === "bar") {
    if (aggregate !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.${channel}.aggregate`,
        value: aggregate
      });
    }
    if (stack !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.${channel}.stack`,
        value: stack
      });
    }
  }

  if (layer.mark.type === "area" && channel === "y" && stack !== undefined) {
    next = next.editSemantic({
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

  if (layer.mark.type === "line") {
    const updated = findLayer(next, target);
    return canMaterializeLine(next, updated)
      ? next.rematerializeLineMark({ id: target })
      : next.rematerializeScale({ id: scale.id });
  }

  if (layer.mark.type === "rule") {
    return next.rematerializeRuleMark({ id: target });
  }

  if (layer.mark.type === "bar") {
    const updated = findLayer(next, target);
    const pendingBox = next.markConfigs[target]?.boxPlot;
    if (pendingBox !== undefined && !pendingBox.materialized) {
      return updated.encoding?.x !== undefined && updated.encoding?.y !== undefined
        ? next.materializeBoxPlot({ id: target })
        : next;
    }
    const materialized = resolveBarGrain(updated) !== undefined
      ? next.rematerializeBarMark({ id: target })
      : next.rematerializeScale({ id: scale.id });
    return materialized;
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
