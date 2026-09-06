import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { normalizePositionScaleChannel } from "../../core/vocabulary.js";
import { findLayer } from "../../selectors/layers.js";
import { requireSemanticScale } from "../../selectors/scales.js";
import { findScaleConsumers } from "./consumers/index.js";

const DEFINITIONS = Object.freeze({
  editXScale: Object.freeze({
    channel: "x",
    options: Object.freeze([
      "type", "domain", "range", "nice", "zero", "clamp", "reverse",
      "base", "exponent", "constant", "paddingInner", "paddingOuter",
      "padding", "align", "unknown"
    ])
  }),
  editYScale: Object.freeze({
    channel: "y",
    options: Object.freeze([
      "type", "domain", "range", "nice", "zero", "clamp", "reverse",
      "base", "exponent", "constant", "paddingInner", "paddingOuter",
      "padding", "align", "unknown"
    ])
  }),
  editThetaScale: Object.freeze({
    channel: "theta",
    options: Object.freeze([
      "type", "domain", "range", "nice", "zero", "clamp", "reverse",
      "paddingInner", "paddingOuter", "padding", "align"
    ])
  }),
  editRScale: Object.freeze({
    channel: "radius",
    options: Object.freeze([
      "type", "domain", "range", "nice", "zero", "clamp", "reverse",
      "base", "exponent", "constant", "radialMapping"
    ])
  }),
  editColorScale: Object.freeze({
    channel: "color",
    options: Object.freeze([
      "type", "domain", "range", "clamp", "reverse", "palette",
      "interpolate", "midpoint", "unknown"
    ])
  }),
  editSizeScale: Object.freeze({
    channel: "size",
    options: Object.freeze(["type", "domain", "range", "unknown"])
  }),
  editOpacityScale: Object.freeze({
    channel: "opacity",
    options: Object.freeze([
      "type", "domain", "range", "nice", "zero", "clamp", "reverse", "unknown"
    ])
  }),
  editShapeScale: Object.freeze({
    channel: "shape",
    options: Object.freeze(["type", "domain", "range", "unknown"])
  }),
  editStrokeWidthScale: Object.freeze({
    channel: "strokeWidth",
    options: Object.freeze([
      "type", "domain", "range", "nice", "zero", "clamp", "reverse",
      "base", "exponent", "constant"
    ])
  }),
  editStrokeDashScale: Object.freeze({
    channel: "strokeDash",
    options: Object.freeze(["type", "domain", "range"])
  })
});

function scaleIdsForLayer(program, layer, channel) {
  if (layer === undefined) return [];
  return [...new Set(allConsumers(program)
    .filter(consumer =>
      consumer.layer.id === layer.id &&
      normalizePositionScaleChannel(consumer.channel) === channel
    )
    .map(consumer => consumer.encoding.scale))];
}

function allConsumers(program) {
  return program.semanticSpec.scales.flatMap(scale =>
    findScaleConsumers(program, scale.id)
  );
}

function channelScaleIds(program, channel) {
  return [...new Set(allConsumers(program)
    .filter(consumer => normalizePositionScaleChannel(consumer.channel) === channel)
    .map(consumer => consumer.encoding.scale))];
}

function requireSingleScale(ids, operation, scope) {
  if (ids.length === 1) return ids[0];
  if (ids.length === 0) {
    throw new Error(`${operation} could not find a ${scope} scale.`);
  }
  throw new Error(`${operation} ${scope} scale is ambiguous; provide id or target.`);
}

function validateScaleChannel(program, id, channel, operation) {
  requireSemanticScale(program, id);
  const consumers = findScaleConsumers(program, id);
  if (consumers.length === 0) {
    throw new Error(`${operation} requires a scale bound to the ${channel} channel.`);
  }
  if (consumers.some(consumer =>
    normalizePositionScaleChannel(consumer.channel) !== channel
  )) {
    throw new Error(`Scale "${id}" is not bound exclusively to the ${channel} channel.`);
  }
  return id;
}

function resolveScaleId(program, args, channel, operation) {
  const explicitId = args.id === undefined
    ? undefined
    : validateUserId(args.id, "Scale id");
  const target = args.target === undefined
    ? undefined
    : validateUserId(args.target, "Mark id");
  const targetLayer = target === undefined ? undefined : findLayer(program, target);
  if (target !== undefined && targetLayer === undefined) {
    throw new Error(`Unknown mark target "${target}".`);
  }
  const targetId = targetLayer === undefined
    ? undefined
    : requireSingleScale(scaleIdsForLayer(program, targetLayer, channel), operation, `target ${channel}`);
  if (explicitId !== undefined && targetId !== undefined && explicitId !== targetId) {
    throw new Error(`${operation} id "${explicitId}" does not match target "${target}" scale "${targetId}".`);
  }
  if (explicitId !== undefined) {
    return validateScaleChannel(program, explicitId, channel, operation);
  }
  if (targetId !== undefined) return validateScaleChannel(program, targetId, channel, operation);

  const current = findLayer(program, program.context.currentMark);
  const currentIds = scaleIdsForLayer(program, current, channel);
  if (currentIds.length > 1) {
    throw new Error(`${operation} current-mark ${channel} scale is ambiguous; provide id or target.`);
  }
  if (currentIds.length === 1) {
    return validateScaleChannel(program, currentIds[0], channel, operation);
  }
  return validateScaleChannel(
    program,
    requireSingleScale(channelScaleIds(program, channel), operation, channel),
    channel,
    operation
  );
}

function createChannelScaleEditor(operation, definition) {
  return action(
    {
      op: operation,
      description: `Edit the scale bound to the ${definition.channel} channel.`
    },
    function (args = {}) {
      validateOptionObject(args, ["id", "target", ...definition.options], operation);
      if (!definition.options.some(property => Object.hasOwn(args, property))) {
        throw new Error(`${operation} requires at least one editable property.`);
      }
      const id = resolveScaleId(this, args, definition.channel, operation);
      const patch = Object.fromEntries(
        Object.entries(args).filter(([property]) => property !== "target")
      );
      return this.editScale({ ...patch, id });
    }
  );
}

export const channelScaleEditors = Object.freeze(Object.fromEntries(
  Object.entries(DEFINITIONS).map(([operation, definition]) => [
    operation,
    createChannelScaleEditor(operation, definition)
  ])
));

export function registerChannelScaleActions(ProgramClass) {
  for (const [operation, editor] of Object.entries(channelScaleEditors)) {
    ProgramClass.prototype[operation] = editor;
  }
}
